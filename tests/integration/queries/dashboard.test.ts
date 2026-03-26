import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrisma,
  type MockPrismaClient,
} from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

// Import AFTER mocks
import {
  getDashboardStats,
  getCycleParticipation,
  getCompletionBreakdown,
  getEmployeeDashboardStats,
} from "@/lib/queries/dashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPANY_ID = "company-1";

function buildCycle(overrides: Record<string, unknown> = {}) {
  return {
    id: "cycle-1",
    name: "Q1 Review",
    status: "IN_PROGRESS",
    companyId: COMPANY_ID,
    reviewEndDate: new Date("2026-06-01"),
    reviewStartDate: new Date("2026-03-01"),
    createdAt: new Date("2026-01-01"),
    template: { name: "360 Template" },
    _count: { participants: 5, assignments: 10 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getDashboardStats
// ---------------------------------------------------------------------------

describe("getDashboardStats", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return correct counts from parallel queries", async () => {
    mockPrisma.employee.count.mockResolvedValue(42);
    mockPrisma.cycle.count.mockResolvedValue(3);
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(10) // pending
      .mockResolvedValueOnce(20); // completed
    mockPrisma.cycle.findMany.mockResolvedValue([
      buildCycle({ id: "c1", name: "Cycle 1" }),
    ]);

    const result = await getDashboardStats({ companyId: COMPANY_ID });

    expect(result.employeeCount).toBe(42);
    expect(result.activeCycleCount).toBe(3);
    expect(result.pendingReviewCount).toBe(10);
    expect(result.completedReviewCount).toBe(20);
  });

  it("should calculate completion rate correctly", async () => {
    mockPrisma.employee.count.mockResolvedValue(10);
    mockPrisma.cycle.count.mockResolvedValue(1);
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(25) // pending
      .mockResolvedValueOnce(75); // completed
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    const result = await getDashboardStats({ companyId: COMPANY_ID });

    // 75 / (25+75) * 100 = 75
    expect(result.completionRate).toBe(75);
  });

  it("should return 0 completion rate when no reviews", async () => {
    mockPrisma.employee.count.mockResolvedValue(5);
    mockPrisma.cycle.count.mockResolvedValue(0);
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    const result = await getDashboardStats({ companyId: COMPANY_ID });

    expect(result.completionRate).toBe(0);
  });

  it("should map recent cycles correctly", async () => {
    mockPrisma.employee.count.mockResolvedValue(1);
    mockPrisma.cycle.count.mockResolvedValue(1);
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const cycle = buildCycle({
      id: "cycle-abc",
      name: "Annual Review",
      status: "CLOSED",
    });
    mockPrisma.cycle.findMany.mockResolvedValue([cycle]);

    const result = await getDashboardStats({ companyId: COMPANY_ID });

    expect(result.recentCycles).toHaveLength(1);
    expect(result.recentCycles[0]).toEqual({
      id: "cycle-abc",
      name: "Annual Review",
      status: "CLOSED",
      templateName: "360 Template",
      participantCount: 5,
      assignmentCount: 10,
      reviewEndDate: cycle.reviewEndDate,
    });
  });

  it("should query employees with correct filters", async () => {
    mockPrisma.employee.count.mockResolvedValue(0);
    mockPrisma.cycle.count.mockResolvedValue(0);
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    await getDashboardStats({ companyId: COMPANY_ID });

    expect(mockPrisma.employee.count).toHaveBeenCalledWith({
      where: { companyId: COMPANY_ID, isActive: true },
    });
  });
});

// ---------------------------------------------------------------------------
// getCycleParticipation
// ---------------------------------------------------------------------------

