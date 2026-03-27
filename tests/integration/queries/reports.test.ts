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

// Mock anonymity utils so we control their output deterministically
vi.mock("@/lib/utils/anonymity", () => ({
  aggregateRatings: vi.fn((responses: { ratingValue?: number | null }[], threshold: number) => {
    const valid = responses.filter(
      (r) => r.ratingValue !== null && r.ratingValue !== undefined
    );
    if (valid.length < threshold) {
      return {
        isVisible: false,
        message: `Minimum ${threshold} responses required for anonymity`,
      };
    }
    const ratings = valid.map((r) => r.ratingValue as number);
    const sum = ratings.reduce((a, b) => a + b, 0);
    const distribution: Record<number, number> = {};
    ratings.forEach((r) => {
      distribution[r] = (distribution[r] || 0) + 1;
    });
    return {
      isVisible: true,
      ratings: {
        average: Math.round((sum / ratings.length) * 100) / 100,
        count: ratings.length,
        distribution,
      },
    };
  }),
  aggregateTextResponses: vi.fn(
    (responses: { textValue?: string | null }[], threshold: number) => {
      const valid = responses
        .filter((r) => r.textValue && r.textValue.trim())
        .map((r) => r.textValue as string);
      if (valid.length < threshold) {
        return {
          isVisible: false,
          message: `Minimum ${threshold} responses required for anonymity`,
        };
      }
      return { isVisible: true, textResponses: valid };
    }
  ),
  groupResponsesByReviewerType: vi.fn(
    (
      _responses: unknown[],
      _threshold: number
    ) => {
      // Return a minimal grouped result — the actual logic is tested in anonymity utils
      return {
        SELF: { isVisible: false },
        MANAGER: { isVisible: false },
        PEER: { isVisible: false },
        DIRECT_REPORT: { isVisible: false },
        EXTERNAL: { isVisible: false },
      };
    }
  ),
  calculateOverallScore: vi.fn(() => null),
  shuffleArray: vi.fn(<T>(arr: T[]): T[] => arr), // identity — no shuffle in tests
}));

// Import AFTER mocks
import {
  getEmployeeReport,
  getCycleReportSummary,
  getReleasedReportsForUser,
  getCyclesWithReports,
} from "@/lib/queries/reports";
import {
  groupResponsesByReviewerType,
  calculateOverallScore,
  shuffleArray,
} from "@/lib/utils/anonymity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPANY_ID = "company-1";
const CYCLE_ID = "cycle-1";
const EMPLOYEE_ID = "emp-1";

function buildCycleWithTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: CYCLE_ID,
    name: "Q1 360 Review",
    companyId: COMPANY_ID,
    status: "IN_PROGRESS",
    anonymityThreshold: 3,
    reviewEndDate: new Date("2026-06-01"),
    createdAt: new Date("2026-01-01"),
    template: {
      name: "Standard 360",
      sections: [
        {
          id: "sec-1",
          title: "Leadership",
          order: 1,
          questions: [
            {
              id: "q1",
              text: "Rate leadership skills",
              type: "RATING",
              order: 1,
              competencyId: null,
              competency: null,
            },
          ],
        },
      ],
    },
    participants: [
      {
        employeeId: EMPLOYEE_ID,
        releasedAt: null,
        employee: { name: "John Doe", email: "john@acme.com" },
      },
    ],
    ...overrides,
  };
}

function buildAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assign-1",
    cycleId: CYCLE_ID,
    revieweeId: EMPLOYEE_ID,
    reviewerType: "PEER" as const,
    status: "COMPLETED",
    responses: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getEmployeeReport
// ---------------------------------------------------------------------------

