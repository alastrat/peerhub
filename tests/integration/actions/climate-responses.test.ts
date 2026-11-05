import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession } from "../../helpers/mock-session";

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

// Run after() callbacks right away so they can be asserted
const afterTasks = vi.hoisted(() => [] as Promise<unknown>[]);
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => afterTasks.push(fn()) }));
const finishIfEveryoneAnswered = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/climate/survey-finish", () => ({ finishIfEveryoneAnswered }));

// Static imports AFTER mocks
import {
  saveSurveyDraft,
  submitSurveyResponse,
} from "@/lib/actions/climate-responses";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * requireEmployee looks up a companyUser with employee include.
 * Any session (ADMIN, MANAGER, MEMBER) can be an employee — the function
 * only requires a valid session + an active companyUser with an employee record.
 */
function mockEmployeeLookup(opts?: { noEmployee?: boolean }) {
  if (opts?.noEmployee) {
    mockPrisma.companyUser.findFirst.mockResolvedValue({
      id: "cu-admin",
      userId: "admin-user",
      companyId: "company-1",
      isActive: true,
      employee: null,
    });
  } else {
    mockPrisma.companyUser.findFirst.mockResolvedValue({
      id: "cu-admin",
      userId: "admin-user",
      companyId: "company-1",
      isActive: true,
      employee: { id: "emp-1" },
    });
  }
}

