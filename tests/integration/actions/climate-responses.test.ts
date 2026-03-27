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
    questions: [
      { id: "q-1", isRequired: true },
      { id: "q-2", isRequired: true },
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
      expect(result.error).toBe("Survey already submitted");
      expect(mockPrisma.surveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when employee not found", async () => {
      mockEmployeeLookup({ noEmployee: true });

      const result = await saveSurveyDraft({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Employee not found");
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
      expect(result.error).toBe("DB connection failed");
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
      expect(result.error).toBe("Upsert failed");
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

    it("returns error when distribution not found", async () => {
      mockEmployeeLookup();
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue(null);

      const result = await submitSurveyResponse({
        distributionId: "nonexistent",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
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
      expect(result.error).toContain("required questions");
      expect(result.error).toContain("1 remaining");
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
      expect(result.error).toContain("required questions");
    });

    it("accepts answers where all required questions are properly answered", async () => {
      mockEmployeeLookup();
      // Only one required question
      mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
        ...sampleDistribution,
        survey: {
          id: "survey-1",
          questions: [{ id: "q-1", isRequired: true }],
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
      expect(result.error).toBe("Survey already submitted");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when employee not found", async () => {
      mockEmployeeLookup({ noEmployee: true });

      const result = await submitSurveyResponse({
        distributionId: "dist-1",
        answers: sampleAnswers,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Employee not found");
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
      expect(result.error).toBe("Transaction failed");
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
      expect(result.error).toBe("DB error");
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
            include: { questions: { where: { isRequired: true } } },
          },
        },
      });
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
          questions: [{ id: "q-1", isRequired: true }],
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
          questions: [], // No required questions returned by the filter
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
