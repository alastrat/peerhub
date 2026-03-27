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
  createClimateSurvey,
  updateClimateSurvey,
  deleteClimateSurvey,
  duplicateClimateSurvey,
} from "@/lib/actions/climate-surveys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleQuestions = [
  {
    text: "How satisfied are you with your work environment?",
    type: "LIKERT" as const,
    dimensionId: "dim-1",
    order: 1,
    isRequired: true,
  },
  {
    text: "Any additional comments?",
    type: "TEXT" as const,
    order: 2,
    isRequired: false,
  },
];

const sampleSurvey = {
  id: "survey-1",
  companyId: "company-1",
  name: "Q1 Climate Survey",
  description: "Quarterly climate check",
  type: "CLIMATE",
  status: "DRAFT",
  frequency: "ONCE",
  isAnonymous: true,
  templateId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleSurveyWithQuestions = {
  ...sampleSurvey,
  questions: [
    {
      id: "sq-1",
      surveyId: "survey-1",
      text: "How satisfied are you with your work environment?",
      type: "LIKERT",
      dimensionId: "dim-1",
      order: 1,
      isRequired: true,
      config: null,
    },
    {
      id: "sq-2",
      surveyId: "survey-1",
      text: "Any additional comments?",
      type: "TEXT",
      dimensionId: null,
      order: 2,
      isRequired: false,
      config: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("climate survey actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createClimateSurvey
  // =========================================================================

  describe("createClimateSurvey", () => {
    it("creates a survey with questions successfully", async () => {
      mockPrisma.climateSurvey.create.mockResolvedValue(sampleSurveyWithQuestions);

      const result = await createClimateSurvey({
        name: "Q1 Climate Survey",
        description: "Quarterly climate check",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleSurveyWithQuestions);
      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: "company-1",
          name: "Q1 Climate Survey",
          description: "Quarterly climate check",
          type: "CLIMATE",
          frequency: "ONCE",
          isAnonymous: true,
          questions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                text: "How satisfied are you with your work environment?",
                type: "LIKERT",
                dimensionId: "dim-1",
                order: 1,
                isRequired: true,
              }),
              expect.objectContaining({
                text: "Any additional comments?",
                type: "TEXT",
                dimensionId: null,
                order: 2,
                isRequired: false,
              }),
            ]),
          },
        }),
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    it("uses provided frequency and isAnonymous values", async () => {
      mockPrisma.climateSurvey.create.mockResolvedValue({
        ...sampleSurveyWithQuestions,
        frequency: "QUARTERLY",
        isAnonymous: false,
      });

      await createClimateSurvey({
        name: "Custom Survey",
        type: "PULSE",
        frequency: "QUARTERLY",
        isAnonymous: false,
        questions: sampleQuestions,
      });

      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "PULSE",
          frequency: "QUARTERLY",
          isAnonymous: false,
        }),
        include: expect.any(Object),
      });
    });

    it("trims name and description", async () => {
      mockPrisma.climateSurvey.create.mockResolvedValue(sampleSurveyWithQuestions);

      await createClimateSurvey({
        name: "  Trimmed Name  ",
        description: "  Trimmed Desc  ",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Trimmed Name",
            description: "Trimmed Desc",
          }),
        })
      );
    });

    it("returns error when name is empty", async () => {
      const result = await createClimateSurvey({
        name: "   ",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.climateSurvey.create).not.toHaveBeenCalled();
    });

    it("returns error when questions array is empty", async () => {
      const result = await createClimateSurvey({
        name: "Empty Questions",
        type: "CLIMATE",
        questions: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("one question is required");
      expect(mockPrisma.climateSurvey.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createClimateSurvey({
        name: "Blocked Survey",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create survey");
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await createClimateSurvey({
        name: "No Session",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurvey.create.mockRejectedValue(
        new Error("DB error")
      );

      const result = await createClimateSurvey({
        name: "Failing Survey",
        type: "ENPS",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create survey");
    });
  });

  // =========================================================================
  // updateClimateSurvey
  // =========================================================================

  describe("updateClimateSurvey", () => {
    it("updates a draft survey successfully (no questions)", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurvey);
      mockPrisma.climateSurvey.update.mockResolvedValue({
        ...sampleSurveyWithQuestions,
        name: "Updated Survey",
      });

      const result = await updateClimateSurvey("survey-1", {
        name: "Updated Survey",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Updated Survey");
      expect(mockPrisma.surveyQuestion.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "survey-1" },
        data: expect.objectContaining({ name: "Updated Survey" }),
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    it("replaces questions atomically via transaction when provided", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurvey);

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.surveyQuestion.deleteMany.mockResolvedValue({ count: 2 });
          capturedTxClient.climateSurvey.update.mockResolvedValue(sampleSurveyWithQuestions);
          return fn(capturedTxClient);
        }
      );

      const newQuestions = [
        { text: "New question", type: "NPS" as const, order: 1, isRequired: true },
      ];

      const result = await updateClimateSurvey("survey-1", {
        questions: newQuestions,
      });

      expect(result.success).toBe(true);
      expect(capturedTxClient!.surveyQuestion.deleteMany).toHaveBeenCalledWith({
        where: { surveyId: "survey-1" },
      });
      expect(capturedTxClient!.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "survey-1" },
        data: expect.objectContaining({
          questions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                text: "New question",
                type: "NPS",
                order: 1,
                isRequired: true,
              }),
            ]),
          },
        }),
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    it("updates all supported fields", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurvey);
      mockPrisma.climateSurvey.update.mockResolvedValue(sampleSurveyWithQuestions);

      await updateClimateSurvey("survey-1", {
        name: "New Name",
        description: "New Description",
        type: "PULSE",
        frequency: "QUARTERLY",
        isAnonymous: false,
      });

      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "survey-1" },
        data: expect.objectContaining({
          name: "New Name",
          description: "New Description",
          type: "PULSE",
          frequency: "QUARTERLY",
          isAnonymous: false,
        }),
        include: expect.any(Object),
      });
    });

    it("sets description to null when cleared", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurvey);
      mockPrisma.climateSurvey.update.mockResolvedValue(sampleSurveyWithQuestions);

      await updateClimateSurvey("survey-1", {
        description: "",
      });

      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "survey-1" },
        data: expect.objectContaining({ description: null }),
        include: expect.any(Object),
      });
    });

    it("returns error when survey not found", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

      const result = await updateClimateSurvey("nonexistent", {
        name: "Nope",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
      expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
    });

    it("returns error when survey is not in DRAFT status", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        status: "ACTIVE",
      });

      const result = await updateClimateSurvey("survey-1", {
        name: "Cannot Edit",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Only draft surveys can be edited");
      expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
    });

    it("returns error for CLOSED survey", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        status: "CLOSED",
      });

      const result = await updateClimateSurvey("survey-1", { name: "Nope" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Only draft surveys can be edited");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateClimateSurvey("survey-1", {
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update survey");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurvey);
      mockPrisma.climateSurvey.update.mockRejectedValue(
        new Error("Update failed")
      );

      const result = await updateClimateSurvey("survey-1", {
        name: "Should Fail",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update survey");
    });
  });

  // =========================================================================
  // deleteClimateSurvey
  // =========================================================================

  describe("deleteClimateSurvey", () => {
    it("hard deletes survey with no distributions", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        _count: { distributions: 0 },
      });
      mockPrisma.climateSurvey.delete.mockResolvedValue({});

      const result = await deleteClimateSurvey("survey-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateSurvey.delete).toHaveBeenCalledWith({
        where: { id: "survey-1" },
      });
      expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
    });

    it("archives survey when it has distributions", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        _count: { distributions: 5 },
      });
      mockPrisma.climateSurvey.update.mockResolvedValue({
        ...sampleSurvey,
        status: "ARCHIVED",
      });

      const result = await deleteClimateSurvey("survey-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "survey-1" },
        data: { status: "ARCHIVED" },
      });
      expect(mockPrisma.climateSurvey.delete).not.toHaveBeenCalled();
    });

    it("queries findFirst with _count include", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        _count: { distributions: 0 },
      });
      mockPrisma.climateSurvey.delete.mockResolvedValue({});

      await deleteClimateSurvey("survey-1");

      expect(mockPrisma.climateSurvey.findFirst).toHaveBeenCalledWith({
        where: { id: "survey-1", companyId: "company-1" },
        include: { _count: { select: { distributions: true } } },
      });
    });

    it("returns error when survey not found", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

      const result = await deleteClimateSurvey("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
      expect(mockPrisma.climateSurvey.delete).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteClimateSurvey("survey-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete survey");
    });

    it("handles database errors gracefully on hard delete", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        _count: { distributions: 0 },
      });
      mockPrisma.climateSurvey.delete.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await deleteClimateSurvey("survey-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete survey");
    });

    it("handles database errors gracefully on archive", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...sampleSurvey,
        _count: { distributions: 3 },
      });
      mockPrisma.climateSurvey.update.mockRejectedValue(
        new Error("Archive failed")
      );

      const result = await deleteClimateSurvey("survey-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete survey");
    });
  });

  // =========================================================================
  // duplicateClimateSurvey
  // =========================================================================

  describe("duplicateClimateSurvey", () => {
    it("creates a copy with (Copy) suffix and same questions", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurveyWithQuestions);

      const copiedSurvey = {
        ...sampleSurveyWithQuestions,
        id: "survey-copy-1",
        name: "Q1 Climate Survey (Copy)",
      };
      mockPrisma.climateSurvey.create.mockResolvedValue(copiedSurvey);

      const result = await duplicateClimateSurvey("survey-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(copiedSurvey);
      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Q1 Climate Survey (Copy)",
          description: sampleSurvey.description,
          companyId: "company-1",
          type: "CLIMATE",
          frequency: "ONCE",
          isAnonymous: true,
          questions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                text: "How satisfied are you with your work environment?",
                type: "LIKERT",
                dimensionId: "dim-1",
                order: 1,
                isRequired: true,
              }),
              expect.objectContaining({
                text: "Any additional comments?",
                type: "TEXT",
                dimensionId: null,
                order: 2,
                isRequired: false,
              }),
            ]),
          },
        }),
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    it("returns error when survey not found", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

      const result = await duplicateClimateSurvey("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
      expect(mockPrisma.climateSurvey.create).not.toHaveBeenCalled();
    });

    it("queries with questions included and ordered", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurveyWithQuestions);
      mockPrisma.climateSurvey.create.mockResolvedValue(sampleSurveyWithQuestions);

      await duplicateClimateSurvey("survey-1");

      expect(mockPrisma.climateSurvey.findFirst).toHaveBeenCalledWith({
        where: { id: "survey-1", companyId: "company-1" },
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await duplicateClimateSurvey("survey-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to duplicate survey");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(sampleSurveyWithQuestions);
      mockPrisma.climateSurvey.create.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      const result = await duplicateClimateSurvey("survey-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to duplicate survey");
    });
  });
});
