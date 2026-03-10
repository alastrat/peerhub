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
  removeNomination,
  approveNomination,
  rejectNomination,
  transitionToInProgress,
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
  });
});
