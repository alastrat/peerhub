import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createManagerSession,
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

import {
  createNomination,
  createNominations,
  removeNomination,
  approveNomination,
  rejectNomination,
  bulkApproveNominations,
  transitionToInProgress,
  getNominationsForCycle,
  getNominationStats,
} from "@/lib/actions/nominations";

describe("nomination actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createMemberSession();
  });

  describe("createNomination", () => {
    it("returns unauthorized if not authenticated", async () => {
      mockSession = null;
      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error if no employee linked", async () => {
      mockSession = createMemberSession();
      mockSession!.companyUser!.employeeId = null;

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("No employee record linked");
    });

    it("returns error if cycle not in nomination phase", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "IN_PROGRESS",
      });

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle is not in nomination phase");
    });

    it("prevents self-nomination for own review", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-member",
        companyId: "company-1",
        isActive: true,
      });

      // nomineeId === revieweeId (which defaults to employeeId when not provided)
      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-member", // same as session employeeId
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot nominate yourself");
    });

    it("prevents exceeding max peers", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 3,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(3); // already at max

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum 3");
    });

    it("prevents duplicate nominations", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(1);
      mockPrisma.nomination.findFirst.mockResolvedValue({ id: "existing" });

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("already been nominated");
    });

    it("creates nomination with PENDING status when manager approval required", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(0);
      mockPrisma.nomination.findFirst.mockResolvedValue(null);
      mockPrisma.nomination.create.mockResolvedValue({
        id: "nom-1",
        status: "PENDING",
      });

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.nomination.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "PENDING",
          reviewerType: "PEER",
          nominatorId: "emp-member",
          nomineeId: "emp-2",
        }),
      });
      // No auto-created review assignment
      expect(mockPrisma.reviewAssignment.create).not.toHaveBeenCalled();
    });

    it("auto-approves and creates assignment when no manager approval needed", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: false,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(0);
      mockPrisma.nomination.findFirst.mockResolvedValue(null);
      mockPrisma.nomination.create.mockResolvedValue({
        id: "nom-1",
        status: "APPROVED",
      });
      mockPrisma.reviewAssignment.create.mockResolvedValue({});

      const result = await createNomination({
        cycleId: "cycle-1",
        nomineeId: "emp-2",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.nomination.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: "APPROVED" }),
      });
      expect(mockPrisma.reviewAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cycleId: "cycle-1",
          reviewerId: "emp-2",
          reviewerType: "PEER",
        }),
      });
    });
  });

  describe("approveNomination", () => {
    it("returns unauthorized for MEMBER", async () => {
      mockSession = createMemberSession();
      const result = await approveNomination("nom-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("admin can approve any nomination", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        reviewee: { managerId: "emp-someone-else" },
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.update.mockResolvedValue({
        id: "nom-1",
        status: "APPROVED",
      });
      mockPrisma.reviewAssignment.create.mockResolvedValue({});

      const result = await approveNomination("nom-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.create).toHaveBeenCalled();
    });

    it("manager can only approve for direct reports", async () => {
      mockSession = createManagerSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        status: "PENDING",
        reviewee: { managerId: "emp-other" }, // NOT the manager's employeeId
        cycle: { companyId: "company-1" },
      });

      const result = await approveNomination("nom-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("direct reports");
    });

    it("manager can approve for their own direct reports", async () => {
      mockSession = createManagerSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        reviewee: { managerId: "emp-manager" }, // matches manager's employeeId
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.update.mockResolvedValue({ id: "nom-1", status: "APPROVED" });
      mockPrisma.reviewAssignment.create.mockResolvedValue({});

      const result = await approveNomination("nom-1");
      expect(result.success).toBe(true);
    });

    it("rejects non-pending nominations", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        status: "APPROVED",
        reviewee: {},
        cycle: {},
      });

      const result = await approveNomination("nom-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Nomination is not pending");
    });
  });

  describe("rejectNomination", () => {
    it("rejects with optional reason", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        status: "PENDING",
        reviewee: {},
      });
      mockPrisma.nomination.update.mockResolvedValue({
        id: "nom-1",
        status: "REJECTED",
        rejectionReason: "Not appropriate",
      });

      const result = await rejectNomination("nom-1", "Not appropriate");

      expect(result.success).toBe(true);
      expect(mockPrisma.nomination.update).toHaveBeenCalledWith({
        where: { id: "nom-1" },
        data: {
          status: "REJECTED",
          rejectionReason: "Not appropriate",
        },
      });
    });
  });

  describe("transitionToInProgress", () => {
    it("requires admin role", async () => {
      mockSession = createMemberSession();
      const result = await transitionToInProgress("cycle-1");
      expect(result.success).toBe(false);
    });

    it("rejects if cycle not in NOMINATION status", async () => {
      mockSession = createAdminSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        status: "IN_PROGRESS",
      });

      const result = await transitionToInProgress("cycle-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle is not in nomination phase");
    });

    it("rejects if pending nominations remain", async () => {
      mockSession = createAdminSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        status: "NOMINATION",
      });
      mockPrisma.nomination.count.mockResolvedValue(3);

      const result = await transitionToInProgress("cycle-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("3 nominations still pending");
    });

    it("transitions to IN_PROGRESS when no pending nominations", async () => {
      mockSession = createAdminSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        status: "NOMINATION",
      });
      mockPrisma.nomination.count.mockResolvedValue(0);
      mockPrisma.cycle.update.mockResolvedValue({});

      const result = await transitionToInProgress("cycle-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.cycle.update).toHaveBeenCalledWith({
        where: { id: "cycle-1" },
        data: { status: "IN_PROGRESS" },
      });
    });

    it("returns error when cycle not found", async () => {
      mockSession = createAdminSession();
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await transitionToInProgress("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
    });

    it("handles database errors gracefully", async () => {
      mockSession = createAdminSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        status: "NOMINATION",
      });
      mockPrisma.nomination.count.mockResolvedValue(0);
      mockPrisma.cycle.update.mockRejectedValue(new Error("DB error"));

      const result = await transitionToInProgress("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to transition cycle");
    });
  });

  // =========================================================================
  // createNominations (bulk)
  // =========================================================================

  describe("createNominations", () => {
    it("returns unauthorized if not authenticated", async () => {
      mockSession = null;

      const result = await createNominations("cycle-1", ["emp-2", "emp-3"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("creates multiple nominations and counts results", async () => {
      mockSession = createMemberSession();

      // Set up mocks so each createNomination call succeeds
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(0);
      mockPrisma.nomination.findFirst.mockResolvedValue(null);
      mockPrisma.nomination.create.mockResolvedValue({
        id: "nom-1",
        status: "PENDING",
      });

      const result = await createNominations("cycle-1", ["emp-2", "emp-3"]);

      expect(result.success).toBe(true);
      expect(result.data!.created).toBe(2);
      expect(result.data!.skipped).toBe(0);
    });

    it("counts skipped nominations for duplicates", async () => {
      mockSession = createMemberSession();

      // First call succeeds, second call hits duplicate
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        status: "NOMINATION",
        maxPeers: 5,
        managerApprovePeers: true,
      });
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({ id: "cp-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-2",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.nomination.count.mockResolvedValue(0);

      // First call: no existing → succeeds
      // Second call: existing found → fails
      mockPrisma.nomination.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "existing" });

      mockPrisma.nomination.create.mockResolvedValue({
        id: "nom-1",
        status: "PENDING",
      });

      const result = await createNominations("cycle-1", ["emp-2", "emp-3"]);

      expect(result.success).toBe(true);
      expect(result.data!.created).toBe(1);
      expect(result.data!.skipped).toBe(1);
    });
  });

  // =========================================================================
  // removeNomination
  // =========================================================================

  describe("removeNomination", () => {
    it("returns unauthorized when not authenticated", async () => {
      mockSession = null;

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when nomination not found", async () => {
      mockSession = createMemberSession();
      mockPrisma.nomination.findFirst.mockResolvedValue(null);

      const result = await removeNomination("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nomination not found");
    });

    it("allows nominator to remove their own PENDING nomination", async () => {
      mockSession = createMemberSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nominatorId: "emp-member", // matches session employeeId
        nomineeId: "emp-2",
        revieweeId: "emp-member",
        status: "PENDING",
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.delete.mockResolvedValue({});

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.nomination.delete).toHaveBeenCalledWith({
        where: { id: "nom-1" },
      });
      // PENDING nominations should NOT trigger assignment deletion
      expect(mockPrisma.reviewAssignment.deleteMany).not.toHaveBeenCalled();
    });

    it("admin can remove any nomination", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nominatorId: "emp-other",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.delete.mockResolvedValue({});

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(true);
    });

    it("deletes review assignment when removing APPROVED nomination", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nominatorId: "emp-other",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "APPROVED",
        cycle: { companyId: "company-1" },
      });
      mockPrisma.reviewAssignment.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.nomination.delete.mockResolvedValue({});

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.reviewAssignment.deleteMany).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          reviewerId: "emp-2",
          revieweeId: "emp-3",
          reviewerType: "PEER",
        },
      });
    });

    it("rejects removal by non-admin non-nominator", async () => {
      mockSession = createMemberSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nominatorId: "emp-other", // NOT the session user
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        cycle: { companyId: "company-1" },
      });

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.nomination.delete).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nominatorId: "emp-other",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.delete.mockRejectedValue(new Error("DB error"));

      const result = await removeNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to remove nomination");
    });
  });

  // =========================================================================
  // rejectNomination (additional coverage)
  // =========================================================================

  describe("rejectNomination (extended)", () => {
    it("returns unauthorized for MEMBER", async () => {
      mockSession = createMemberSession();

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when nomination not found", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue(null);

      const result = await rejectNomination("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nomination not found");
    });

    it("returns error when nomination is not pending", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        status: "APPROVED",
        reviewee: {},
      });

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nomination is not pending");
    });

    it("manager can only reject for direct reports", async () => {
      mockSession = createManagerSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        status: "PENDING",
        reviewee: { managerId: "emp-other" }, // NOT the manager's employeeId
      });

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("direct reports");
    });

    it("manager can reject for their own direct reports", async () => {
      mockSession = createManagerSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        status: "PENDING",
        reviewee: { managerId: "emp-manager" }, // matches manager's employeeId
      });
      mockPrisma.nomination.update.mockResolvedValue({
        id: "nom-1",
        status: "REJECTED",
      });

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(true);
    });

    it("rejects without reason", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        status: "PENDING",
        reviewee: {},
      });
      mockPrisma.nomination.update.mockResolvedValue({
        id: "nom-1",
        status: "REJECTED",
        rejectionReason: undefined,
      });

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.nomination.update).toHaveBeenCalledWith({
        where: { id: "nom-1" },
        data: {
          status: "REJECTED",
          rejectionReason: undefined,
        },
      });
    });

    it("handles database errors gracefully", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        status: "PENDING",
        reviewee: {},
      });
      mockPrisma.nomination.update.mockRejectedValue(new Error("DB error"));

      const result = await rejectNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to reject nomination");
    });
  });

  // =========================================================================
  // approveNomination (additional coverage)
  // =========================================================================

  describe("approveNomination (extended)", () => {
    it("returns error when nomination not found", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue(null);

      const result = await approveNomination("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nomination not found");
    });

    it("returns unauthorized when not authenticated", async () => {
      mockSession = null;

      const result = await approveNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockSession = createAdminSession();
      mockPrisma.nomination.findFirst.mockResolvedValue({
        id: "nom-1",
        cycleId: "cycle-1",
        nomineeId: "emp-2",
        revieweeId: "emp-3",
        status: "PENDING",
        reviewee: { managerId: "emp-other" },
        cycle: { companyId: "company-1" },
      });
      mockPrisma.nomination.update.mockRejectedValue(new Error("DB error"));

      const result = await approveNomination("nom-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to approve nomination");
    });
  });

  // =========================================================================
  // bulkApproveNominations
  // =========================================================================

  describe("bulkApproveNominations", () => {
    it("returns unauthorized for MEMBER", async () => {
      mockSession = createMemberSession();

      const result = await bulkApproveNominations(["nom-1", "nom-2"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns unauthorized when not authenticated", async () => {
      mockSession = null;

      const result = await bulkApproveNominations(["nom-1"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("approves multiple nominations and counts results", async () => {
      mockSession = createAdminSession();

      // Each approveNomination call will look up the nomination
      mockPrisma.nomination.findFirst
        .mockResolvedValueOnce({
          id: "nom-1",
          cycleId: "cycle-1",
          nomineeId: "emp-2",
          revieweeId: "emp-3",
          status: "PENDING",
          reviewee: { managerId: "emp-other" },
          cycle: { companyId: "company-1" },
        })
        .mockResolvedValueOnce({
          id: "nom-2",
          cycleId: "cycle-1",
          nomineeId: "emp-4",
          revieweeId: "emp-5",
          status: "PENDING",
          reviewee: { managerId: "emp-other" },
          cycle: { companyId: "company-1" },
        });

      mockPrisma.nomination.update.mockResolvedValue({ status: "APPROVED" });
      mockPrisma.reviewAssignment.create.mockResolvedValue({});

      const result = await bulkApproveNominations(["nom-1", "nom-2"]);

      expect(result.success).toBe(true);
      expect(result.data!.approved).toBe(2);
      expect(result.data!.failed).toBe(0);
    });

    it("counts failures when some nominations fail", async () => {
      mockSession = createAdminSession();

      // First succeeds, second not found
      mockPrisma.nomination.findFirst
        .mockResolvedValueOnce({
          id: "nom-1",
          cycleId: "cycle-1",
          nomineeId: "emp-2",
          revieweeId: "emp-3",
          status: "PENDING",
          reviewee: { managerId: "emp-other" },
          cycle: { companyId: "company-1" },
        })
        .mockResolvedValueOnce(null); // not found

      mockPrisma.nomination.update.mockResolvedValue({ status: "APPROVED" });
      mockPrisma.reviewAssignment.create.mockResolvedValue({});

      const result = await bulkApproveNominations(["nom-1", "nom-2"]);

      expect(result.success).toBe(true);
      expect(result.data!.approved).toBe(1);
      expect(result.data!.failed).toBe(1);
    });
  });

  // =========================================================================
  // getNominationsForCycle
  // =========================================================================

  describe("getNominationsForCycle", () => {
    it("returns empty array when not authenticated", async () => {
      mockSession = null;

      const result = await getNominationsForCycle("cycle-1");

      expect(result).toEqual([]);
      expect(mockPrisma.nomination.findMany).not.toHaveBeenCalled();
    });

    it("returns nominations for cycle", async () => {
      mockSession = createMemberSession();
      const nominations = [
        { id: "nom-1", cycleId: "cycle-1", nomineeId: "emp-2" },
        { id: "nom-2", cycleId: "cycle-1", nomineeId: "emp-3" },
      ];
      mockPrisma.nomination.findMany.mockResolvedValue(nominations);

      const result = await getNominationsForCycle("cycle-1");

      expect(result).toEqual(nominations);
      expect(mockPrisma.nomination.findMany).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          cycle: { companyId: "company-1" },
        },
        include: {
          nominator: true,
          nominee: true,
          reviewee: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("filters by revieweeId when provided", async () => {
      mockSession = createMemberSession();
      mockPrisma.nomination.findMany.mockResolvedValue([]);

      await getNominationsForCycle("cycle-1", "emp-target");

      expect(mockPrisma.nomination.findMany).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          cycle: { companyId: "company-1" },
          revieweeId: "emp-target",
        },
        include: {
          nominator: true,
          nominee: true,
          reviewee: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // =========================================================================
  // getNominationStats
  // =========================================================================

  describe("getNominationStats", () => {
    it("returns null when not authenticated", async () => {
      mockSession = null;

      const result = await getNominationStats("cycle-1", "emp-1");

      expect(result).toBeNull();
    });

    it("returns null when cycle not found", async () => {
      mockSession = createMemberSession();
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await getNominationStats("cycle-1", "emp-1");

      expect(result).toBeNull();
    });

    it("returns correct stats", async () => {
      mockSession = createMemberSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        minPeers: 3,
        maxPeers: 5,
      });
      mockPrisma.nomination.findMany.mockResolvedValue([
        { id: "nom-1", status: "APPROVED" },
        { id: "nom-2", status: "APPROVED" },
        { id: "nom-3", status: "PENDING" },
        { id: "nom-4", status: "REJECTED" },
      ]);

      const result = await getNominationStats("cycle-1", "emp-1");

      expect(result).toEqual({
        total: 4,
        approved: 2,
        pending: 1,
        rejected: 1,
        minRequired: 3,
        maxAllowed: 5,
        needsMore: true,       // approved (2) < minPeers (3)
        canAddMore: true,       // total - rejected (3) < maxPeers (5)
      });
    });

    it("returns needsMore=false when minimum met", async () => {
      mockSession = createMemberSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        minPeers: 2,
        maxPeers: 5,
      });
      mockPrisma.nomination.findMany.mockResolvedValue([
        { id: "nom-1", status: "APPROVED" },
        { id: "nom-2", status: "APPROVED" },
        { id: "nom-3", status: "APPROVED" },
      ]);

      const result = await getNominationStats("cycle-1", "emp-1");

      expect(result!.needsMore).toBe(false);
      expect(result!.approved).toBe(3);
    });

    it("returns canAddMore=false when at max capacity", async () => {
      mockSession = createMemberSession();
      mockPrisma.cycle.findFirst.mockResolvedValue({
        id: "cycle-1",
        companyId: "company-1",
        minPeers: 2,
        maxPeers: 3,
      });
      mockPrisma.nomination.findMany.mockResolvedValue([
        { id: "nom-1", status: "APPROVED" },
        { id: "nom-2", status: "APPROVED" },
        { id: "nom-3", status: "PENDING" },
      ]);

      const result = await getNominationStats("cycle-1", "emp-1");

      expect(result!.canAddMore).toBe(false);  // total - rejected (3) >= maxPeers (3)
    });
  });
});
