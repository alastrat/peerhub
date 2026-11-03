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
import { getSurveyResults, getENPSTrend, loadSurveyForScoring, scoreScope } from "@/lib/queries/climate-reports";
import { calculateNPS } from "@/lib/constants/climate-survey";
import { instrumentItemConfig } from "@/lib/constants/climate-instrument";

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
    anonymityThreshold: 1,
    goalBand: "FAVORABLE",
    instrumentVersion: null,
    resultsReleasedAt: null,
    questions: [],
    distributions: [],
    ...overrides,
  };
}

function employee(overrides: Record<string, unknown> = {}) {
  return {
    departmentId: "dept-1",
    hubId: "hub-1",
    managerId: "lead-1",
    teamMemberships: [],
    ...overrides,
  };
}

let respCounter = 0;
function buildResponse(overrides: Record<string, unknown> = {}) {
  respCounter++;
  return {
    id: `resp-${respCounter}`,
    isComplete: true,
    segmentSnapshot: null,
    employee: employee(),
    answers: [],
    ...overrides,
  };
}

function ans(questionId: string, ratingValue: number | null, textValue: string | null = null) {
  return { questionId, ratingValue, textValue };
}

function buildQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    text: "How do you rate leadership?",
    type: "LIKERT",
    order: 1,
    config: { scale: "AGREE_5" },
    dimensionId: "dim-1",
    dimension: { id: "dim-1", name: "Leadership", code: null },
    ...overrides,
  };
}

function instrumentQuestion(itemCode: string, dimId: string, dimName: string, order: number) {
  return buildQuestion({
    id: itemCode,
    text: itemCode,
    order,
    config: instrumentItemConfig(itemCode),
    dimensionId: dimId,
    dimension: { id: dimId, name: dimName, code: itemCode.split("-")[0] },
  });
}

function withResponses(responses: unknown[], overrides: Record<string, unknown> = {}) {
  return buildSurveyData({ distributions: [{ id: "dist-1", responses }], ...overrides });
}

function mockNames() {
  mockPrisma.department.findMany.mockResolvedValue([
    { id: "dept-1", name: "Engineering" },
    { id: "dept-2", name: "Sales" },
  ]);
  mockPrisma.hub.findMany.mockResolvedValue([{ id: "hub-1", name: "Main Office" }]);
  mockPrisma.team.findMany.mockResolvedValue([
    { id: "team-1", name: "Platform" },
    { id: "team-2", name: "Growth" },
  ]);
  mockPrisma.employee.findMany.mockResolvedValue([
    { id: "lead-1", name: "Laura Leader" },
    { id: "lead-2", name: "Mario Manager" },
  ]);
}

// ---------------------------------------------------------------------------
// getSurveyResults
// ---------------------------------------------------------------------------