const sampleResponse = {
  id: "resp-1",
  distributionId: "dist-1",
  employeeId: "emp-1",
  isComplete: false,
  submittedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleCompletedResponse = {
  ...sampleResponse,
  isComplete: true,
  submittedAt: new Date(),
};

const sampleAnswers = [
  { questionId: "q-1", ratingValue: 4 },
  { questionId: "q-2", textValue: "Great workplace" },
];

const sampleDistribution = {
  id: "dist-1",
  surveyId: "survey-1",
  survey: {
    id: "survey-1",
    companyId: "company-1",
    questions: [
      { id: "q-1", type: "LIKERT", config: { scale: "AGREE_5" }, isRequired: true },
      { id: "q-2", type: "TEXT", config: null, isRequired: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("climate response actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
    // Answers are validated against the distribution's survey
    mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
  });

  // =========================================================================
  // saveSurveyDraft
  // =========================================================================

  describe("saveSurveyDraft", () => {
    it("creates a new response and saves answers when no existing response", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockResolvedValue(sampleResponse);
      mockPrisma.surveyAnswer.upsert.mockResolvedValue({});

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(true);

      // Should create a new response
      expect(mockPrisma.surveyResponse.create).toHaveBeenCalledWith({
        data: {
          distributionId: "dist-1",
          employeeId: "emp-1",
        },
      });

      // Should upsert each answer
      expect(mockPrisma.surveyAnswer.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.surveyAnswer.upsert).toHaveBeenCalledWith({
        where: {
          responseId_questionId: {
            responseId: "resp-1",
            questionId: "q-1",
          },
        },
        create: {
          responseId: "resp-1",
          questionId: "q-1",
          ratingValue: 4,
          textValue: null,
        },
        update: {
          ratingValue: 4,
          textValue: null,
        },
      });
      expect(mockPrisma.surveyAnswer.upsert).toHaveBeenCalledWith({
        where: {
          responseId_questionId: {
            responseId: "resp-1",
            questionId: "q-2",
          },
        },
        create: {
          responseId: "resp-1",
          questionId: "q-2",
          ratingValue: null,
          textValue: "Great workplace",
        },
        update: {
          ratingValue: null,
          textValue: "Great workplace",
        },
      });
    });

    it("reuses existing response instead of creating a new one", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.surveyAnswer.upsert.mockResolvedValue({});

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 3 }],
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.surveyResponse.create).not.toHaveBeenCalled();
      expect(mockPrisma.surveyAnswer.upsert).toHaveBeenCalledTimes(1);
    });

    it("returns error when response is already completed", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleCompletedResponse);

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Ya enviaste esta encuesta");
      expect(mockPrisma.surveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No tienes permiso para hacer esto");
    });

    it("returns error when employee not found", async () => {
      mockEmployeeLookup({ noEmployee: true });

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No encontramos tu perfil de colaborador");
    });

    it("handles database errors gracefully on response creation", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No se pudo guardar el borrador");
    });

    it("handles database errors gracefully on answer upsert", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.surveyAnswer.upsert.mockRejectedValue(
        new Error("Upsert failed")
      );

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 5 }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No se pudo guardar el borrador");
    });

    it("handles empty answers array (no upserts)", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: [],
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.surveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it("works with member session (not just admin)", async () => {
      mockSession = createMemberSession();
      // Member session has userId "member-user", companyId "company-1"
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        id: "cu-member",
        userId: "member-user",
        companyId: "company-1",
        isActive: true,
        employee: { id: "emp-member" },
      });
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockResolvedValue({
        ...sampleResponse,
        employeeId: "emp-member",
      });
      mockPrisma.surveyAnswer.upsert.mockResolvedValue({});

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 5 }],
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.surveyResponse.create).toHaveBeenCalledWith({
        data: {
          distributionId: "dist-1",
          employeeId: "emp-member",
        },
      });
    });
  });

  // =========================================================================
  // submitSurveyResponse
  // =========================================================================

  describe("submitSurveyResponse", () => {
    it("validates, saves answers, and marks response complete", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(true);

      // Should call $transaction with an array (batch mode, not callback)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // The transaction receives an array of promises (upserts + update)
      const txArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txArg)).toBe(true);
    });

    it("creates a new response when none exists before submitting", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.surveyResponse.create).toHaveBeenCalledWith({
        data: {
          distributionId: "dist-1",
          employeeId: "emp-1",
        },
      });
    });

    it("checks whether everyone has answered after an invited person submits", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);
      afterTasks.length = 0;

      expect((await submitSurveyResponse({ distributionId: "dist-1", answers: sampleAnswers })).success).toBe(true);
      await Promise.all(afterTasks);
      expect(finishIfEveryoneAnswered).toHaveBeenCalledWith("survey-1", "company-1");
    });

    it("leaves the survey open when the response wasn't from an invitation", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      await submitSurveyResponse({ distributionId: "dist-1", answers: sampleAnswers });
      expect(finishIfEveryoneAnswered).not.toHaveBeenCalled();
    });

    it("returns error when distribution not found", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(null);

      const result = await submitSurveyResponse({
        distributionId: "nonexistent",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No encontramos la encuesta");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when required questions are not answered", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);

      // Only answer one of two required questions
      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 5 }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Falta 1 pregunta obligatoria por responder");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when required questions have empty text answers", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);

      // Provide answers but with empty text for q-2 (no rating, whitespace text)
      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [
          { questionId: "q-1", ratingValue: 5 },
          { questionId: "q-2", textValue: "   " },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("pregunta obligatoria");
    });

    it("accepts answers where all required questions are properly answered", async () => {
      mockEmployeeLookup();
      // Only one required question
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: {
          id: "survey-1",
          companyId: "company-1",
          questions: [{ id: "q-1", type: "LIKERT", config: { scale: "AGREE_5" }, isRequired: true }],
        },
      });
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 5 }],
      });

      expect(result.success).toBe(true);
    });

    it("returns error when response is already completed", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleCompletedResponse);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Ya enviaste esta encuesta");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No tienes permiso para hacer esto");
    });

    it("returns error when employee not found", async () => {
      mockEmployeeLookup({ noEmployee: true });

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No encontramos tu perfil de colaborador");
    });

    it("handles transaction errors gracefully", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Transaction failed")
      );

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No se pudo enviar la encuesta");
    });

    it("handles database errors on distribution lookup", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockRejectedValue(
        new Error("DB error")
      );

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No se pudo enviar la encuesta");
    });

    it("queries distribution with survey and required questions include", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(sampleDistribution);
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(mockPrisma.surveyDistribution.findUnique).toHaveBeenCalledWith({
        where: { id: "dist-1" },
        include: {
          survey: {
            include: { questions: true },
          },
        },
      });
    });

    it("rejects a distribution from another company", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: { ...sampleDistribution.survey, companyId: "company-2" },
      });

      const result = await submitSurveyResponse({ distributionId: "dist-1", answers: sampleAnswers });

      expect(result).toEqual({ success: false, error: "No encontramos la encuesta" });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects answers to questions outside the survey", async () => {
      mockEmployeeLookup();
      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [...sampleAnswers, { questionId: "q-other", ratingValue: 3 }],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("no hace parte de esta encuesta");
    });

    it("rejects ratings outside the question's scale", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: {
          ...sampleDistribution.survey,
          questions: [{ id: "q-1", type: "LIKERT", config: { scale: "FREQ_4" }, isRequired: true }],
        },
      });
      for (const ratingValue of [0, 5, 2.5]) {
        const result = await submitSurveyResponse({
          distributionId: "dist-1",
          answers: [{ questionId: "q-1", ratingValue }],
        });
        expect(result.error).toContain("fuera de la escala de la pregunta");
      }
    });

    it("stores the respondent's segment snapshot on submit", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue({
        departmentId: "dept-1",
        hubId: "hub-1",
        managerId: "emp-boss",
        teamMemberships: [{ teamId: "team-1" }, { teamId: "team-2" }],
        gender: "FEMALE",
        birthDate: new Date("1990-05-02"),
        startDate: new Date("2020-01-15"),
      });

      const result = await submitSurveyResponse({ distributionId: "dist-1", answers: sampleAnswers });

      expect(result.success).toBe(true);
      expect(mockPrisma.surveyResponse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isComplete: true,
            segmentSnapshot: {
              departmentId: "dept-1",
              hubId: "hub-1",
              teamIds: ["team-1", "team-2"],
              leaderEmployeeId: "emp-boss",
              gender: "FEMALE",
              generation: "MILLENNIALS",
              tenure: expect.any(String),
            },
          }),
        }),
      );
    });

    it("works with member session (employees can submit surveys)", async () => {
      mockSession = createMemberSession();
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        id: "cu-member",
        userId: "member-user",
        companyId: "company-1",
        isActive: true,
        employee: { id: "emp-member" },
      });
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: {
          id: "survey-1",
          companyId: "company-1",
          questions: [{ id: "q-1", type: "LIKERT", config: { scale: "AGREE_5" }, isRequired: true }],
        },
      });
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(null);
      mockPrisma.surveyResponse.create.mockResolvedValue({
        ...sampleResponse,
        employeeId: "emp-member",
      });
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [{ questionId: "q-1", ratingValue: 4 }],
      });

      expect(result.success).toBe(true);
    });

    it("handles survey with no required questions (all optional)", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: {
          id: "survey-1",
          companyId: "company-1",
          questions: [], // No questions at all
        },
      });
      mockPrisma.surveyResponse.findFirst.mockResolvedValue(sampleResponse);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: [],
      });

      expect(result.success).toBe(true);
    });
  });
});
