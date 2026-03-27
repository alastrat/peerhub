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

// Import AFTER mocks
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "@/lib/actions/templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleSectionInput = {
  title: "Self Assessment",
  description: "Evaluate your own performance",
  order: 1,
  reviewerTypes: ["SELF" as const],
  questions: [
    {
      text: "How do you rate your communication skills?",
      description: "Consider verbal and written communication",
      type: "RATING" as const,
      isRequired: true,
      order: 1,
      competencyId: "comp-1",
    },
    {
      text: "What areas would you like to improve?",
      type: "TEXT" as const,
      isRequired: false,
      order: 2,
    },
  ],
};

const sampleTemplate = {
  id: "tmpl-1",
  name: "Annual 360 Review",
  description: "Comprehensive annual review template",
  companyId: "company-1",
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleTemplateWithSections = {
  ...sampleTemplate,
  sections: [
    {
      id: "sec-1",
      templateId: "tmpl-1",
      title: "Self Assessment",
      description: "Evaluate your own performance",
      order: 1,
      reviewerTypes: ["SELF"],
      questions: [
        {
          id: "q-1",
          sectionId: "sec-1",
          text: "How do you rate your communication skills?",
          description: "Consider verbal and written communication",
          type: "RATING",
          isRequired: true,
          order: 1,
          config: null,
          competencyId: "comp-1",
        },
        {
          id: "q-2",
          sectionId: "sec-1",
          text: "What areas would you like to improve?",
          description: null,
          type: "TEXT",
          isRequired: false,
          order: 2,
          config: null,
          competencyId: null,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("template actions (360°)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createTemplate
  // =========================================================================

  describe("createTemplate", () => {
    it("creates template with nested sections and questions", async () => {
      mockPrisma.template.create.mockResolvedValue(sampleTemplateWithSections);

      const result = await createTemplate({
        name: "Annual 360 Review",
        description: "Comprehensive annual review template",
        sections: [sampleSectionInput],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleTemplateWithSections);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: {
          name: "Annual 360 Review",
          description: "Comprehensive annual review template",
          companyId: "company-1",
          sections: {
            create: [
              expect.objectContaining({
                title: "Self Assessment",
                description: "Evaluate your own performance",
                order: 1,
                reviewerTypes: ["SELF"],
                questions: {
                  create: [
                    expect.objectContaining({
                      text: "How do you rate your communication skills?",
                      type: "RATING",
                      isRequired: true,
                      order: 1,
                      competencyId: "comp-1",
                    }),
                    expect.objectContaining({
                      text: "What areas would you like to improve?",
                      type: "TEXT",
                      isRequired: false,
                      order: 2,
                      competencyId: null,
                    }),
                  ],
                },
              }),
            ],
          },
        },
        include: {
          sections: {
            include: { questions: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("creates template without description", async () => {
      mockPrisma.template.create.mockResolvedValue({
        ...sampleTemplateWithSections,
        description: undefined,
      });

      const result = await createTemplate({
        name: "Minimal Template",
        sections: [sampleSectionInput],
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.template.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Minimal Template",
            description: undefined,
          }),
        })
      );
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createTemplate({
        name: "Blocked Template",
        sections: [sampleSectionInput],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.template.create).not.toHaveBeenCalled();
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await createTemplate({
        name: "No Session",
        sections: [sampleSectionInput],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.template.create.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await createTemplate({
        name: "Failing Template",
        sections: [sampleSectionInput],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create template");
    });

    it("passes question config as InputJsonValue", async () => {
      const sectionWithConfig = {
        ...sampleSectionInput,
        questions: [
          {
            text: "Rate from 1 to 5",
            type: "RATING" as const,
            isRequired: true,
            order: 1,
            config: { min: 1, max: 5, labels: ["Poor", "Excellent"] },
          },
        ],
      };

      mockPrisma.template.create.mockResolvedValue(sampleTemplateWithSections);

      await createTemplate({
        name: "Config Template",
        sections: [sectionWithConfig],
      });

      expect(mockPrisma.template.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sections: {
              create: [
                expect.objectContaining({
                  questions: {
                    create: [
                      expect.objectContaining({
                        config: { min: 1, max: 5, labels: ["Poor", "Excellent"] },
                      }),
                    ],
                  },
                }),
              ],
            },
          }),
        })
      );
    });
  });

  // =========================================================================
  // updateTemplate
  // =========================================================================

  describe("updateTemplate", () => {
    it("updates template name and description without sections", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.template.update.mockResolvedValue({
        ...sampleTemplateWithSections,
        name: "Renamed Template",
      });

      const result = await updateTemplate("tmpl-1", {
        name: "Renamed Template",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Renamed Template");
      // Should NOT delete sections when none are provided
      expect(mockPrisma.templateSection.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: "tmpl-1" },
        data: {
          name: "Renamed Template",
          description: undefined,
        },
        include: {
          sections: {
            include: { questions: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("replaces sections when provided", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.templateSection.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.template.update.mockResolvedValue(sampleTemplateWithSections);

      const newSection = {
        title: "Peer Review",
        description: "Review by peers",
        order: 1,
        reviewerTypes: ["PEER" as const],
        questions: [
          {
            text: "How well does this person collaborate?",
            type: "RATING" as const,
            isRequired: true,
            order: 1,
          },
        ],
      };

      const result = await updateTemplate("tmpl-1", {
        name: "Updated Template",
        sections: [newSection],
      });

      expect(result.success).toBe(true);
      // Sections should be deleted before recreating
      expect(mockPrisma.templateSection.deleteMany).toHaveBeenCalledWith({
        where: { templateId: "tmpl-1" },
      });
      expect(mockPrisma.template.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Updated Template",
            sections: {
              create: [
                expect.objectContaining({
                  title: "Peer Review",
                  reviewerTypes: ["PEER"],
                  questions: {
                    create: [
                      expect.objectContaining({
                        text: "How well does this person collaborate?",
                        type: "RATING",
                        competencyId: null,
                      }),
                    ],
                  },
                }),
              ],
            },
          }),
        })
      );
    });

    it("returns error when template not found", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      const result = await updateTemplate("nonexistent", {
        name: "Nope",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.template.update).not.toHaveBeenCalled();
    });

    it("scopes lookup to current company", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await updateTemplate("tmpl-1", { name: "Test" });

      expect(mockPrisma.template.findFirst).toHaveBeenCalledWith({
        where: { id: "tmpl-1", companyId: "company-1" },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateTemplate("tmpl-1", {
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.template.findFirst).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.template.update.mockRejectedValue(
        new Error("Update failed")
      );

      const result = await updateTemplate("tmpl-1", {
        name: "Should Fail",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update template");
    });
  });

  // =========================================================================
  // deleteTemplate
  // =========================================================================

  describe("deleteTemplate", () => {
    it("hard deletes template when no cycles reference it", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.cycle.count.mockResolvedValue(0);
      mockPrisma.template.delete.mockResolvedValue(sampleTemplate);

      const result = await deleteTemplate("tmpl-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.template.delete).toHaveBeenCalledWith({
        where: { id: "tmpl-1" },
      });
      expect(mockPrisma.template.update).not.toHaveBeenCalled();
    });

    it("archives template when cycles reference it", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.cycle.count.mockResolvedValue(3);
      mockPrisma.template.update.mockResolvedValue({
        ...sampleTemplate,
        isArchived: true,
      });

      const result = await deleteTemplate("tmpl-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: "tmpl-1" },
        data: { isArchived: true },
      });
      expect(mockPrisma.template.delete).not.toHaveBeenCalled();
    });

    it("checks cycle count with correct templateId", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.cycle.count.mockResolvedValue(0);
      mockPrisma.template.delete.mockResolvedValue(sampleTemplate);

      await deleteTemplate("tmpl-1");

      expect(mockPrisma.cycle.count).toHaveBeenCalledWith({
        where: { templateId: "tmpl-1" },
      });
    });

    it("returns error when template not found", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      const result = await deleteTemplate("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.cycle.count).not.toHaveBeenCalled();
      expect(mockPrisma.template.delete).not.toHaveBeenCalled();
    });

    it("scopes lookup to current company", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await deleteTemplate("tmpl-1");

      expect(mockPrisma.template.findFirst).toHaveBeenCalledWith({
        where: { id: "tmpl-1", companyId: "company-1" },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteTemplate("tmpl-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.template.findFirst).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(sampleTemplate);
      mockPrisma.cycle.count.mockResolvedValue(0);
      mockPrisma.template.delete.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await deleteTemplate("tmpl-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete template");
    });
  });

  // =========================================================================
  // duplicateTemplate
  // =========================================================================

  describe("duplicateTemplate", () => {
    it("creates a copy with (Copy) suffix and same structure", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(
        sampleTemplateWithSections
      );

      const copiedTemplate = {
        ...sampleTemplateWithSections,
        id: "tmpl-copy-1",
        name: "Annual 360 Review (Copy)",
      };
      mockPrisma.template.create.mockResolvedValue(copiedTemplate);

      const result = await duplicateTemplate("tmpl-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(copiedTemplate);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Annual 360 Review (Copy)",
          description: sampleTemplate.description,
          companyId: "company-1",
          sections: {
            create: [
              expect.objectContaining({
                title: "Self Assessment",
                description: "Evaluate your own performance",
                order: 1,
                reviewerTypes: ["SELF"],
                questions: {
                  create: [
                    expect.objectContaining({
                      text: "How do you rate your communication skills?",
                      type: "RATING",
                      isRequired: true,
                      order: 1,
                      competencyId: "comp-1",
                    }),
                    expect.objectContaining({
                      text: "What areas would you like to improve?",
                      type: "TEXT",
                      isRequired: false,
                      order: 2,
                      competencyId: null,
                    }),
                  ],
                },
              }),
            ],
          },
        }),
        include: {
          sections: {
            include: { questions: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("fetches original template with sections and questions", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(
        sampleTemplateWithSections
      );
      mockPrisma.template.create.mockResolvedValue(sampleTemplateWithSections);

      await duplicateTemplate("tmpl-1");

      expect(mockPrisma.template.findFirst).toHaveBeenCalledWith({
        where: { id: "tmpl-1", companyId: "company-1" },
        include: {
          sections: {
            include: { questions: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("returns error when template not found", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      const result = await duplicateTemplate("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.template.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await duplicateTemplate("tmpl-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.template.findFirst).not.toHaveBeenCalled();
    });

    it("handles database errors on create gracefully", async () => {
      mockPrisma.template.findFirst.mockResolvedValue(
        sampleTemplateWithSections
      );
      mockPrisma.template.create.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      const result = await duplicateTemplate("tmpl-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to duplicate template");
    });

    it("handles database errors on findFirst gracefully", async () => {
      mockPrisma.template.findFirst.mockRejectedValue(
        new Error("Connection lost")
      );

      const result = await duplicateTemplate("tmpl-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to duplicate template");
    });
  });
});