describe("getSurveyResults", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockNames();
  });

  it("returns null when survey not found", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);
    expect(await getSurveyResults("missing", "company-1")).toBeNull();
  });

  it("scopes the query to the company", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);
    await getSurveyResults("survey-1", "company-1");
    expect(mockPrisma.climateSurvey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "survey-1", companyId: "company-1" } }),
    );
  });

  it("returns empty results for a survey with no responses", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(buildSurveyData({ anonymityThreshold: 5 }));
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    expect(r.totalInvited).toBe(0);
    expect(r.totalResponded).toBe(0);
    expect(r.completionRate).toBe(0);
    expect(r.suppressed).toBe(true);
    expect(r.index).toBeNull();
    expect(r.npsScore).toBeNull();
  });

  it("counts invited vs completed and computes completion rate", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses([buildResponse(), buildResponse(), buildResponse({ isComplete: false })]),
    );
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    expect(r.totalInvited).toBe(3);
    expect(r.totalResponded).toBe(2);
    expect(r.completionRate).toBe(67);
  });

  it("hides every score and text answer when the survey is below the minimum", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses(
        [
          buildResponse({ answers: [ans("q1", 5), ans("t", null, "secret")] }),
          buildResponse({ answers: [ans("q1", 4), ans("t", null, "another")] }),
        ],
        {
          anonymityThreshold: 3,
          questions: [buildQuestion(), buildQuestion({ id: "t", type: "TEXT", config: null, order: 2 })],
        },
      ),
    );
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    expect(r.suppressed).toBe(true);
    expect(r.index).toBeNull();
    expect(r.dimensionScores).toEqual([]);
    expect(r.questionResults.every((q) => q.average == null && q.textResponses.length === 0)).toBe(true);
    expect(r.departmentBreakdown.every((s) => s.suppressed)).toBe(true);
  });

  it("scores questions on their own scale with favorability and distribution", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses(
        [
          buildResponse({ answers: [ans("q1", 5)] }),
          buildResponse({ answers: [ans("q1", 4)] }),
          buildResponse({ answers: [ans("q1", 2)] }),
        ],
        { questions: [buildQuestion()] },
      ),
    );
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    const q = r.questionResults[0];
    expect(q.average).toBeCloseTo(11 / 3);
    expect(q.favorability).toBeCloseTo(2 / 3);
    expect(q.distribution).toEqual({ 5: 1, 4: 1, 2: 1 });
    expect(q.scaleKey).toBe("AGREE_5");
    expect(q.scaleMin).toBe(1);
    expect(q.scaleMax).toBe(5);
    expect(r.index?.mean).toBeCloseTo(11 / 3);
    expect(r.index?.band).toBeNull();
    expect(r.isInstrument).toBe(false);
  });

  it("keeps NPS out of the overall mean and computes eNPS separately", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses(
        [
          buildResponse({ answers: [ans("q1", 4), ans("nps", 10)] }),
          buildResponse({ answers: [ans("q1", 4), ans("nps", 0)] }),
        ],
        {
          questions: [
            buildQuestion(),
            buildQuestion({ id: "nps", type: "NPS", config: null, dimensionId: null, dimension: null, order: 2 }),
          ],
        },
      ),
    );
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    expect(r.index?.mean).toBe(4);
    expect(r.npsScore).toBe(0); // one promoter, one detractor
    expect(calculateNPS).toHaveBeenCalledWith([10, 0]);
  });

  it("collects text responses", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses([buildResponse({ answers: [ans("t", null, "Great team")] })], {
        questions: [buildQuestion({ id: "t", type: "TEXT", config: null, dimensionId: null, dimension: null })],
      }),
    );
    const r = (await getSurveyResults("survey-1", "company-1"))!;
    expect(r.questionResults[0].textResponses).toEqual(["Great team"]);
    expect(r.questionResults[0].scaleKey).toBeNull();
  });

  describe("instrument surveys", () => {
    const questions = [
      instrumentQuestion("LID-1", "lid", "Liderazgo", 1),
      instrumentQuestion("LID-2", "lid", "Liderazgo", 2),
      instrumentQuestion("CVI-1", "cvi", "Calidad de vida", 3),
      instrumentQuestion("CVI-2", "cvi", "Calidad de vida", 4),
    ];
    const good = { "LID-1": 4, "LID-2": 4, "CVI-1": 2, "CVI-2": 2 };
    const answersOf = (v: Record<string, number>) => Object.entries(v).map(([q, n]) => ans(q, n));

    it("returns bands, the Índice de Clima, gaps and dimension codes", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses([buildResponse({ answers: answersOf(good) })], { questions, instrumentVersion: "KCO-2026.1" }),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.isInstrument).toBe(true);
      expect(r.instrumentVersion).toBe("KCO-2026.1");
      expect(r.index?.mean).toBe(3);
      expect(r.index?.band).toBe("DESFAVORABLE");
      const lid = r.dimensionScores.find((d) => d.dimensionId === "lid")!;
      expect(lid.band).toBe("MUY_FAVORABLE");
      expect(lid.dimensionCode).toBe("LID");
      expect(r.gaps.map((g) => g.dimensionId)).toEqual(["cvi"]);
      expect(r.questionResults[0].itemCode).toBe("LID-1");
    });

    it("lists segments below the goal as attention points, lowest first", async () => {
      const responses = [
        // dept-1 / lead-1: low
        buildResponse({ answers: answersOf({ "LID-1": 2, "LID-2": 2, "CVI-1": 2, "CVI-2": 2 }) }),
        // dept-2 / lead-2: high
        buildResponse({
          answers: answersOf({ "LID-1": 4, "LID-2": 4, "CVI-1": 4, "CVI-2": 4 }),
          employee: employee({ departmentId: "dept-2", managerId: "lead-2" }),
        }),
      ];
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(withResponses(responses, { questions }));
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.attentionSegments.map((s) => `${s.type}:${s.segmentName}`)).toEqual(
        expect.arrayContaining(["department:Engineering", "leader:Laura Leader", "hub:Main Office"]),
      );
      expect(r.attentionSegments.find((s) => s.segmentName === "Sales")).toBeUndefined();
      expect(r.attentionSegments[0].mean).toBeLessThanOrEqual(r.attentionSegments.at(-1)!.mean);
    });

    it("uses a stricter goal band", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses([buildResponse({ answers: answersOf({ "LID-1": 3, "LID-2": 4, "CVI-1": 3, "CVI-2": 4 }) })], {
          questions,
          goalBand: "MUY_FAVORABLE",
        }),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.goalBand).toBe("MUY_FAVORABLE");
      expect(r.gaps).toHaveLength(2); // both Favorable (3.5) < Muy favorable
    });
  });

  describe("segment breakdowns", () => {
    it("builds department, hub, team and leader breakdowns with names", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses(
          [
            buildResponse({
              answers: [ans("q1", 5)],
              employee: employee({ teamMemberships: [{ teamId: "team-1" }, { teamId: "team-2" }] }),
            }),
            buildResponse({ answers: [ans("q1", 3)], employee: employee({ departmentId: "dept-2", managerId: "lead-2" }) }),
          ],
          { questions: [buildQuestion()] },
        ),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.departmentBreakdown.map((s) => [s.segmentName, s.index?.mean])).toEqual([
        ["Engineering", 5],
        ["Sales", 3],
      ]);
      expect(r.hubBreakdown).toHaveLength(1);
      expect(r.hubBreakdown[0].respondents).toBe(2);
      expect(r.teamBreakdown.map((s) => s.segmentName)).toEqual(["Growth", "Platform"]);
      expect(r.leaderBreakdown.map((s) => s.segmentName)).toEqual(["Laura Leader", "Mario Manager"]);
      expect(r.departmentBreakdown[0].dimensions[0]).toMatchObject({ dimensionId: "dim-1", mean: 5 });
    });

    it("suppresses segments under the survey's minimum", async () => {
      const many = Array.from({ length: 3 }, () => buildResponse({ answers: [ans("q1", 4)] }));
      const one = buildResponse({ answers: [ans("q1", 1)], employee: employee({ departmentId: "dept-2" }) });
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses([...many, one], { questions: [buildQuestion()], anonymityThreshold: 3 }),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      const eng = r.departmentBreakdown.find((s) => s.segmentId === "dept-1")!;
      const sales = r.departmentBreakdown.find((s) => s.segmentId === "dept-2")!;
      expect(eng.suppressed).toBe(false);
      expect(sales.suppressed).toBe(true);
      expect(sales.index).toBeNull();
      expect(sales.dimensions).toEqual([]);
    });

    it("prefers the stored segment snapshot over the employee's current position", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses(
          [
            buildResponse({
              answers: [ans("q1", 4)],
              segmentSnapshot: { departmentId: "dept-2", hubId: null, teamIds: [], leaderEmployeeId: "lead-2" },
              employee: employee({ departmentId: "dept-1", managerId: "lead-1" }),
            }),
          ],
          { questions: [buildQuestion()] },
        ),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.departmentBreakdown.map((s) => s.segmentId)).toEqual(["dept-2"]);
      expect(r.leaderBreakdown.map((s) => s.segmentId)).toEqual(["lead-2"]);
      expect(r.hubBreakdown).toEqual([]);
    });

    it("skips responses with no employee and no snapshot", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(
        withResponses([buildResponse({ answers: [ans("q1", 4)], employee: null })], { questions: [buildQuestion()] }),
      );
      const r = (await getSurveyResults("survey-1", "company-1"))!;
      expect(r.totalResponded).toBe(1);
      expect(r.departmentBreakdown).toEqual([]);
      expect(r.leaderBreakdown).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// scoreScope
// ---------------------------------------------------------------------------

describe("scoreScope", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("scores only the responses in the scope and applies the minimum", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(
      withResponses(
        [
          buildResponse({ answers: [ans("q1", 5)] }),
          buildResponse({ answers: [ans("q1", 5)] }),
          buildResponse({ answers: [ans("q1", 1)], employee: employee({ managerId: "lead-2" }) }),
        ],
        { questions: [buildQuestion()], anonymityThreshold: 2 },
      ),
    );
    const survey = (await loadSurveyForScoring("survey-1", "company-1"))!;
    const lead1 = scoreScope(survey, "LEADER", "lead-1");
    expect(lead1.score.respondents).toBe(2);
    expect(lead1.score.index?.mean).toBe(5);
    expect(lead1.dimensions[0].dimensionName).toBe("Leadership");

    const lead2 = scoreScope(survey, "LEADER", "lead-2");
    expect(lead2.score.suppressed).toBe(true);

    const org = scoreScope(survey, "ORGANIZATION", null);
    expect(org.score.respondents).toBe(3);
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
