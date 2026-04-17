import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createMemberSession,
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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/email/templates", () => ({
  sendReviewRequestEmail: vi.fn(),
  sendNominationRequestEmail: vi.fn(),
  sendExternalReviewRequestEmail: vi.fn(),
}));

vi.mock("@/lib/utils/dates", () => ({
  formatDate: vi.fn((d: Date) => d.toISOString()),
}));

vi.mock("@/lib/utils/notify-employee", () => ({
  notifyEmployee: vi.fn(),
}));

vi.mock("@/lib/utils/tokens", () => ({
  generateReviewToken: vi.fn(() => "test-token"),
}));

// Import AFTER mocks
import {
  updateCycle,
  addParticipants,
  launchCycle,
  closeCycle,
  addExternalRater,
} from "@/lib/actions/cycles";

import { notifyEmployee } from "@/lib/utils/notify-employee";
import { sendExternalReviewRequestEmail } from "@/lib/email/templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseCycle = {
  id: "cycle-1",
  name: "Q1 Feedback",
  companyId: "company-1",
  templateId: "t1",
  status: "DRAFT" as const,
  reviewStartDate: new Date("2026-04-01"),
  reviewEndDate: new Date("2026-04-30"),
  selfReviewEnabled: true,
  managerReviewEnabled: true,
  peerReviewEnabled: true,
  directReportEnabled: false,
  externalEnabled: false,
  minPeers: 3,
  maxPeers: 8,
  nominationEndDate: null,
  nominationStartDate: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cycle lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // updateCycle
  // =========================================================================

  describe("updateCycle", () => {
    it("updates a draft cycle successfully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({ ...baseCycle, status: "DRAFT" });
      const updatedCycle = { ...baseCycle, name: "Updated Cycle" };
      mockPrisma.cycle.update.mockResolvedValue(updatedCycle);

      const result = await updateCycle("cycle-1", { name: "Updated Cycle" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCycle);
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith({
        where: { id: "cycle-1" },
        data: expect.objectContaining({ name: "Updated Cycle" }),
      });
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await updateCycle("nonexistent", { name: "Nope" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
      expect(mockPrisma.cycle.update).not.toHaveBeenCalled();
    });

    it("returns error when cycle is not in DRAFT status", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });

      const result = await updateCycle("cycle-1", { name: "Blocked" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Can only edit draft cycles");
      expect(mockPrisma.cycle.update).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateCycle("cycle-1", { name: "Blocked" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.cycle.findFirst).not.toHaveBeenCalled();
    });

    it("returns error when unauthenticated", async () => {
      mockSession = null;

      const result = await updateCycle("cycle-1", { name: "Blocked" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({ ...baseCycle, status: "DRAFT" });
      mockPrisma.cycle.update.mockRejectedValue(new Error("DB error"));

      const result = await updateCycle("cycle-1", { name: "Fail" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update cycle");
    });
  });

  // =========================================================================
  // addParticipants
  // =========================================================================

  describe("addParticipants", () => {
    it("adds new participants successfully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(baseCycle);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.createMany.mockResolvedValue({ count: 2 });

      const result = await addParticipants("cycle-1", ["emp-1", "emp-2"]);

      expect(result.success).toBe(true);
      expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
        data: [
          { cycleId: "cycle-1", employeeId: "emp-1" },
          { cycleId: "cycle-1", employeeId: "emp-2" },
        ],
      });
    });

    it("filters out already existing participants", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(baseCycle);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([
        { employeeId: "emp-1" },
      ]);
      mockPrisma.cycleParticipant.createMany.mockResolvedValue({ count: 1 });

      const result = await addParticipants("cycle-1", ["emp-1", "emp-2"]);

      expect(result.success).toBe(true);
      expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
        data: [{ cycleId: "cycle-1", employeeId: "emp-2" }],
      });
    });

    it("skips createMany when all participants already exist", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(baseCycle);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([
        { employeeId: "emp-1" },
        { employeeId: "emp-2" },
      ]);

      const result = await addParticipants("cycle-1", ["emp-1", "emp-2"]);

      expect(result.success).toBe(true);
      expect(mockPrisma.cycleParticipant.createMany).not.toHaveBeenCalled();
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await addParticipants("nonexistent", ["emp-1"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
      expect(mockPrisma.cycleParticipant.findMany).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await addParticipants("cycle-1", ["emp-1"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(baseCycle);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.createMany.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await addParticipants("cycle-1", ["emp-1"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to add participants");
    });
  });

  // =========================================================================
  // launchCycle
  // =========================================================================

  describe("launchCycle", () => {
    const launchableCycle = {
      ...baseCycle,
      status: "DRAFT",
      peerReviewEnabled: true,
      selfReviewEnabled: true,
      managerReviewEnabled: true,
      directReportEnabled: false,
      template: { id: "t1", name: "Template" },
      participants: [
        {
          employeeId: "emp-1",
          employee: {
            id: "emp-1",
            name: "Alice",
            email: "alice@acme.com",
            managerId: "emp-mgr",
            manager: { id: "emp-mgr", name: "Manager" },
            directReports: [],
          },
        },
        {
          employeeId: "emp-2",
          employee: {
            id: "emp-2",
            name: "Bob",
            email: "bob@acme.com",
            managerId: null,
            manager: null,
            directReports: [],
          },
        },
      ],
    };

    it("launches cycle and creates assignments (NOMINATION when peer enabled)", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(launchableCycle);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 3 });
      const updatedCycle = { ...baseCycle, status: "NOMINATION" };
      mockPrisma.cycle.update.mockResolvedValue(updatedCycle);

      const result = await launchCycle("cycle-1", false);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCycle);

      // Verify assignments were created
      expect(mockPrisma.reviewAssignment.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          // Self reviews
          expect.objectContaining({
            cycleId: "cycle-1",
            reviewerId: "emp-1",
            revieweeId: "emp-1",
            reviewerType: "SELF",
          }),
          expect.objectContaining({
            cycleId: "cycle-1",
            reviewerId: "emp-2",
            revieweeId: "emp-2",
            reviewerType: "SELF",
          }),
          // Manager review for Alice (who has a managerId)
          expect.objectContaining({
            cycleId: "cycle-1",
            reviewerId: "emp-mgr",
            revieweeId: "emp-1",
            reviewerType: "MANAGER",
          }),
        ]),
        skipDuplicates: true,
      });

      // Status should be NOMINATION because peerReviewEnabled is true
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith({
        where: { id: "cycle-1" },
        data: { status: "NOMINATION" },
      });
    });

    it("transitions directly to IN_PROGRESS when peer review disabled", async () => {
      const noPeerCycle = {
        ...launchableCycle,
        peerReviewEnabled: false,
      };
      mockPrisma.cycle.findFirst.mockResolvedValue(noPeerCycle);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });

      const result = await launchCycle("cycle-1", false);

      expect(result.success).toBe(true);
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith({
        where: { id: "cycle-1" },
        data: { status: "IN_PROGRESS" },
      });
    });

    it("creates direct report assignments when enabled", async () => {
      const directReportCycle = {
        ...launchableCycle,
        directReportEnabled: true,
        peerReviewEnabled: false,
        participants: [
          {
            employeeId: "emp-1",
            employee: {
              id: "emp-1",
              name: "Alice",
              email: "alice@acme.com",
              managerId: null,
              manager: null,
              directReports: [
                { id: "emp-2", name: "Bob" },
                { id: "emp-3", name: "Carol" },
              ],
            },
          },
        ],
      };
      mockPrisma.cycle.findFirst.mockResolvedValue(directReportCycle);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });

      const result = await launchCycle("cycle-1", false);

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            reviewerId: "emp-2",
            revieweeId: "emp-1",
            reviewerType: "DIRECT_REPORT",
          }),
          expect.objectContaining({
            reviewerId: "emp-3",
            revieweeId: "emp-1",
            reviewerType: "DIRECT_REPORT",
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await launchCycle("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
      expect(mockPrisma.reviewAssignment.createMany).not.toHaveBeenCalled();
    });

    it("returns error when cycle is already launched", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...launchableCycle,
        status: "IN_PROGRESS",
      });

      const result = await launchCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle already launched");
    });

    it("returns error when there are no participants", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...launchableCycle,
        participants: [],
      });

      const result = await launchCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Add participants before launching");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await launchCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(launchableCycle);
      mockPrisma.reviewAssignment.createMany.mockRejectedValue(
        new Error("DB error")
      );

      const result = await launchCycle("cycle-1", false);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to launch cycle");
    });
  });

  // =========================================================================
  // closeCycle
  // =========================================================================

  describe("closeCycle", () => {
    it("closes cycle successfully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });
      const closedCycle = { ...baseCycle, status: "CLOSED" };
      mockPrisma.cycle.update.mockResolvedValue(closedCycle);

      const result = await closeCycle("cycle-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(closedCycle);
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith({
        where: { id: "cycle-1" },
        data: { status: "CLOSED" },
      });
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await closeCycle("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
      expect(mockPrisma.cycle.update).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await closeCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when unauthenticated", async () => {
      mockSession = null;

      const result = await closeCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });
      mockPrisma.cycle.update.mockRejectedValue(new Error("DB error"));

      const result = await closeCycle("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to close cycle");
    });
  });

  // =========================================================================
  // addExternalRater
  // =========================================================================

  describe("addExternalRater", () => {
    const activeCycleWithExternal = {
      ...baseCycle,
      status: "IN_PROGRESS",
      externalEnabled: true,
      company: { name: "Acme Corp" },
      participants: [
        {
          employeeId: "emp-target",
          employee: {
            id: "emp-target",
            name: "Target Employee",
            email: "target@acme.com",
          },
        },
      ],
    };

    const externalInput = {
      email: "external@partner.com",
      name: "External Reviewer",
      revieweeId: "emp-target",
    };

    it("adds external rater successfully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(activeCycleWithExternal);
      mockPrisma.reviewToken.findFirst.mockResolvedValue(null);

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.reviewToken.create.mockResolvedValue({
            id: "rt-1",
            token: "test-token",
            email: "external@partner.com",
            name: "External Reviewer",
          });
          capturedTxClient.reviewAssignment.create.mockResolvedValue({
            id: "ra-1",
          });
          return fn(capturedTxClient);
        }
      );

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        tokenUrl: expect.stringContaining("test-token"),
      });

      // Verify token was created in transaction
      expect(capturedTxClient!.reviewToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: "test-token",
          email: "external@partner.com",
          name: "External Reviewer",
          companyId: "company-1",
        }),
      });

      // Verify review assignment was created
      expect(capturedTxClient!.reviewAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cycleId: "cycle-1",
          revieweeId: "emp-target",
          reviewerType: "EXTERNAL",
          externalEmail: "external@partner.com",
          externalName: "External Reviewer",
        }),
      });
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await addExternalRater("nonexistent", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
    });

    it("returns error when external raters not enabled", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...activeCycleWithExternal,
        externalEnabled: false,
      });

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("External raters not enabled for this cycle");
    });

    it("returns error when cycle is not active (DRAFT)", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...activeCycleWithExternal,
        status: "DRAFT",
      });

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle is not active");
    });

    it("returns error when cycle is not active (CLOSED)", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...activeCycleWithExternal,
        status: "CLOSED",
      });

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle is not active");
    });

    it("allows adding external rater in NOMINATION status", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...activeCycleWithExternal,
        status: "NOMINATION",
      });
      mockPrisma.reviewToken.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.reviewToken.create.mockResolvedValue({
            id: "rt-1",
            token: "test-token",
          });
          txClient.reviewAssignment.create.mockResolvedValue({ id: "ra-1" });
          return fn(txClient);
        }
      );

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(true);
    });

    it("returns error when reviewee is not a participant", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...activeCycleWithExternal,
        participants: [], // empty — reviewee not found
      });

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reviewee is not a participant in this cycle");
    });

    it("returns error when duplicate token already exists", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(activeCycleWithExternal);
      mockPrisma.reviewToken.findFirst.mockResolvedValue({
        id: "existing-token",
        email: "external@partner.com",
      });

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "This email has already been invited to review this employee"
      );
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(activeCycleWithExternal);
      mockPrisma.reviewToken.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(new Error("TX failed"));

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to add external rater");
    });

    it("returns warning when email delivery fails but still succeeds", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(activeCycleWithExternal);
      mockPrisma.reviewToken.findFirst.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.reviewToken.create.mockResolvedValue({
            id: "rt-1",
            token: "test-token",
            email: "external@partner.com",
            name: "External Reviewer",
          });
          txClient.reviewAssignment.create.mockResolvedValue({ id: "ra-1" });
          return fn(txClient);
        }
      );

      // Make email sending fail
      vi.mocked(sendExternalReviewRequestEmail).mockRejectedValue(
        new Error("SMTP down")
      );

      const result = await addExternalRater("cycle-1", externalInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        tokenUrl: expect.stringContaining("test-token"),
      });
      expect(result.warning).toContain("could not be delivered");
      expect(result.warning).toContain("external@partner.com");
    });
  });

  // =========================================================================
  // launchCycle — email sending paths
  // =========================================================================

  describe("launchCycle email notifications", () => {
    const launchableCycleForEmails = {
      ...baseCycle,
      status: "DRAFT",
      peerReviewEnabled: true,
      selfReviewEnabled: true,
      managerReviewEnabled: false,
      directReportEnabled: false,
      template: { id: "t1", name: "Template" },
      participants: [
        {
          employeeId: "emp-1",
          employee: {
            id: "emp-1",
            name: "Alice",
            email: "alice@acme.com",
            managerId: null,
            manager: null,
            directReports: [],
          },
        },
      ],
    };

    it("sends nomination emails when launching to NOMINATION status", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(launchableCycleForEmails);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "NOMINATION",
      });

      const result = await launchCycle("cycle-1", true);

      expect(result.success).toBe(true);
      expect(vi.mocked(notifyEmployee)).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "emp-1",
          subject: expect.stringContaining("Nominate"),
        })
      );
    });

    it("returns warning when some nomination emails fail", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...launchableCycleForEmails,
        participants: [
          ...launchableCycleForEmails.participants,
          {
            employeeId: "emp-2",
            employee: {
              id: "emp-2",
              name: "Bob",
              email: "bob@acme.com",
              managerId: null,
              manager: null,
              directReports: [],
            },
          },
        ],
      });
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "NOMINATION",
      });

      // First call succeeds, second fails
      vi.mocked(notifyEmployee)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("SMTP down"));

      const result = await launchCycle("cycle-1", true);

      expect(result.success).toBe(true);
      expect(result.warning).toContain("1 of 2");
      expect(result.warning).toContain("failed to send");
    });

    it("sends review request emails when launching to IN_PROGRESS", async () => {
      const noPeerCycle = {
        ...launchableCycleForEmails,
        peerReviewEnabled: false,
        selfReviewEnabled: true,
        participants: [
          {
            employeeId: "emp-1",
            employee: {
              id: "emp-1",
              name: "Alice",
              email: "alice@acme.com",
              managerId: null,
              manager: null,
              directReports: [],
            },
          },
        ],
      };
      mockPrisma.cycle.findFirst.mockResolvedValue(noPeerCycle);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });

      const result = await launchCycle("cycle-1", true);

      expect(result.success).toBe(true);
      // notifyEmployee should have been called for the self-review assignment
      expect(vi.mocked(notifyEmployee)).toHaveBeenCalled();
    });

    it("returns warning when some review request emails fail", async () => {
      const noPeerCycle = {
        ...launchableCycleForEmails,
        peerReviewEnabled: false,
        selfReviewEnabled: true,
        participants: [
          {
            employeeId: "emp-1",
            employee: {
              id: "emp-1",
              name: "Alice",
              email: "alice@acme.com",
              managerId: null,
              manager: null,
              directReports: [],
            },
          },
        ],
      };
      mockPrisma.cycle.findFirst.mockResolvedValue(noPeerCycle);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "IN_PROGRESS",
      });

      vi.mocked(notifyEmployee).mockRejectedValue(new Error("SMTP down"));

      const result = await launchCycle("cycle-1", true);

      expect(result.success).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("failed to send");
    });

    it("does not send emails when sendEmails is false", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(launchableCycleForEmails);
      mockPrisma.reviewAssignment.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.cycle.update.mockResolvedValue({
        ...baseCycle,
        status: "NOMINATION",
      });

      const result = await launchCycle("cycle-1", false);

      expect(result.success).toBe(true);
      expect(vi.mocked(notifyEmployee)).not.toHaveBeenCalled();
      expect(result.warning).toBeUndefined();
    });
  });
});
