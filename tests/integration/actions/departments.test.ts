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
  });
});
