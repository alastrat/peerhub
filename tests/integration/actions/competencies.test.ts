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
  createCompetency,
  updateCompetency,
  deleteCompetency,
} from "@/lib/actions/competencies";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleCompetency = {
  id: "comp-1",
  companyId: "company-1",
  name: "Leadership",
  description: "Ability to lead teams",
  category: "MANAGEMENT",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("competency actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createCompetency
  // =========================================================================

  describe("createCompetency", () => {
    it("creates a competency successfully", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.create.mockResolvedValue(sampleCompetency);

      const result = await createCompetency({
        name: "Leadership",
        description: "Ability to lead teams",
        category: "MANAGEMENT",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleCompetency);
      expect(mockPrisma.competency.create).toHaveBeenCalledWith({
        data: {
          companyId: "company-1",
          name: "Leadership",
          description: "Ability to lead teams",
          category: "MANAGEMENT",
        },
      });
    });

    it("trims name and description", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.create.mockResolvedValue(sampleCompetency);

      await createCompetency({
        name: "  Leadership  ",
        description: "  Ability to lead teams  ",
        category: "MANAGEMENT",
      });

      expect(mockPrisma.competency.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Leadership",
          description: "Ability to lead teams",
        }),
      });
    });

    it("returns error when name is empty", async () => {
      const result = await createCompetency({
        name: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Name is required");
      expect(mockPrisma.competency.create).not.toHaveBeenCalled();
    });

    it("returns error when a competency with the same name already exists", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(sampleCompetency);

      const result = await createCompetency({
        name: "Leadership",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.competency.create).not.toHaveBeenCalled();
    });

    it("checks for duplicate name case-insensitively", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.create.mockResolvedValue(sampleCompetency);

      await createCompetency({ name: "Leadership" });

      expect(mockPrisma.competency.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: "company-1",
          name: { equals: "Leadership", mode: "insensitive" },
        },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createCompetency({
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.competency.create).not.toHaveBeenCalled();
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await createCompetency({
        name: "No Session",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("sets description to null when not provided", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.create.mockResolvedValue({
        ...sampleCompetency,
        description: null,
        category: null,
      });

      await createCompetency({ name: "Leadership" });

      expect(mockPrisma.competency.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
          category: null,
        }),
      });
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.create.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await createCompetency({
        name: "Failing",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
    });
  });

  // =========================================================================
  // updateCompetency
  // =========================================================================

  describe("updateCompetency", () => {
    it("updates a competency successfully", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(sampleCompetency);
      mockPrisma.competency.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.competency.update.mockResolvedValue({
        ...sampleCompetency,
        name: "Updated Leadership",
      });

      const result = await updateCompetency({
        id: "comp-1",
        name: "Updated Leadership",
        description: "Updated description",
        category: "MANAGEMENT",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.competency.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: {
          name: "Updated Leadership",
          description: "Updated description",
          category: "MANAGEMENT",
        },
      });
    });

    it("returns error when competency not found", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(null);

      const result = await updateCompetency({
        id: "nonexistent",
        name: "Doesn't Matter",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.competency.update).not.toHaveBeenCalled();
    });

    it("returns error when competency belongs to different company", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        companyId: "other-company",
      });

      const result = await updateCompetency({
        id: "comp-1",
        name: "Hijack",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.competency.update).not.toHaveBeenCalled();
    });

    it("returns error when name is empty", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(sampleCompetency);

      const result = await updateCompetency({
        id: "comp-1",
        name: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Name is required");
      expect(mockPrisma.competency.update).not.toHaveBeenCalled();
    });

    it("returns error when duplicate name exists (excluding self)", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(sampleCompetency);
      mockPrisma.competency.findFirst.mockResolvedValue({
        ...sampleCompetency,
        id: "comp-other",
        name: "Communication",
      });

      const result = await updateCompetency({
        id: "comp-1",
        name: "Communication",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.competency.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: "company-1",
          name: { equals: "Communication", mode: "insensitive" },
          id: { not: "comp-1" },
        },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateCompetency({
        id: "comp-1",
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(sampleCompetency);
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.update.mockRejectedValue(
        new Error("DB write failed")
      );

      const result = await updateCompetency({
        id: "comp-1",
        name: "Failing",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB write failed");
    });

    it("trims name before saving", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(sampleCompetency);
      mockPrisma.competency.findFirst.mockResolvedValue(null);
      mockPrisma.competency.update.mockResolvedValue(sampleCompetency);

      await updateCompetency({
        id: "comp-1",
        name: "  Trimmed  ",
      });

      expect(mockPrisma.competency.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: expect.objectContaining({ name: "Trimmed" }),
      });
    });
  });

  // =========================================================================
  // deleteCompetency
  // =========================================================================

  describe("deleteCompetency", () => {
    it("deletes a competency with no associated questions", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        _count: { questions: 0 },
      });
      mockPrisma.competency.delete.mockResolvedValue(sampleCompetency);

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.competency.delete).toHaveBeenCalledWith({
        where: { id: "comp-1" },
      });
    });

    it("returns error when competency is used by template questions", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        _count: { questions: 3 },
      });

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete");
      expect(result.error).toContain("3 template questions");
      expect(mockPrisma.competency.delete).not.toHaveBeenCalled();
    });

    it("uses singular 'question' when count is 1", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        _count: { questions: 1 },
      });

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("1 template question.");
      // Should NOT contain plural "questions."
      expect(result.error).not.toMatch(/1 template questions/);
    });

    it("returns error when competency not found", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue(null);

      const result = await deleteCompetency("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.competency.delete).not.toHaveBeenCalled();
    });

    it("returns error when competency belongs to different company", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        companyId: "other-company",
        _count: { questions: 0 },
      });

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.competency.delete).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("includes question count in findUnique call", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        _count: { questions: 0 },
      });
      mockPrisma.competency.delete.mockResolvedValue(sampleCompetency);

      await deleteCompetency("comp-1");

      expect(mockPrisma.competency.findUnique).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        include: { _count: { select: { questions: true } } },
      });
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.competency.findUnique.mockResolvedValue({
        ...sampleCompetency,
        _count: { questions: 0 },
      });
      mockPrisma.competency.delete.mockRejectedValue(
        new Error("FK constraint violation")
      );

      const result = await deleteCompetency("comp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint violation");
    });
  });
});
