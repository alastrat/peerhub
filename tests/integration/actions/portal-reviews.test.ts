import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;
let mockPortalSession: { employeeId: string; companyId: string; email: string } | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/portal-session", () => ({
  getPortalSession: vi.fn(() => Promise.resolve(mockPortalSession)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import AFTER mocks
import {
  savePortalReviewProgress,
  submitPortalReview,
} from "@/lib/actions/portal-reviews";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPortalSession(overrides?: Partial<{
  employeeId: string;
  companyId: string;
  email: string;
}>) {
  return {
    employeeId: overrides?.employeeId ?? "emp-1",
    companyId: overrides?.companyId ?? "company-1",
    email: overrides?.email ?? "reviewer@acme.com",
  };
}

const sampleResponses = [
  { questionId: "q-1", ratingValue: 4, textValue: null, selectedOptions: [] },
  { questionId: "q-2", ratingValue: null, textValue: "Great leadership", selectedOptions: [] },
];

const sampleAssignment = {
  id: "assignment-1",
  cycleId: "cycle-1",
  reviewerId: "emp-1",
  revieweeId: "emp-2",
  reviewerType: "PEER",
  status: "PENDING",
  startedAt: null,
  lastSavedAt: null,
  draftResponses: null,
  completedAt: null,
};

const sampleAssignmentInProgress = {
  ...sampleAssignment,
  status: "IN_PROGRESS",
  startedAt: new Date("2026-01-01"),
};

const sampleAssignmentCompleted = {
  ...sampleAssignment,
  status: "COMPLETED",
  startedAt: new Date("2026-01-01"),
  completedAt: new Date("2026-01-02"),
};

const sampleAssignmentWithCycle = {
  ...sampleAssignment,
  cycle: {
    id: "cycle-1",
    name: "Q1 Review",
    companyId: "company-1",
    template: {
      sections: [
        {
          id: "section-1",
          reviewerTypes: ["PEER", "MANAGER"],
          questions: [
            { id: "q-1", text: "Rate communication", type: "RATING", isRequired: true, order: 1 },
            { id: "q-2", text: "Comments", type: "TEXT", isRequired: false, order: 2 },
          ],
        },
        {
          id: "section-2",
          reviewerTypes: ["SELF"],
          questions: [
            { id: "q-3", text: "Self assessment", type: "RATING", isRequired: true, order: 1 },
          ],
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("portal review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockPortalSession = createPortalSession();
  });

  // =========================================================================
  // savePortalReviewProgress
  // =========================================================================

  describe("savePortalReviewProgress", () => {
    it("saves draft progress for a pending assignment", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignment);
      mockPrisma.reviewAssignment.update.mockResolvedValue({
        ...sampleAssignment,
        status: "IN_PROGRESS",
        startedAt: expect.any(Date),
        lastSavedAt: expect.any(Date),
        draftResponses: sampleResponses,
      });

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          id: "assignment-1",
          reviewerId: "emp-1",
        },
      });
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          draftResponses: sampleResponses,
        }),
      });
    });

    it("saves draft progress for an in-progress assignment preserving startedAt", async () => {
      const existingStartedAt = new Date("2026-01-01");
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        ...sampleAssignmentInProgress,
        startedAt: existingStartedAt,
      });
      mockPrisma.reviewAssignment.update.mockResolvedValue({
        ...sampleAssignmentInProgress,
        lastSavedAt: new Date(),
        draftResponses: sampleResponses,
      });

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(true);
      // startedAt should use the existing value (the || operator in code)
      expect(mockPrisma.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          startedAt: existingStartedAt,
        }),
      });
    });

    it("returns error when not authenticated", async () => {
      mockPortalSession = null;

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.reviewAssignment.findFirst).not.toHaveBeenCalled();
    });

    it("returns error when assignment not found", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(null);

      const result = await savePortalReviewProgress("nonexistent", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review assignment not found");
      expect(mockPrisma.reviewAssignment.update).not.toHaveBeenCalled();
    });

    it("returns error when assignment is already completed", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentCompleted);

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review already submitted");
      expect(mockPrisma.reviewAssignment.update).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.reviewAssignment.findFirst.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to save progress");
    });

    it("handles update errors gracefully", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignment);
      mockPrisma.reviewAssignment.update.mockRejectedValue(
        new Error("Update failed")
      );

      const result = await savePortalReviewProgress("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to save progress");
    });
  });

  // =========================================================================
  // submitPortalReview
  // =========================================================================

  describe("submitPortalReview", () => {
    it("submits review successfully with all required questions answered", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentWithCycle);

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.reviewResponse.deleteMany.mockResolvedValue({ count: 0 });
          capturedTxClient.reviewResponse.createMany.mockResolvedValue({ count: 2 });
          capturedTxClient.reviewAssignment.update.mockResolvedValue({
            ...sampleAssignment,
            status: "COMPLETED",
            completedAt: new Date(),
          });
          return fn(capturedTxClient);
        }
      );

      // q-1 is required for PEER reviewer, q-2 is not required
      const responses = [
        { questionId: "q-1", ratingValue: 4, textValue: null, selectedOptions: [] },
        { questionId: "q-2", ratingValue: null, textValue: "Good work", selectedOptions: [] },
      ];

      const result = await submitPortalReview("assignment-1", responses);

      expect(result.success).toBe(true);

      // Verify the assignment was fetched with cycle and template included
      expect(mockPrisma.reviewAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          id: "assignment-1",
          reviewerId: "emp-1",
        },
        include: {
          cycle: {
            include: {
              template: {
                include: {
                  sections: {
                    include: {
                      questions: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Verify transaction: deleteMany old responses, createMany new, update assignment
      expect(capturedTxClient!.reviewResponse.deleteMany).toHaveBeenCalledWith({
        where: { assignmentId: "assignment-1" },
      });
      expect(capturedTxClient!.reviewResponse.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            assignmentId: "assignment-1",
            questionId: "q-1",
            ratingValue: 4,
          }),
          expect.objectContaining({
            assignmentId: "assignment-1",
            questionId: "q-2",
            textValue: "Good work",
          }),
        ]),
      });
      expect(capturedTxClient!.reviewAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          completedAt: expect.any(Date),
        }),
      });
    });

    it("returns error when not authenticated", async () => {
      mockPortalSession = null;

      const result = await submitPortalReview("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.reviewAssignment.findFirst).not.toHaveBeenCalled();
    });

    it("returns error when assignment not found", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(null);

      const result = await submitPortalReview("nonexistent", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review assignment not found");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when assignment is already completed", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue({
        ...sampleAssignmentWithCycle,
        status: "COMPLETED",
        completedAt: new Date("2026-01-02"),
      });

      const result = await submitPortalReview("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review already submitted");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when required questions are not answered", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentWithCycle);

      // q-1 is required for PEER but not included in responses
      const incompleteResponses = [
        { questionId: "q-2", ratingValue: null, textValue: "Some comment", selectedOptions: [] },
      ];

      const result = await submitPortalReview("assignment-1", incompleteResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Please answer all required questions");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("does not require questions from sections not matching reviewer type", async () => {
      // section-2 has reviewerTypes: ["SELF"] and q-3 is required,
      // but since the assignment reviewer type is PEER, q-3 should not be required
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentWithCycle);

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.reviewResponse.deleteMany.mockResolvedValue({ count: 0 });
          capturedTxClient.reviewResponse.createMany.mockResolvedValue({ count: 1 });
          capturedTxClient.reviewAssignment.update.mockResolvedValue({
            ...sampleAssignment,
            status: "COMPLETED",
          });
          return fn(capturedTxClient);
        }
      );

      // Only answer q-1 (required for PEER), skip q-3 (required for SELF only)
      const responses = [
        { questionId: "q-1", ratingValue: 5, textValue: null, selectedOptions: [] },
      ];

      const result = await submitPortalReview("assignment-1", responses);

      expect(result.success).toBe(true);
    });

    it("handles transaction errors gracefully", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentWithCycle);
      mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

      const responses = [
        { questionId: "q-1", ratingValue: 4, textValue: null, selectedOptions: [] },
      ];

      const result = await submitPortalReview("assignment-1", responses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to submit review");
    });

    it("handles database errors on findFirst gracefully", async () => {
      mockPrisma.reviewAssignment.findFirst.mockRejectedValue(
        new Error("DB error")
      );

      const result = await submitPortalReview("assignment-1", sampleResponses);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to submit review");
    });

    it("maps selectedOptions to empty array when not provided", async () => {
      mockPrisma.reviewAssignment.findFirst.mockResolvedValue(sampleAssignmentWithCycle);

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.reviewResponse.deleteMany.mockResolvedValue({ count: 0 });
          capturedTxClient.reviewResponse.createMany.mockResolvedValue({ count: 1 });
          capturedTxClient.reviewAssignment.update.mockResolvedValue({
            ...sampleAssignment,
            status: "COMPLETED",
          });
          return fn(capturedTxClient);
        }
      );

      // Response without selectedOptions
      const responses = [
        { questionId: "q-1", ratingValue: 4 },
      ];

      const result = await submitPortalReview("assignment-1", responses);

      expect(result.success).toBe(true);
      expect(capturedTxClient!.reviewResponse.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            questionId: "q-1",
            ratingValue: 4,
            selectedOptions: [],
          }),
        ]),
      });
    });
  });
});
