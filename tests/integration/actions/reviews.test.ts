import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createMemberSession,
  createUnauthenticatedSession,
} from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

import {
  saveReviewProgress,
  submitReview,
  declineReview,
  submitTokenReview,
} from "@/lib/actions/reviews";

describe("review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createMemberSession();
  });

  describe("saveReviewProgress", () => {
    it("returns unauthorized for unauthenticated user", async () => {
      mockSession = null;
      const result = await saveReviewProgress("ra-1", []);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error if assignment not found", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(null);

      const result = await saveReviewProgress("nonexistent", []);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review assignment not found");
    });

    it("prevents saving to completed review", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        status: "COMPLETED",
      });

      const result = await saveReviewProgress("ra-1", []);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review already submitted");
    });

    it("saves draft responses and updates status to IN_PROGRESS", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        status: "PENDING",
        startedAt: null,
      });
      mockPrisma.reviewAssignment.update.mockResolvedValue({});

      const responses = [
        { questionId: "q-1", ratingValue: 4 },
        { questionId: "q-2", textValue: "Great work" },
      ];

      const result = await saveReviewProgress("ra-1", responses);

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "ra-1" },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          draftResponses: responses,
        }),
      });
    });

    it("preserves existing startedAt date", async () => {
      const existingDate = new Date("2025-01-10");
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        status: "IN_PROGRESS",
        startedAt: existingDate,
      });
      mockPrisma.reviewAssignment.update.mockResolvedValue({});

      await saveReviewProgress("ra-1", []);

      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "ra-1" },
        data: expect.objectContaining({
          startedAt: existingDate,
        }),
      });
    });
  });

  describe("submitReview", () => {
    const mockAssignment = {
      id: "ra-1",
      cycleId: "cycle-1",
      reviewerId: "emp-member",
      revieweeId: "emp-2",
      reviewerType: "PEER",
      status: "IN_PROGRESS",
      cycle: {
        template: {
          sections: [
            {
              reviewerTypes: ["PEER"],
              questions: [
                { id: "q-1", isRequired: true, type: "RATING" },
                { id: "q-2", isRequired: true, type: "TEXT" },
                { id: "q-3", isRequired: false, type: "TEXT" },
              ],
            },
            {
              reviewerTypes: ["SELF"],
              questions: [
                { id: "q-4", isRequired: true, type: "TEXT" },
              ],
            },
          ],
        },
      },
    };

    it("returns unauthorized for unauthenticated user", async () => {
      mockSession = null;
      const result = await submitReview("ra-1", []);
      expect(result.success).toBe(false);
    });

    it("returns error if assignment not found", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(null);
      const result = await submitReview("ra-1", [{ questionId: "q-1", ratingValue: 5 }]);
      expect(result.success).toBe(false);
    });

    it("rejects if already completed", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        status: "COMPLETED",
      });

      const result = await submitReview("ra-1", []);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Review already submitted");
    });

    it("rejects if required questions missing", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(mockAssignment);

      // Only answer q-1, missing q-2 which is also required for PEER
      const result = await submitReview("ra-1", [
        { questionId: "q-1", ratingValue: 5 },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("required questions");
    });

    it("does not require questions from other reviewer types", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(mockAssignment);

      // q-4 is required for SELF only, not PEER — should not be required here
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = createMockPrisma();
        tx.reviewResponse.deleteMany.mockResolvedValue({});
        tx.reviewResponse.createMany.mockResolvedValue({});
        tx.reviewAssignment.update.mockResolvedValue({ ...mockAssignment, status: "COMPLETED" });
        return fn(tx);
      });

      const result = await submitReview("ra-1", [
        { questionId: "q-1", ratingValue: 5 },
        { questionId: "q-2", textValue: "Good" },
      ]);

      expect(result.success).toBe(true);
    });

    it("creates responses and marks assignment as completed", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(mockAssignment);

      const txMock = createMockPrisma();
      txMock.reviewResponse.deleteMany.mockResolvedValue({});
      txMock.reviewResponse.createMany.mockResolvedValue({});
      txMock.reviewAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: "COMPLETED",
      });

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

      const responses = [
        { questionId: "q-1", ratingValue: 5 },
        { questionId: "q-2", textValue: "Excellent work" },
      ];

      const result = await submitReview("ra-1", responses);

      expect(result.success).toBe(true);
      expect(txMock.reviewResponse.deleteMany).toHaveBeenCalledWith({
        where: { assignmentId: "ra-1" },
      });
      expect(txMock.reviewResponse.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ questionId: "q-1", ratingValue: 5 }),
          expect.objectContaining({ questionId: "q-2", textValue: "Excellent work" }),
        ]),
      });
      expect(txMock.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "ra-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      });
    });
  });

  describe("declineReview", () => {
    it("allows declining PEER reviews", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        reviewerType: "PEER",
        status: "PENDING",
      });
      mockPrisma.reviewAssignment.update.mockResolvedValue({});

      const result = await declineReview("ra-1", "Too busy");

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "ra-1" },
        data: {
          status: "DECLINED",
          declineReason: "Too busy",
        },
      });
    });

    it("allows declining EXTERNAL reviews", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        reviewerType: "EXTERNAL",
        status: "PENDING",
      });
      mockPrisma.reviewAssignment.update.mockResolvedValue({});

      const result = await declineReview("ra-1");
      expect(result.success).toBe(true);
    });

    it("prevents declining SELF reviews", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        reviewerType: "SELF",
        status: "PENDING",
      });

      const result = await declineReview("ra-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot be declined");
    });

    it("prevents declining MANAGER reviews", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        id: "ra-1",
        reviewerType: "MANAGER",
        status: "PENDING",
      });

      const result = await declineReview("ra-1");
      expect(result.success).toBe(false);
    });
  });

  describe("submitTokenReview", () => {
    it("returns error for invalid token", async () => {
      mockPrisma.reviewToken.findFirst.mockResolvedValue(null);

      const result = await submitTokenReview("bad-token", []);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
    });

    it("returns error if already completed", async () => {
      mockPrisma.reviewToken.findFirst.mockResolvedValue({
        id: "rt-1",
        assignment: { id: "ra-1", status: "COMPLETED" },
      });

      const result = await submitTokenReview("valid-token", []);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Review already submitted");
    });

    it("submits review and marks token as used", async () => {
      mockPrisma.reviewToken.findFirst.mockResolvedValue({
        id: "rt-1",
        assignment: {
          id: "ra-1",
          status: "PENDING",
          cycle: {
            template: {
              sections: [
                {
                  reviewerTypes: ["EXTERNAL"],
                  questions: [{ id: "q-1", isRequired: true }],
                },
              ],
            },
          },
        },
      });

      const txMock = createMockPrisma();
      txMock.reviewResponse.createMany.mockResolvedValue({});
      txMock.reviewAssignment.update.mockResolvedValue({});
      txMock.reviewToken.update.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

      const result = await submitTokenReview("valid-token", [
        { questionId: "q-1", ratingValue: 4 },
      ]);

      expect(result.success).toBe(true);
      expect(txMock.reviewResponse.createMany).toHaveBeenCalled();
      expect(txMock.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "ra-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      });
      expect(txMock.reviewToken.update).toHaveBeenCalledWith({
        where: { id: "rt-1" },
        data: { usedAt: expect.any(Date) },
      });
    });
  });
});