describe("getEmployeeReport", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.mocked(calculateOverallScore).mockReturnValue(null);
    vi.mocked(shuffleArray).mockImplementation(<T>(arr: T[]) => arr);
  });

  it("should return null when cycle not found", async () => {
    mockPrisma.cycle.findFirst.mockResolvedValue(null);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result).toBeNull();
  });

  it("should return null when participant not in cycle", async () => {
    const cycle = buildCycleWithTemplate({ participants: [] });
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result).toBeNull();
  });

  it("should return report with empty sections when no assignments", async () => {
    const cycle = buildCycleWithTemplate();
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result).not.toBeNull();
    expect(result!.cycleId).toBe(CYCLE_ID);
    expect(result!.cycleName).toBe("Q1 360 Review");
    expect(result!.participantId).toBe(EMPLOYEE_ID);
    expect(result!.participantName).toBe("John Doe");
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].sectionTitle).toBe("Leadership");
    expect(result!.responseCounts).toEqual({
      SELF: 0,
      MANAGER: 0,
      PEER: 0,
      DIRECT_REPORT: 0,
      EXTERNAL: 0,
    });
  });

  it("should use employee email as name when name is null", async () => {
    const cycle = buildCycleWithTemplate({
      participants: [
        {
          employeeId: EMPLOYEE_ID,
          releasedAt: null,
          employee: { name: null, email: "john@acme.com" },
        },
      ],
    });
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.participantName).toBe("john@acme.com");
  });

  it("should compute response counts by reviewer type", async () => {
    const cycle = buildCycleWithTemplate();
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const assignments = [
      buildAssignment({ id: "a1", reviewerType: "SELF", responses: [] }),
      buildAssignment({ id: "a2", reviewerType: "PEER", responses: [] }),
      buildAssignment({ id: "a3", reviewerType: "PEER", responses: [] }),
      buildAssignment({ id: "a4", reviewerType: "MANAGER", responses: [] }),
    ];
    mockPrisma.reviewAssignment.findMany.mockResolvedValue(assignments);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.responseCounts).toEqual({
      SELF: 1,
      MANAGER: 1,
      PEER: 2,
      DIRECT_REPORT: 0,
      EXTERNAL: 0,
    });
  });

  it("should pass overall score from calculateOverallScore", async () => {
    vi.mocked(calculateOverallScore).mockReturnValue({
      score: 4.2,
      count: 10,
    });

    const cycle = buildCycleWithTemplate();
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.overallScore).toBe(4.2);
  });

  it("should categorize text responses into strengths and opportunities", async () => {
    const cycle = buildCycleWithTemplate({
      template: {
        name: "Standard 360",
        sections: [
          {
            id: "sec-1",
            title: "Open Feedback",
            order: 1,
            questions: [
              {
                id: "q-strength",
                text: "What is this person's greatest strength?",
                type: "TEXT",
                order: 1,
                competencyId: null,
                competency: null,
              },
              {
                id: "q-improve",
                text: "What area should they improve?",
                type: "TEXT",
                order: 2,
                competencyId: null,
                competency: null,
              },
            ],
          },
        ],
      },
    });
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const assignments = [
      buildAssignment({
        id: "a1",
        reviewerType: "PEER",
        responses: [
          {
            questionId: "q-strength",
            ratingValue: null,
            textValue: "Great communicator",
            question: {
              text: "What is this person's greatest strength?",
              type: "TEXT",
            },
          },
          {
            questionId: "q-improve",
            ratingValue: null,
            textValue: "Could improve time management",
            question: {
              text: "What area should they improve?",
              type: "TEXT",
            },
          },
        ],
      }),
    ];
    mockPrisma.reviewAssignment.findMany.mockResolvedValue(assignments);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.strengths).toContain("Great communicator");
    expect(result!.opportunities).toContain("Could improve time management");
  });

  it("should include releasedAt from participant", async () => {
    const releasedDate = new Date("2026-04-01");
    const cycle = buildCycleWithTemplate({
      participants: [
        {
          employeeId: EMPLOYEE_ID,
          releasedAt: releasedDate,
          employee: { name: "John Doe", email: "john@acme.com" },
        },
      ],
    });
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);
    mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.releasedAt).toEqual(releasedDate);
  });

  it("should build competency scores from COMPETENCY_RATING questions", async () => {
    const cycle = buildCycleWithTemplate({
      template: {
        name: "Competency 360",
        sections: [
          {
            id: "sec-1",
            title: "Competencies",
            order: 1,
            questions: [
              {
                id: "q-comp",
                text: "Rate communication competency",
                type: "COMPETENCY_RATING",
                order: 1,
                competencyId: "comp-1",
                competency: {
                  id: "comp-1",
                  name: "Communication",
                  category: "Soft Skills",
                },
              },
            ],
          },
        ],
      },
    });
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const assignments = [
      buildAssignment({
        id: "a1",
        reviewerType: "SELF",
        responses: [
          {
            questionId: "q-comp",
            ratingValue: 5,
            textValue: null,
            question: { text: "Rate communication competency", type: "COMPETENCY_RATING" },
          },
        ],
      }),
      buildAssignment({
        id: "a2",
        reviewerType: "PEER",
        responses: [
          {
            questionId: "q-comp",
            ratingValue: 4,
            textValue: null,
            question: { text: "Rate communication competency", type: "COMPETENCY_RATING" },
          },
        ],
      }),
    ];
    mockPrisma.reviewAssignment.findMany.mockResolvedValue(assignments);

    const result = await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(result!.competencyScores).toHaveLength(1);
    const compScore = result!.competencyScores[0];
    expect(compScore.competencyId).toBe("comp-1");
    expect(compScore.competencyName).toBe("Communication");
    expect(compScore.category).toBe("Soft Skills");
    // SELF (threshold=1): avg=5; PEER (threshold=3): 1 response < 3 → null
    expect(compScore.byReviewerType.SELF).toEqual({ average: 5, count: 1 });
    expect(compScore.byReviewerType.PEER).toBeNull();
    // overallAverage only includes types that pass their threshold:
    // only SELF passes (1 >= 1), PEER fails (1 < 3) → overallAverage = 5/1 = 5
    expect(compScore.overallAverage).toBe(5);
  });

  it("should query cycle with correct filters", async () => {
    mockPrisma.cycle.findFirst.mockResolvedValue(null);

    await getEmployeeReport({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
      employeeId: EMPLOYEE_ID,
    });

    expect(mockPrisma.cycle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CYCLE_ID, companyId: COMPANY_ID },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getCycleReportSummary
// ---------------------------------------------------------------------------

describe("getCycleReportSummary", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return null when cycle not found", async () => {
    mockPrisma.cycle.findFirst.mockResolvedValue(null);

    const result = await getCycleReportSummary({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
    });

    expect(result).toBeNull();
  });

  it("should return participant summaries with completion info", async () => {
    const cycle = {
      id: CYCLE_ID,
      name: "Q1 Review",
      status: "IN_PROGRESS",
      anonymityThreshold: 3,
      participants: [
        {
          employeeId: "emp-1",
          releasedAt: null,
          employee: { name: "Alice", email: "alice@acme.com" },
        },
        {
          employeeId: "emp-2",
          releasedAt: new Date("2026-03-01"),
          employee: { name: null, email: "bob@acme.com" },
        },
      ],
      assignments: [
        { revieweeId: "emp-1", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-1", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-1", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-1", status: "PENDING", responses: [] },
        { revieweeId: "emp-2", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-2", status: "PENDING", responses: [] },
      ],
    };
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const result = await getCycleReportSummary({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
    });

    expect(result).not.toBeNull();
    expect(result!.cycleId).toBe(CYCLE_ID);
    expect(result!.cycleName).toBe("Q1 Review");
    expect(result!.anonymityThreshold).toBe(3);
    expect(result!.participants).toHaveLength(2);

    // Alice: 3 completed out of 4 total, threshold=3 → hasMinimumResponses = true
    const alice = result!.participants.find(
      (p) => p.participantId === "emp-1"
    )!;
    expect(alice.participantName).toBe("Alice");
    expect(alice.completedReviews).toBe(3);
    expect(alice.totalReviews).toBe(4);
    expect(alice.hasMinimumResponses).toBe(true);
    expect(alice.releasedAt).toBeNull();

    // Bob: 1 completed out of 2 total, threshold=3 → hasMinimumResponses = false
    const bob = result!.participants.find(
      (p) => p.participantId === "emp-2"
    )!;
    expect(bob.participantName).toBe("bob@acme.com");
    expect(bob.completedReviews).toBe(1);
    expect(bob.totalReviews).toBe(2);
    expect(bob.hasMinimumResponses).toBe(false);
    expect(bob.releasedAt).toEqual(new Date("2026-03-01"));
  });

  it("should compute stats correctly", async () => {
    const cycle = {
      id: CYCLE_ID,
      name: "Q1 Review",
      status: "CLOSED",
      anonymityThreshold: 2,
      participants: [
        {
          employeeId: "emp-1",
          releasedAt: new Date("2026-03-01"),
          employee: { name: "Alice", email: "alice@acme.com" },
        },
        {
          employeeId: "emp-2",
          releasedAt: null,
          employee: { name: "Bob", email: "bob@acme.com" },
        },
        {
          employeeId: "emp-3",
          releasedAt: null,
          employee: { name: "Carol", email: "carol@acme.com" },
        },
      ],
      assignments: [
        // Alice: 2 completed (meets threshold=2)
        { revieweeId: "emp-1", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-1", status: "COMPLETED", responses: [] },
        // Bob: 3 completed (meets threshold=2)
        { revieweeId: "emp-2", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-2", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-2", status: "COMPLETED", responses: [] },
        // Carol: 1 completed (does NOT meet threshold=2)
        { revieweeId: "emp-3", status: "COMPLETED", responses: [] },
        { revieweeId: "emp-3", status: "PENDING", responses: [] },
      ],
    };
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const result = await getCycleReportSummary({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
    });

    // Alice: released; Bob: ready (meets threshold, not released); Carol: not ready
    expect(result!.stats).toEqual({
      total: 3,
      released: 1,
      ready: 1,
      notReady: 1,
    });
  });

  it("should handle cycle with no participants", async () => {
    const cycle = {
      id: CYCLE_ID,
      name: "Empty Cycle",
      status: "IN_PROGRESS",
      anonymityThreshold: 3,
      participants: [],
      assignments: [],
    };
    mockPrisma.cycle.findFirst.mockResolvedValue(cycle);

    const result = await getCycleReportSummary({
      cycleId: CYCLE_ID,
      companyId: COMPANY_ID,
    });

    expect(result!.participants).toHaveLength(0);
    expect(result!.stats).toEqual({
      total: 0,
      released: 0,
      ready: 0,
      notReady: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// getReleasedReportsForUser
// ---------------------------------------------------------------------------

describe("getReleasedReportsForUser", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return released reports mapped correctly", async () => {
    const releasedAt = new Date("2026-03-15");
    const reviewEndDate = new Date("2026-03-10");

    const participants = [
      {
        cycleId: "c1",
        releasedAt,
        cycle: {
          name: "Annual Review",
          reviewEndDate,
          template: { name: "360 Template" },
        },
      },
    ];
    mockPrisma.cycleParticipant.findMany.mockResolvedValue(participants);

    const result = await getReleasedReportsForUser(EMPLOYEE_ID, COMPANY_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      cycleId: "c1",
      cycleName: "Annual Review",
      templateName: "360 Template",
      releasedAt,
      reviewEndDate,
    });
  });

  it("should return empty array when no released reports", async () => {
    mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);

    const result = await getReleasedReportsForUser(EMPLOYEE_ID, COMPANY_ID);

    expect(result).toEqual([]);
  });

  it("should query with correct filters and ordering", async () => {
    mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);

    await getReleasedReportsForUser(EMPLOYEE_ID, COMPANY_ID);

    expect(mockPrisma.cycleParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          employeeId: EMPLOYEE_ID,
          releasedAt: { not: null },
          cycle: { companyId: COMPANY_ID },
        },
        orderBy: { releasedAt: "desc" },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getCyclesWithReports
// ---------------------------------------------------------------------------

describe("getCyclesWithReports", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return cycles with computed report stats", async () => {
    const cycles = [
      {
        id: "c1",
        name: "Q1 Review",
        status: "CLOSED",
        reviewEndDate: new Date("2026-03-31"),
        createdAt: new Date("2026-01-01"),
        template: { name: "Standard 360" },
        participants: [
          { releasedAt: new Date("2026-04-01") },
          { releasedAt: null },
          { releasedAt: new Date("2026-04-02") },
        ],
        assignments: [
          { status: "COMPLETED" },
          { status: "COMPLETED" },
        ],
        _count: { participants: 3, assignments: 5 },
      },
    ];
    mockPrisma.cycle.findMany.mockResolvedValue(cycles);

    const result = await getCyclesWithReports(COMPANY_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "c1",
      name: "Q1 Review",
      status: "CLOSED",
      templateName: "Standard 360",
      participantCount: 3,
      completedReviews: 2,
      totalReviews: 5,
      releasedCount: 2,
      reviewEndDate: new Date("2026-03-31"),
    });
  });

  it("should return empty array when no cycles", async () => {
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    const result = await getCyclesWithReports(COMPANY_ID);

    expect(result).toEqual([]);
  });

  it("should query with correct filters and ordering", async () => {
    mockPrisma.cycle.findMany.mockResolvedValue([]);

    await getCyclesWithReports(COMPANY_ID);

    expect(mockPrisma.cycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: COMPANY_ID,
          status: { in: ["IN_PROGRESS", "CLOSED"] },
        },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("should count released participants correctly when none released", async () => {
    const cycles = [
      {
        id: "c1",
        name: "New Cycle",
        status: "IN_PROGRESS",
        reviewEndDate: null,
        createdAt: new Date("2026-03-01"),
        template: { name: "Template" },
        participants: [
          { releasedAt: null },
          { releasedAt: null },
        ],
        assignments: [],
        _count: { participants: 2, assignments: 4 },
      },
    ];
    mockPrisma.cycle.findMany.mockResolvedValue(cycles);

    const result = await getCyclesWithReports(COMPANY_ID);

    expect(result[0].releasedCount).toBe(0);
    expect(result[0].completedReviews).toBe(0);
  });
});
