import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/constants/climate-survey", () => ({
  calculateNPS: vi.fn((ratings: number[]) => {
    if (ratings.length === 0) return 0;
    const promoters = ratings.filter((r: number) => r >= 9).length;
    const detractors = ratings.filter((r: number) => r <= 6).length;
    return Math.round(((promoters - detractors) / ratings.length) * 100);
  }),
}));

// Import AFTER mocks
import { getSurveyResults, getENPSTrend } from "@/lib/queries/climate-reports";
import { calculateNPS } from "@/lib/constants/climate-survey";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSurveyData(overrides: Record<string, unknown> = {}) {
  return {
    id: "survey-1",
    name: "Test Survey",
    companyId: "company-1",
    type: "CLIMATE",
    status: "ACTIVE",
    questions: [],
    distributions: [],
    ...overrides,
  };
}

function buildResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "resp-1",
    isComplete: true,
    employee: {
      departmentId: "dept-1",
      department: { id: "dept-1", name: "Engineering" },
      hubId: "hub-1",
      hub: { id: "hub-1", name: "Main Office" },
      teamMemberships: [],
    },
    answers: [],
    ...overrides,
  };
}

function buildQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    text: "How do you rate leadership?",
    type: "LIKERT",
    order: 1,
    dimensionId: "dim-1",
    dimension: { id: "dim-1", name: "Leadership" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getSurveyResults
// ---------------------------------------------------------------------------

describe("getSurveyResults", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return null when survey not found", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).toBeNull();
    expect(mockPrisma.climateSurvey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "survey-1", companyId: "company-1" },
      })
    );
  });

  it("should compute completion rate correctly", async () => {
    const survey = buildSurveyData({
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({ id: "resp-1", isComplete: true, answers: [] }),
            buildResponse({ id: "resp-2", isComplete: true, answers: [] }),
            buildResponse({ id: "resp-3", isComplete: true, answers: [] }),
            buildResponse({ id: "resp-4", isComplete: false, answers: [] }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.totalInvited).toBe(4);
    expect(result!.totalResponded).toBe(3);
    expect(result!.completionRate).toBe(75);
  });

  it("should compute overall average from all rating answers", async () => {
    const question = buildQuestion({ id: "q1", type: "LIKERT" });

    const survey = buildSurveyData({
      questions: [question],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              answers: [{ questionId: "q1", ratingValue: 4, textValue: null }],
            }),
            buildResponse({
              id: "resp-2",
              isComplete: true,
              answers: [{ questionId: "q1", ratingValue: 3, textValue: null }],
            }),
            buildResponse({
              id: "resp-3",
              isComplete: true,
              answers: [{ questionId: "q1", ratingValue: 5, textValue: null }],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    // (4 + 3 + 5) / 3 = 4.0
    expect(result!.overallAverage).toBe(4);
  });

  it("should compute dimension scores grouped by dimension", async () => {
    const q1 = buildQuestion({
      id: "q1",
      text: "Rate leadership communication",
      type: "LIKERT",
      dimensionId: "dim-1",
      dimension: { id: "dim-1", name: "Leadership" },
    });
    const q2 = buildQuestion({
      id: "q2",
      text: "Rate leadership vision",
      type: "LIKERT",
      dimensionId: "dim-1",
      dimension: { id: "dim-1", name: "Leadership" },
      order: 2,
    });

    const survey = buildSurveyData({
      questions: [q1, q2],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              answers: [
                { questionId: "q1", ratingValue: 4, textValue: null },
                { questionId: "q2", ratingValue: 3, textValue: null },
              ],
            }),
            buildResponse({
              id: "resp-2",
              isComplete: true,
              answers: [
                { questionId: "q1", ratingValue: 5, textValue: null },
                { questionId: "q2", ratingValue: 4, textValue: null },
              ],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.dimensionScores).toHaveLength(1);
    const dimScore = result!.dimensionScores[0];
    expect(dimScore.dimensionId).toBe("dim-1");
    expect(dimScore.dimensionName).toBe("Leadership");
    // (4 + 5 + 3 + 4) / 4 = 4.0
    expect(dimScore.average).toBe(4);
    expect(dimScore.count).toBe(4);
  });

  it("should compute NPS score for NPS-type questions", async () => {
    const npsQuestion = buildQuestion({
      id: "q-nps",
      text: "Would you recommend this company?",
      type: "NPS",
      dimensionId: null,
      dimension: null,
    });

    const npsRatings = [10, 9, 8, 7, 3, 2];

    const survey = buildSurveyData({
      questions: [npsQuestion],
      distributions: [
        {
          id: "dist-1",
          responses: npsRatings.map((rating, i) =>
            buildResponse({
              id: `resp-${i}`,
              isComplete: true,
              answers: [
                { questionId: "q-nps", ratingValue: rating, textValue: null },
              ],
            })
          ),
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(calculateNPS).toHaveBeenCalledWith(npsRatings);
    expect(result!.npsScore).not.toBeNull();
    // promoters (>=9): 10, 9 = 2; detractors (<=6): 3, 2 = 2; total = 6
    // NPS = ((2 - 2) / 6) * 100 = 0
    expect(result!.npsScore).toBe(0);
  });

  it("should return null npsScore when no NPS questions", async () => {
    const question = buildQuestion({
      id: "q1",
      type: "LIKERT",
    });

    const survey = buildSurveyData({
      questions: [question],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              answers: [{ questionId: "q1", ratingValue: 4, textValue: null }],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.npsScore).toBeNull();
  });

  it("should build department breakdown by employee department", async () => {
    const q1 = buildQuestion({
      id: "q1",
      type: "LIKERT",
      dimensionId: "dim-1",
      dimension: { id: "dim-1", name: "Leadership" },
    });

    const survey = buildSurveyData({
      questions: [q1],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              employee: {
                departmentId: "dept-1",
                department: { id: "dept-1", name: "Engineering" },
                hubId: "hub-1",
                hub: { id: "hub-1", name: "Main Office" },
                teamMemberships: [],
              },
              answers: [
                { questionId: "q1", ratingValue: 4, textValue: null },
              ],
            }),
            buildResponse({
              id: "resp-2",
              isComplete: true,
              employee: {
                departmentId: "dept-2",
                department: { id: "dept-2", name: "Marketing" },
                hubId: "hub-1",
                hub: { id: "hub-1", name: "Main Office" },
                teamMemberships: [],
              },
              answers: [
                { questionId: "q1", ratingValue: 5, textValue: null },
              ],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.departmentBreakdown).toHaveLength(2);

    const engDept = result!.departmentBreakdown.find(
      (d) => d.departmentId === "dept-1"
    );
    expect(engDept).toBeDefined();
    expect(engDept!.departmentName).toBe("Engineering");
    expect(engDept!.dimensionId).toBe("dim-1");
    expect(engDept!.average).toBe(4);
    expect(engDept!.count).toBe(1);

    const mktDept = result!.departmentBreakdown.find(
      (d) => d.departmentId === "dept-2"
    );
    expect(mktDept).toBeDefined();
    expect(mktDept!.departmentName).toBe("Marketing");
    expect(mktDept!.average).toBe(5);
    expect(mktDept!.count).toBe(1);
  });

  it("should build team breakdown across cross-dept memberships", async () => {
    const q1 = buildQuestion({
      id: "q1",
      type: "LIKERT",
      dimensionId: "dim-1",
      dimension: { id: "dim-1", name: "Leadership" },
    });

    const survey = buildSurveyData({
      questions: [q1],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              employee: {
                departmentId: "dept-1",
                department: { id: "dept-1", name: "Engineering" },
                hubId: "hub-1",
                hub: { id: "hub-1", name: "Main Office" },
                teamMemberships: [
                  { team: { id: "t1", name: "Alpha" } },
                ],
              },
              answers: [
                { questionId: "q1", ratingValue: 4, textValue: null },
              ],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.teamBreakdown).toHaveLength(1);

    const teamAlpha = result!.teamBreakdown[0];
    expect(teamAlpha.teamId).toBe("t1");
    expect(teamAlpha.teamName).toBe("Alpha");
    expect(teamAlpha.dimensionId).toBe("dim-1");
    expect(teamAlpha.dimensionName).toBe("Leadership");
    expect(teamAlpha.average).toBe(4);
    expect(teamAlpha.count).toBe(1);
  });

  it("should build hub breakdown by employee hub", async () => {
    const q1 = buildQuestion({
      id: "q1",
      type: "LIKERT",
      dimensionId: "dim-1",
      dimension: { id: "dim-1", name: "Leadership" },
    });

    const survey = buildSurveyData({
      questions: [q1],
      distributions: [
        {
          id: "dist-1",
          responses: [
            buildResponse({
              id: "resp-1",
              isComplete: true,
              employee: {
                departmentId: "dept-1",
                department: { id: "dept-1", name: "Engineering" },
                hubId: "hub-1",
                hub: { id: "hub-1", name: "Main Office" },
                teamMemberships: [],
              },
              answers: [
                { questionId: "q1", ratingValue: 3, textValue: null },
              ],
            }),
            buildResponse({
              id: "resp-2",
              isComplete: true,
              employee: {
                departmentId: "dept-1",
                department: { id: "dept-1", name: "Engineering" },
                hubId: "hub-2",
                hub: { id: "hub-2", name: "Remote Office" },
                teamMemberships: [],
              },
              answers: [
                { questionId: "q1", ratingValue: 5, textValue: null },
              ],
            }),
          ],
        },
      ],
    });

    mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey);

    const result = await getSurveyResults("survey-1", "company-1");

    expect(result).not.toBeNull();
    expect(result!.hubBreakdown).toHaveLength(2);

    const mainHub = result!.hubBreakdown.find((h) => h.hubId === "hub-1");
    expect(mainHub).toBeDefined();
    expect(mainHub!.hubName).toBe("Main Office");
    expect(mainHub!.dimensionId).toBe("dim-1");
    expect(mainHub!.average).toBe(3);
    expect(mainHub!.count).toBe(1);

    const remoteHub = result!.hubBreakdown.find((h) => h.hubId === "hub-2");
    expect(remoteHub).toBeDefined();
    expect(remoteHub!.hubName).toBe("Remote Office");
    expect(remoteHub!.average).toBe(5);
    expect(remoteHub!.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getENPSTrend
// ---------------------------------------------------------------------------

describe("getENPSTrend", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should return trend data points ordered by date", async () => {
    const date1 = new Date("2026-01-15");
    const date2 = new Date("2026-02-15");

    const surveys = [
      {
        id: "survey-1",
        companyId: "company-1",
        type: "ENPS",
        status: "CLOSED",
        createdAt: new Date("2026-01-01"),
        questions: [
          { id: "q-nps-1", type: "NPS", text: "Recommend?", order: 1 },
        ],
        distributions: [
          {
            id: "dist-1",
            sentAt: date1,
            responses: [
              {
                id: "resp-1",
                isComplete: true,
                answers: [
                  { questionId: "q-nps-1", ratingValue: 10, textValue: null },
                  { questionId: "q-nps-1", ratingValue: 9, textValue: null },
                ],
              },
            ],
          },
          {
            id: "dist-2",
            sentAt: date2,
            responses: [
              {
                id: "resp-2",
                isComplete: true,
                answers: [
                  { questionId: "q-nps-1", ratingValue: 5, textValue: null },
                  { questionId: "q-nps-1", ratingValue: 3, textValue: null },
                ],
              },
            ],
          },
        ],
      },
    ];

    mockPrisma.climateSurvey.findMany.mockResolvedValue(surveys);

    const result = await getENPSTrend("company-1");

    expect(result).toHaveLength(2);
    expect(result[0].date).toEqual(date1);
    expect(result[1].date).toEqual(date2);
    // dist-1: ratings [10, 9] => promoters=2, detractors=0 => NPS=100
    expect(result[0].score).toBe(100);
    // dist-2: ratings [5, 3] => promoters=0, detractors=2 => NPS=-100
    expect(result[1].score).toBe(-100);
  });

  it("should skip distributions without sentAt", async () => {
    const surveys = [
      {
        id: "survey-1",
        companyId: "company-1",
        type: "ENPS",
        status: "ACTIVE",
        createdAt: new Date("2026-01-01"),
        questions: [
          { id: "q-nps-1", type: "NPS", text: "Recommend?", order: 1 },
        ],
        distributions: [
          {
            id: "dist-1",
            sentAt: null,
            responses: [
              {
                id: "resp-1",
                isComplete: true,
                answers: [
                  { questionId: "q-nps-1", ratingValue: 10, textValue: null },
                ],
              },
            ],
          },
        ],
      },
    ];

    mockPrisma.climateSurvey.findMany.mockResolvedValue(surveys);

    const result = await getENPSTrend("company-1");

    expect(result).toHaveLength(0);
  });

  it("should return empty array when no surveys match", async () => {
    mockPrisma.climateSurvey.findMany.mockResolvedValue([]);

    const result = await getENPSTrend("company-1");

    expect(result).toEqual([]);
    expect(mockPrisma.climateSurvey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          type: "ENPS",
          status: { in: ["ACTIVE", "CLOSED"] },
        },
      })
    );
  });
});
