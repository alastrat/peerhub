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

// Import AFTER mocks
import {
  createClimateSurveyTemplate,
  updateClimateSurveyTemplate,
  deleteClimateSurveyTemplate,
  duplicateClimateSurveyTemplate,
  createSurveyFromTemplate,
} from "@/lib/actions/climate-survey-templates";

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

const sampleTemplate = {
  id: "template-1",
  name: "Q1 Climate Survey",
  description: "Quarterly climate check",
  companyId: "company-1",
  type: "CLIMATE",
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleTemplateWithQuestions = {
  ...sampleTemplate,
  questions: [
    {
      id: "tq-1",
      templateId: "template-1",
      text: "How satisfied are you with your work environment?",
      type: "LIKERT",
      dimensionId: "dim-1",
      order: 1,
      isRequired: true,
      config: null,
    },
    {
      id: "tq-2",
      templateId: "template-1",
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

describe("climate survey template actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createClimateSurveyTemplate
  // =========================================================================

  describe("createClimateSurveyTemplate", () => {
    it("creates template with nested questions successfully", async () => {
      mockPrisma.climateSurveyTemplate.create.mockResolvedValue(
        sampleTemplateWithQuestions
      );

      const result = await createClimateSurveyTemplate({
        name: "Q1 Climate Survey",
        description: "Quarterly climate check",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleTemplateWithQuestions);
      expect(mockPrisma.climateSurveyTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Q1 Climate Survey",
          description: "Quarterly climate check",
          companyId: "company-1",
          type: "CLIMATE",
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

    it("returns error when name is empty", async () => {
      const result = await createClimateSurveyTemplate({
        name: "   ",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("name is required");
      expect(mockPrisma.climateSurveyTemplate.create).not.toHaveBeenCalled();
    });

    it("returns error when questions array is empty", async () => {
      const result = await createClimateSurveyTemplate({
        name: "Empty Template",
        type: "PULSE",
        questions: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("one question is required");
      expect(mockPrisma.climateSurveyTemplate.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createClimateSurveyTemplate({
        name: "Blocked Template",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create template");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurveyTemplate.create.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await createClimateSurveyTemplate({
        name: "Failing Template",
        type: "ENPS",
        questions: sampleQuestions,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create template");
    });

    it("trims name and description", async () => {
      mockPrisma.climateSurveyTemplate.create.mockResolvedValue(sampleTemplate);

      await createClimateSurveyTemplate({
        name: "  Trimmed Name  ",
        description: "  Trimmed Desc  ",
        type: "CLIMATE",
        questions: sampleQuestions,
      });

      expect(mockPrisma.climateSurveyTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Trimmed Name",
            description: "Trimmed Desc",
          }),
        })
      );
    });
  });

  // =========================================================================
  // updateClimateSurveyTemplate
  // =========================================================================

  describe("updateClimateSurveyTemplate", () => {
    it("updates template with new questions via transaction", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplate
      );

      // Capture the txClient so we can set return values and assert calls
      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.climateSurveyTemplateQuestion.deleteMany.mockResolvedValue(
            { count: 2 }
          );
          capturedTxClient.climateSurveyTemplate.update.mockResolvedValue({
            ...sampleTemplate,
            name: "Updated Survey",
            questions: [
              {
                id: "tq-new-1",
                text: "New question",
                type: "NPS",
                order: 1,
                isRequired: true,
              },
            ],
          });
          return fn(capturedTxClient);
        }
      );

      const newQuestions = [
        { text: "New question", type: "NPS" as const, order: 1, isRequired: true },
      ];

      const result = await updateClimateSurveyTemplate("template-1", {
        name: "Updated Survey",
        questions: newQuestions,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({ name: "Updated Survey" })
      );

      // Verify the transaction deleted old questions then updated template
      expect(capturedTxClient!.climateSurveyTemplateQuestion.deleteMany).toHaveBeenCalledWith({
        where: { templateId: "template-1" },
      });
      expect(capturedTxClient!.climateSurveyTemplate.update).toHaveBeenCalledWith({
        where: { id: "template-1" },
        data: expect.objectContaining({
          name: "Updated Survey",
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

    it("updates template without replacing questions when none provided", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplate
      );

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.climateSurveyTemplate.update.mockResolvedValue({
            ...sampleTemplate,
            name: "Renamed Only",
          });
          return fn(capturedTxClient);
        }
      );

      const result = await updateClimateSurveyTemplate("template-1", {
        name: "Renamed Only",
      });

      expect(result.success).toBe(true);
      // deleteMany should NOT be called when no questions are provided
      expect(
        capturedTxClient!.climateSurveyTemplateQuestion.deleteMany
      ).not.toHaveBeenCalled();
    });

    it("returns error when template not found", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(null);

      const result = await updateClimateSurveyTemplate("nonexistent", {
        name: "Nope",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateClimateSurveyTemplate("template-1", {
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update template");
    });

    it("handles transaction errors gracefully", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplate
      );
      mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

      const result = await updateClimateSurveyTemplate("template-1", {
        name: "Should Fail",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update template");
    });
  });

  // =========================================================================
  // deleteClimateSurveyTemplate
  // =========================================================================

  describe("deleteClimateSurveyTemplate", () => {
    it("hard deletes template when no surveys reference it", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue({
        ...sampleTemplate,
        _count: { surveys: 0 },
      });
      mockPrisma.climateSurveyTemplate.delete.mockResolvedValue({});

      const result = await deleteClimateSurveyTemplate("template-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateSurveyTemplate.delete).toHaveBeenCalledWith({
        where: { id: "template-1" },
      });
      expect(mockPrisma.climateSurveyTemplate.update).not.toHaveBeenCalled();
    });

    it("archives template when surveys reference it", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue({
        ...sampleTemplate,
        _count: { surveys: 3 },
      });
      mockPrisma.climateSurveyTemplate.update.mockResolvedValue({
        ...sampleTemplate,
        isArchived: true,
      });

      const result = await deleteClimateSurveyTemplate("template-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateSurveyTemplate.update).toHaveBeenCalledWith({
        where: { id: "template-1" },
        data: { isArchived: true },
      });
      expect(mockPrisma.climateSurveyTemplate.delete).not.toHaveBeenCalled();
    });

    it("returns error when template not found", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(null);

      const result = await deleteClimateSurveyTemplate("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteClimateSurveyTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete template");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue({
        ...sampleTemplate,
        _count: { surveys: 0 },
      });
      mockPrisma.climateSurveyTemplate.delete.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await deleteClimateSurveyTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete template");
    });
  });

  // =========================================================================
  // duplicateClimateSurveyTemplate
  // =========================================================================

  describe("duplicateClimateSurveyTemplate", () => {
    it("creates a copy with (Copy) suffix and same questions", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplateWithQuestions
      );

      const copiedTemplate = {
        ...sampleTemplateWithQuestions,
        id: "template-copy-1",
        name: "Q1 Climate Survey (Copy)",
      };
      mockPrisma.climateSurveyTemplate.create.mockResolvedValue(copiedTemplate);

      const result = await duplicateClimateSurveyTemplate("template-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(copiedTemplate);
      expect(mockPrisma.climateSurveyTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Q1 Climate Survey (Copy)",
          description: sampleTemplate.description,
          companyId: "company-1",
          type: "CLIMATE",
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

    it("returns error when template not found", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(null);

      const result = await duplicateClimateSurveyTemplate("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.climateSurveyTemplate.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await duplicateClimateSurveyTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to duplicate template");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplateWithQuestions
      );
      mockPrisma.climateSurveyTemplate.create.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      const result = await duplicateClimateSurveyTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to duplicate template");
    });
  });

  // =========================================================================
  // createSurveyFromTemplate
  // =========================================================================

  describe("createSurveyFromTemplate", () => {
    it("creates survey with default values from template", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplateWithQuestions
      );
      mockPrisma.climateSurvey.create.mockResolvedValue({
        id: "survey-1",
        name: "Q1 Climate Survey",
        templateId: "template-1",
        companyId: "company-1",
        type: "CLIMATE",
        frequency: "ONCE",
        isAnonymous: true,
      });

      const result = await createSurveyFromTemplate("template-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "survey-1" });
      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Q1 Climate Survey",
          description: sampleTemplate.description,
          companyId: "company-1",
          templateId: "template-1",
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
      });
    });

    it("applies overrides when provided", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplateWithQuestions
      );
      mockPrisma.climateSurvey.create.mockResolvedValue({
        id: "survey-2",
        name: "Custom Name",
        templateId: "template-1",
        companyId: "company-1",
        type: "CLIMATE",
        frequency: "QUARTERLY",
        isAnonymous: false,
      });

      const result = await createSurveyFromTemplate("template-1", {
        name: "Custom Name",
        frequency: "QUARTERLY",
        isAnonymous: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "survey-2" });
      expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Custom Name",
          frequency: "QUARTERLY",
          isAnonymous: false,
        }),
      });
    });

    it("returns error when template not found", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(null);

      const result = await createSurveyFromTemplate("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.climateSurvey.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createSurveyFromTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create survey");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateSurveyTemplate.findFirst.mockResolvedValue(
        sampleTemplateWithQuestions
      );
      mockPrisma.climateSurvey.create.mockRejectedValue(
        new Error("DB error")
      );

      const result = await createSurveyFromTemplate("template-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create survey");
    });
  });
});