describe("getCycleParticipation", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return empty array when no cycles", async () => {
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    const result = await getCycleParticipation({ companyId: COMPANY_ID });

    expect(result).toEqual([]);
  });

  it("should compute participation data for a cycle", async () => {
    const cycles = [
      {
        id: "c1",
        name: "Q1 Review",
        reviewStartDate: new Date("2026-01-15"),
        assignments: [
          { reviewerType: "SELF", status: "COMPLETED" },
          { reviewerType: "PEER", status: "COMPLETED" },
          { reviewerType: "PEER", status: "PENDING" },
          { reviewerType: "MANAGER", status: "IN_PROGRESS" },
        ],
      },
    ];
    mockPrisma.cycle.findMany.mockResolvedValue(cycles);

    const result = await getCycleParticipation({ companyId: COMPANY_ID });

    expect(result).toHaveLength(1);
    const data = result[0];
    expect(data.cycleId).toBe("c1");
    expect(data.cycleName).toBe("Q1 Review");
    expect(data.totalAssignments).toBe(4);
    expect(data.completedAssignments).toBe(2);
    // 2/4 * 100 = 50
    expect(data.completionRate).toBe(50);
    expect(data.byReviewerType.SELF).toEqual({ total: 1, completed: 1 });
    expect(data.byReviewerType.PEER).toEqual({ total: 2, completed: 1 });
    expect(data.byReviewerType.MANAGER).toEqual({ total: 1, completed: 0 });
    expect(data.byReviewerType.DIRECT_REPORT).toEqual({
      total: 0,
      completed: 0,
    });
    expect(data.byReviewerType.EXTERNAL).toEqual({ total: 0, completed: 0 });
  });

  it("should return 0 completion rate when cycle has no assignments", async () => {
    const cycles = [
      {
        id: "c1",
        name: "Empty Cycle",
        reviewStartDate: new Date("2026-01-15"),
        assignments: [],
      },
    ];
    mockPrisma.cycle.findMany.mockResolvedValue(cycles);

    const result = await getCycleParticipation({ companyId: COMPANY_ID });

    expect(result[0].completionRate).toBe(0);
    expect(result[0].totalAssignments).toBe(0);
  });

  it("should query cycles with correct filters and ordering", async () => {
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    await getCycleParticipation({ companyId: COMPANY_ID });

    expect(mockPrisma.cycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: COMPANY_ID,
          status: { in: ["IN_PROGRESS", "CLOSED"] },
        },
        orderBy: { reviewStartDate: "asc" },
        take: 10,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getCompletionBreakdown
// ---------------------------------------------------------------------------

describe("getCompletionBreakdown", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return zero breakdown when no assignments", async () => {
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    const result = await getCompletionBreakdown(COMPANY_ID);

    expect(result.SELF).toEqual({ total: 0, completed: 0, rate: 0 });
    expect(result.MANAGER).toEqual({ total: 0, completed: 0, rate: 0 });
    expect(result.PEER).toEqual({ total: 0, completed: 0, rate: 0 });
    expect(result.DIRECT_REPORT).toEqual({ total: 0, completed: 0, rate: 0 });
    expect(result.EXTERNAL).toEqual({ total: 0, completed: 0, rate: 0 });
  });

  it("should compute correct breakdown by reviewer type", async () => {
    const assignments = [
      { reviewerType: "SELF", status: "COMPLETED" },
      { reviewerType: "SELF", status: "COMPLETED" },
      { reviewerType: "PEER", status: "COMPLETED" },
      { reviewerType: "PEER", status: "PENDING" },
      { reviewerType: "PEER", status: "IN_PROGRESS" },
      { reviewerType: "MANAGER", status: "COMPLETED" },
      { reviewerType: "MANAGER", status: "COMPLETED" },
      { reviewerType: "MANAGER", status: "PENDING" },
    ];
    mockPrisma.reviewAssignment.findMany.mockResolvedValue(assignments);

    const result = await getCompletionBreakdown(COMPANY_ID);

    expect(result.SELF).toEqual({ total: 2, completed: 2, rate: 100 });
    expect(result.PEER).toEqual({ total: 3, completed: 1, rate: 33 });
    expect(result.MANAGER).toEqual({ total: 3, completed: 2, rate: 67 });
    expect(result.DIRECT_REPORT).toEqual({ total: 0, completed: 0, rate: 0 });
    expect(result.EXTERNAL).toEqual({ total: 0, completed: 0, rate: 0 });
  });

  it("should query assignments with correct filters", async () => {
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    await getCompletionBreakdown(COMPANY_ID);

    expect(mockPrisma.reviewAssignment.findMany).toHaveBeenCalledWith({
      where: {
        cycle: {
          companyId: COMPANY_ID,
          status: { in: ["IN_PROGRESS", "CLOSED"] },
        },
      },
      select: {
        reviewerType: true,
        status: true,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// getEmployeeDashboardStats
// ---------------------------------------------------------------------------

describe("getEmployeeDashboardStats", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return zeros when employeeId is null", async () => {
    const result = await getEmployeeDashboardStats(null, COMPANY_ID);

    expect(result).toEqual({
      pendingReviews: 0,
      completedReviews: 0,
      releasedReports: 0,
      pendingNominations: 0,
    });

    // Should not call prisma at all
    expect(mockPrisma.reviewAssignment.count).not.toHaveBeenCalled();
    expect(mockPrisma.cycleParticipant.count).not.toHaveBeenCalled();
    expect(mockPrisma.cycle.count).not.toHaveBeenCalled();
  });

  it("should return counts from parallel queries", async () => {
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(3) // pending reviews
      .mockResolvedValueOnce(7); // completed reviews
    mockPrisma.cycleParticipant.count.mockResolvedValue(2); // released reports
    mockPrisma.cycle.count.mockResolvedValue(1); // pending nominations

    const result = await getEmployeeDashboardStats("emp-1", COMPANY_ID);

    expect(result).toEqual({
      pendingReviews: 3,
      completedReviews: 7,
      releasedReports: 2,
      pendingNominations: 1,
    });
  });

  it("should query pending reviews with correct filters", async () => {
    mockPrisma.reviewAssignment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.cycleParticipant.count.mockResolvedValue(0);
    mockPrisma.cycle.count.mockResolvedValue(0);

    await getEmployeeDashboardStats("emp-1", COMPANY_ID);

    // First call: pending reviews
    expect(mockPrisma.reviewAssignment.count).toHaveBeenCalledWith({
      where: {
        reviewerId: "emp-1",
        status: { in: ["PENDING", "IN_PROGRESS"] },
        cycle: { companyId: COMPANY_ID, status: "IN_PROGRESS" },
      },
    });

    // Second call: completed reviews
    expect(mockPrisma.reviewAssignment.count).toHaveBeenCalledWith({
      where: {
        reviewerId: "emp-1",
        status: "COMPLETED",
        cycle: { companyId: COMPANY_ID },
      },
    });

    // Released reports
    expect(mockPrisma.cycleParticipant.count).toHaveBeenCalledWith({
      where: {
        employeeId: "emp-1",
        releasedAt: { not: null },
        cycle: { companyId: COMPANY_ID },
      },
    });

    // Pending nominations
    expect(mockPrisma.cycle.count).toHaveBeenCalledWith({
      where: {
        companyId: COMPANY_ID,
        status: "NOMINATION",
        participants: {
          some: { employeeId: "emp-1" },
        },
      },
    });
  });
});
