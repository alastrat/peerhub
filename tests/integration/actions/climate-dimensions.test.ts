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
  createDimension,
  updateDimension,
  deleteDimension,
} from "@/lib/actions/climate-dimensions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleDimension = {
  id: "dim-1",
  companyId: "company-1",
  name: "Work Environment",
  description: "Physical and emotional work environment",
  icon: "building",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("climate dimension actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createDimension
  // =========================================================================

  describe("createDimension", () => {
    it("creates a dimension successfully", async () => {
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.create.mockResolvedValue(sampleDimension);

      const result = await createDimension({
        name: "Work Environment",
        description: "Physical and emotional work environment",
        icon: "building",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleDimension);
      expect(mockPrisma.climateDimension.create).toHaveBeenCalledWith({
        data: {
          companyId: "company-1",
          name: "Work Environment",
          description: "Physical and emotional work environment",
          icon: "building",
        },
      });
    });

    it("trims the name and description", async () => {
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.create.mockResolvedValue(sampleDimension);

      await createDimension({
        name: "  Work Environment  ",
        description: "  Trimmed description  ",
      });

      expect(mockPrisma.climateDimension.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Work Environment",
          description: "Trimmed description",
        }),
      });
    });

    it("returns error when name is empty", async () => {
      const result = await createDimension({ name: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.climateDimension.create).not.toHaveBeenCalled();
    });

    it("returns error when duplicate name exists (case-insensitive)", async () => {
      mockPrisma.climateDimension.findFirst.mockResolvedValue(sampleDimension);

      const result = await createDimension({ name: "work environment" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.climateDimension.create).not.toHaveBeenCalled();
    });

    it("sets description to null when not provided", async () => {
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.create.mockResolvedValue({
        ...sampleDimension,
        description: null,
        icon: null,
      });

      await createDimension({ name: "Leadership" });

      expect(mockPrisma.climateDimension.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
          icon: null,
        }),
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createDimension({ name: "Blocked" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.climateDimension.create).not.toHaveBeenCalled();
    });

    it("returns error when no session exists", async () => {
      mockSession = null;

      const result = await createDimension({ name: "No Session" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.create.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await createDimension({ name: "Failing Dimension" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
    });
  });

  // =========================================================================
  // updateDimension
  // =========================================================================

  describe("updateDimension", () => {
    it("updates a dimension successfully", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(sampleDimension);
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.update.mockResolvedValue({
        ...sampleDimension,
        name: "Updated Environment",
      });

      const result = await updateDimension({
        id: "dim-1",
        name: "Updated Environment",
        description: "Updated description",
        icon: "star",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.climateDimension.update).toHaveBeenCalledWith({
        where: { id: "dim-1" },
        data: {
          name: "Updated Environment",
          description: "Updated description",
          icon: "star",
        },
      });
    });

    it("returns error when dimension not found", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(null);

      const result = await updateDimension({
        id: "nonexistent",
        name: "Nope",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dimension not found");
      expect(mockPrisma.climateDimension.update).not.toHaveBeenCalled();
    });

    it("returns error when dimension belongs to different company", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        companyId: "other-company",
      });

      const result = await updateDimension({
        id: "dim-1",
        name: "Cross-company",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dimension not found");
      expect(mockPrisma.climateDimension.update).not.toHaveBeenCalled();
    });

    it("returns error when name is empty", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(sampleDimension);

      const result = await updateDimension({ id: "dim-1", name: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.climateDimension.update).not.toHaveBeenCalled();
    });

    it("returns error when duplicate name exists for another dimension", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(sampleDimension);
      mockPrisma.climateDimension.findFirst.mockResolvedValue({
        ...sampleDimension,
        id: "dim-2",
        name: "Leadership",
      });

      const result = await updateDimension({
        id: "dim-1",
        name: "Leadership",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.climateDimension.update).not.toHaveBeenCalled();

      // Verify duplicate check excludes current dimension
      expect(mockPrisma.climateDimension.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: "company-1",
          name: { equals: "Leadership", mode: "insensitive" },
          id: { not: "dim-1" },
        },
      });
    });

    it("trims the name and description", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(sampleDimension);
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.update.mockResolvedValue(sampleDimension);

      await updateDimension({
        id: "dim-1",
        name: "  Trimmed  ",
        description: "  Trimmed Desc  ",
      });

      expect(mockPrisma.climateDimension.update).toHaveBeenCalledWith({
        where: { id: "dim-1" },
        data: expect.objectContaining({
          name: "Trimmed",
          description: "Trimmed Desc",
        }),
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateDimension({
        id: "dim-1",
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.climateDimension.update).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(sampleDimension);
      mockPrisma.climateDimension.findFirst.mockResolvedValue(null);
      mockPrisma.climateDimension.update.mockRejectedValue(
        new Error("Update failed")
      );

      const result = await updateDimension({
        id: "dim-1",
        name: "Should Fail",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  // =========================================================================
  // deleteDimension
  // =========================================================================

  describe("deleteDimension", () => {
    it("deletes a dimension with zero questions", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        _count: { questions: 0 },
      });
      mockPrisma.climateDimension.delete.mockResolvedValue(sampleDimension);

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateDimension.delete).toHaveBeenCalledWith({
        where: { id: "dim-1" },
      });
    });

    it("returns error when dimension not found", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue(null);

      const result = await deleteDimension("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dimension not found");
      expect(mockPrisma.climateDimension.delete).not.toHaveBeenCalled();
    });

    it("returns error when dimension belongs to different company", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        companyId: "other-company",
        _count: { questions: 0 },
      });

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dimension not found");
      expect(mockPrisma.climateDimension.delete).not.toHaveBeenCalled();
    });

    it("returns error when dimension is used by questions (singular)", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        _count: { questions: 1 },
      });

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete");
      expect(result.error).toContain("1 survey question.");
      expect(mockPrisma.climateDimension.delete).not.toHaveBeenCalled();
    });

    it("returns error when dimension is used by questions (plural)", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        _count: { questions: 5 },
      });

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete");
      expect(result.error).toContain("5 survey questions.");
      expect(mockPrisma.climateDimension.delete).not.toHaveBeenCalled();
    });

    it("includes _count in findUnique query", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        _count: { questions: 0 },
      });
      mockPrisma.climateDimension.delete.mockResolvedValue(sampleDimension);

      await deleteDimension("dim-1");

      expect(mockPrisma.climateDimension.findUnique).toHaveBeenCalledWith({
        where: { id: "dim-1" },
        include: { _count: { select: { questions: true } } },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.climateDimension.delete).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.climateDimension.findUnique.mockResolvedValue({
        ...sampleDimension,
        _count: { questions: 0 },
      });
      mockPrisma.climateDimension.delete.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await deleteDimension("dim-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint");
    });
  });
});
