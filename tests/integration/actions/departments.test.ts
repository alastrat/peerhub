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

import { createDepartment, updateDepartment, deleteDepartment } from "@/lib/actions/departments";

describe("department actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  describe("createDepartment", () => {
    it("creates department successfully", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });

      const result = await createDepartment({ name: "Engineering" });

      expect(result.success).toBe(true);
      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Engineering",
          companyId: "company-1",
        }),
      });
    });

    it("prevents duplicate department names (case-insensitive)", async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
      });

      const result = await createDepartment({ name: "engineering" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createDepartment({ name: "New Dept" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("returns error when name is empty or whitespace", async () => {
      const result = await createDepartment({ name: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.department.create).not.toHaveBeenCalled();
    });

    it("validates parent department exists and belongs to company", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.department.findUnique.mockResolvedValue(null); // parent not found

      const result = await createDepartment({
        name: "Sub-dept",
        parentId: "nonexistent-parent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Parent department not found");
      expect(mockPrisma.department.create).not.toHaveBeenCalled();
    });

    it("rejects parent from a different company", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "parent-dept",
        companyId: "other-company", // different company
      });

      const result = await createDepartment({
        name: "Sub-dept",
        parentId: "parent-dept",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Parent department not found");
    });

    it("creates department with valid parent", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "parent-dept",
        companyId: "company-1",
      });
      mockPrisma.department.create.mockResolvedValue({
        id: "dept-child",
        name: "Sub-team",
        companyId: "company-1",
        parentId: "parent-dept",
      });

      const result = await createDepartment({
        name: "Sub-team",
        parentId: "parent-dept",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: "parent-dept",
        }),
      });
    });

    it("trims description", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue({
        id: "dept-1",
        name: "HR",
        companyId: "company-1",
      });

      await createDepartment({
        name: "HR",
        description: "  Human Resources  ",
      });

      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: "Human Resources",
        }),
      });
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.create.mockRejectedValue(new Error("DB error"));

      const result = await createDepartment({ name: "Failing" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });

    it("returns error when unauthenticated", async () => {
      mockSession = null;

      const result = await createDepartment({ name: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });

  describe("updateDepartment", () => {
    it("updates department name", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });
      mockPrisma.department.findFirst.mockResolvedValue(null); // No duplicate
      mockPrisma.department.update.mockResolvedValue({
        id: "dept-1",
        name: "Engineering Team",
      });

      const result = await updateDepartment({
        id: "dept-1",
        name: "Engineering Team",
      });

      expect(result.success).toBe(true);
    });

    it("prevents circular parent reference", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });
      mockPrisma.department.findFirst.mockResolvedValue(null);

      const result = await updateDepartment({
        id: "dept-1",
        name: "Engineering",
        parentId: "dept-1", // Self-reference
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("own parent");
    });

    it("returns error when department not found", async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      const result = await updateDepartment({
        id: "nonexistent",
        name: "Anything",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Department not found");
    });

    it("returns error when department belongs to different company", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Other",
        companyId: "other-company",
      });

      const result = await updateDepartment({
        id: "dept-1",
        name: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Department not found");
    });

    it("returns error when name is empty", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });

      const result = await updateDepartment({
        id: "dept-1",
        name: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
    });

    it("prevents duplicate name on update", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });
      mockPrisma.department.findFirst.mockResolvedValue({
        id: "dept-2",
        name: "Sales",
      });

      const result = await updateDepartment({
        id: "dept-1",
        name: "Sales",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateDepartment({
        id: "dept-1",
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        name: "Engineering",
        companyId: "company-1",
      });
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.update.mockRejectedValue(new Error("DB error"));

      const result = await updateDepartment({
        id: "dept-1",
        name: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  describe("deleteDepartment", () => {
    it("deletes department with no employees", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 0, children: 0 },
      });
      mockPrisma.department.delete.mockResolvedValue({});

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.department.delete).toHaveBeenCalledWith({
        where: { id: "dept-1" },
      });
    });

    it("prevents deleting department with employees", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 5, children: 0 },
      });

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("employee");
    });

    it("prevents deleting department with sub-departments", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 0, children: 2 },
      });

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("sub-department");
    });

    it("returns error when department not found", async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      const result = await deleteDepartment("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Department not found");
      expect(mockPrisma.department.delete).not.toHaveBeenCalled();
    });

    it("returns error when department belongs to different company", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "other-company",
        _count: { employees: 0, children: 0 },
      });

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Department not found");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("uses correct plural for single employee", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 1, children: 0 },
      });

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot delete: 1 employee still assigned");
    });

    it("uses correct plural for single sub-department", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 0, children: 1 },
      });

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot delete: has 1 sub-department");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: "dept-1",
        companyId: "company-1",
        _count: { employees: 0, children: 0 },
      });
      mockPrisma.department.delete.mockRejectedValue(new Error("FK constraint"));

      const result = await deleteDepartment("dept-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint");
    });
  });
});
