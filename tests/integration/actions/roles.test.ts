import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createMemberSession,
  createSuperAdminSession,
} from "../../helpers/mock-session";

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
  ensureSystemRoles,
  getCompanyRoles,
  createRole,
  updateRolePermissions,
  updateRoleDetails,
  deleteRole,
} from "@/lib/actions/roles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleSystemRole = {
  id: "role-admin",
  companyId: "company-1",
  slug: "admin",
  name: "Admin",
  description: "Full access",
  baseRole: "ADMIN",
  isSystem: true,
  permissions: { "company.settings": "write", "company.roles": "write" },
  color: "#7c3aed",
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleCustomRole = {
  id: "role-custom-1",
  companyId: "company-1",
  slug: "team-lead",
  name: "Team Lead",
  description: "Custom team lead role",
  baseRole: null,
  isSystem: false,
  permissions: { "company.settings": "off", "company.roles": "off" },
  color: "#6b7280",
  order: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("role actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // ensureSystemRoles
  // =========================================================================

  describe("ensureSystemRoles", () => {
    it("creates missing system roles", async () => {
      // No existing roles
      mockPrisma.companyRoleConfig.findMany.mockResolvedValue([]);
      mockPrisma.companyRoleConfig.create.mockResolvedValue({});

      await ensureSystemRoles("company-1");

      // Should create admin, manager, employee (3 system roles)
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledTimes(3);

      // Verify admin role was created with correct baseRole
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "company-1",
            slug: "admin",
            baseRole: "ADMIN",
            isSystem: true,
            order: 0,
          }),
        })
      );

      // Verify manager role
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "manager",
            baseRole: "MANAGER",
            isSystem: true,
            order: 1,
          }),
        })
      );

      // Verify employee role
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "employee",
            baseRole: "MEMBER",
            isSystem: true,
            order: 2,
          }),
        })
      );
    });

    it("skips roles that already exist", async () => {
      mockPrisma.companyRoleConfig.findMany.mockResolvedValue([
        { slug: "admin" },
        { slug: "manager" },
      ]);
      mockPrisma.companyRoleConfig.create.mockResolvedValue({});

      await ensureSystemRoles("company-1");

      // Only employee should be created
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "employee" }),
        })
      );
    });

    it("does nothing when all system roles exist", async () => {
      mockPrisma.companyRoleConfig.findMany.mockResolvedValue([
        { slug: "admin" },
        { slug: "manager" },
        { slug: "employee" },
      ]);

      await ensureSystemRoles("company-1");

      expect(mockPrisma.companyRoleConfig.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getCompanyRoles
  // =========================================================================

  describe("getCompanyRoles", () => {
    it("returns roles with combined member counts", async () => {
      // ensureSystemRoles call
      mockPrisma.companyRoleConfig.findMany.mockResolvedValueOnce([
        { slug: "admin" },
        { slug: "manager" },
        { slug: "employee" },
      ]);

      // Main findMany call
      mockPrisma.companyRoleConfig.findMany.mockResolvedValueOnce([
        { ...sampleSystemRole, _count: { members: 2 } },
        { ...sampleCustomRole, _count: { members: 1 } },
      ]);

      // groupBy for unassigned counts
      mockPrisma.companyUser.groupBy.mockResolvedValue([
        { role: "ADMIN", _count: 3 },
      ]);

      const result = await getCompanyRoles("company-1");

      expect(result).toHaveLength(2);
      // System admin role: 2 direct members + 3 unassigned ADMIN = 5
      expect(result[0]._count.members).toBe(5);
      // Custom role: 1 member, no unassigned
      expect(result[1]._count.members).toBe(1);
    });

    it("returns zero unassigned when none exist", async () => {
      mockPrisma.companyRoleConfig.findMany.mockResolvedValueOnce([
        { slug: "admin" },
        { slug: "manager" },
        { slug: "employee" },
      ]);

      mockPrisma.companyRoleConfig.findMany.mockResolvedValueOnce([
        { ...sampleSystemRole, _count: { members: 2 } },
      ]);

      mockPrisma.companyUser.groupBy.mockResolvedValue([]);

      const result = await getCompanyRoles("company-1");

      expect(result[0]._count.members).toBe(2);
    });
  });

  // =========================================================================
  // createRole
  // =========================================================================

  describe("createRole", () => {
    it("creates a custom role with default permissions", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({
        id: "role-new",
      });

      const result = await createRole({ name: "Team Lead" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "role-new" });
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "company-1",
            slug: "team-lead",
            name: "Team Lead",
            isSystem: false,
            baseRole: null,
            order: 3,
          }),
        })
      );
    });

    it("clones permissions from another role", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce(null) // slug uniqueness check
        .mockResolvedValueOnce({
          // source role for cloning
          id: "role-source",
          companyId: "company-1",
          permissions: { "company.settings": "read", "cycles.manage": "write" },
        });
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({
        id: "role-cloned",
      });

      const result = await createRole({
        name: "Cloned Role",
        cloneFromId: "role-source",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permissions: {
              "company.settings": "read",
              "cycles.manage": "write",
            },
          }),
        })
      );
    });

    it("returns error when slug already exists", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        id: "existing-role",
      });

      const result = await createRole({ name: "Team Lead" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.companyRoleConfig.create).not.toHaveBeenCalled();
    });

    it("returns error for invalid role name (empty slug)", async () => {
      const result = await createRole({ name: "!@#$%^" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid role name");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createRole({ name: "Blocked" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("uses default color when none provided", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({ id: "role-x" });

      await createRole({ name: "No Color" });

      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ color: "#6b7280" }),
        })
      );
    });

    it("uses provided color", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({ id: "role-x" });

      await createRole({ name: "Custom Color", color: "#ff0000" });

      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ color: "#ff0000" }),
        })
      );
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrisma.companyRoleConfig.create.mockRejectedValue(
        new Error("DB error")
      );

      const result = await createRole({ name: "Failing Role" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });

    it("does not clone permissions from role in different company", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({
          // source role in different company
          id: "role-other",
          companyId: "other-company",
          permissions: { "company.settings": "write" },
        });
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({ id: "role-new" });

      await createRole({ name: "No Clone", cloneFromId: "role-other" });

      // Should get default "off" permissions, not the cloned ones
      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permissions: expect.not.objectContaining({
              "company.settings": "write",
            }),
          }),
        })
      );
    });

    it("handles null max order", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);
      mockPrisma.companyRoleConfig.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      mockPrisma.companyRoleConfig.create.mockResolvedValue({ id: "role-first" });

      await createRole({ name: "First Role" });

      expect(mockPrisma.companyRoleConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 1 }),
        })
      );
    });
  });

  // =========================================================================
  // updateRolePermissions
  // =========================================================================

  describe("updateRolePermissions", () => {
    it("updates permissions for a custom role", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      const result = await updateRolePermissions({
        roleId: "role-custom-1",
        permissions: { "company.settings": "read", "cycles.manage": "write" },
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
        data: {
          permissions: {
            "company.settings": "read",
            "cycles.manage": "write",
          },
        },
      });
    });

    it("filters out invalid permission keys and levels", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      const result = await updateRolePermissions({
        roleId: "role-custom-1",
        permissions: {
          "company.settings": "read",
          "invalid.key": "write",
          "cycles.manage": "invalid-level",
        } as Record<string, string>,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
        data: {
          permissions: { "company.settings": "read" },
        },
      });
    });

    it("returns error when role not found", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);

      const result = await updateRolePermissions({
        roleId: "nonexistent",
        permissions: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Role not found");
    });

    it("returns error when role belongs to different company", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        ...sampleCustomRole,
        companyId: "other-company",
      });

      const result = await updateRolePermissions({
        roleId: "role-custom-1",
        permissions: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not belong to this company");
    });

    it("prevents non-super-admin from editing system roles", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleSystemRole);

      const result = await updateRolePermissions({
        roleId: "role-admin",
        permissions: { "company.settings": "off" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only super admins can edit system roles");
    });

    it("allows super admin to edit system roles", async () => {
      mockSession = createSuperAdminSession();
      // Super admin session has companyUser: null, so requireCompanyAdmin needs a companyId
      // The requireCompanyAdmin function checks session.companyUser?.companyId
      // Since super admin has companyUser null, it will throw "No active company"
      // Let's create a super admin with company context
      mockSession = {
        user: {
          id: "super-admin-user",
          email: "superadmin@kultiva.com",
          name: "Super Admin",
          image: null,
          globalRole: "SUPER_ADMIN",
        },
        companyUser: {
          id: "cu-sa",
          companyId: "company-1",
          companyName: "Acme Corp",
          companySlug: "acme-corp",
          role: "ADMIN",
          employeeId: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as ReturnType<typeof createAdminSession>;

      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleSystemRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      const result = await updateRolePermissions({
        roleId: "role-admin",
        permissions: { "company.settings": "read" },
      });

      expect(result.success).toBe(true);
    });

    it("forces company.roles=write on admin system role", async () => {
      // Super admin with company context
      mockSession = {
        user: {
          id: "super-admin-user",
          email: "superadmin@kultiva.com",
          name: "Super Admin",
          image: null,
          globalRole: "SUPER_ADMIN",
        },
        companyUser: {
          id: "cu-sa",
          companyId: "company-1",
          companyName: "Acme Corp",
          companySlug: "acme-corp",
          role: "ADMIN",
          employeeId: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as ReturnType<typeof createAdminSession>;

      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        ...sampleSystemRole,
        baseRole: "ADMIN",
      });
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      await updateRolePermissions({
        roleId: "role-admin",
        permissions: { "company.roles": "off", "company.settings": "read" },
      });

      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-admin" },
        data: {
          permissions: expect.objectContaining({
            "company.roles": "write",
            "company.settings": "read",
          }),
        },
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateRolePermissions({
        roleId: "role-custom-1",
        permissions: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockRejectedValue(
        new Error("DB error")
      );

      const result = await updateRolePermissions({
        roleId: "role-custom-1",
        permissions: { "company.settings": "read" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // =========================================================================
  // updateRoleDetails
  // =========================================================================

  describe("updateRoleDetails", () => {
    it("updates name, description, and color", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      const result = await updateRoleDetails({
        roleId: "role-custom-1",
        name: " Updated Name ",
        description: " New Description ",
        color: "#ff0000",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
        data: {
          name: "Updated Name",
          description: "New Description",
          color: "#ff0000",
        },
      });
    });

    it("updates only provided fields", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      const result = await updateRoleDetails({
        roleId: "role-custom-1",
        name: "Only Name",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
        data: { name: "Only Name" },
      });
    });

    it("sets description to null when empty string", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockResolvedValue({});

      await updateRoleDetails({
        roleId: "role-custom-1",
        description: "   ",
      });

      expect(mockPrisma.companyRoleConfig.update).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
        data: { description: null },
      });
    });

    it("returns error when role not found", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);

      const result = await updateRoleDetails({
        roleId: "nonexistent",
        name: "Nope",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Role not found");
    });

    it("returns error when role belongs to different company", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        ...sampleCustomRole,
        companyId: "other-company",
      });

      const result = await updateRoleDetails({
        roleId: "role-custom-1",
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not belong to this company");
    });

    it("prevents non-super-admin from editing system roles", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleSystemRole);

      const result = await updateRoleDetails({
        roleId: "role-admin",
        name: "Renamed Admin",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only super admins can edit system roles");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateRoleDetails({
        roleId: "role-custom-1",
        name: "Blocked",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(sampleCustomRole);
      mockPrisma.companyRoleConfig.update.mockRejectedValue(
        new Error("DB error")
      );

      const result = await updateRoleDetails({
        roleId: "role-custom-1",
        name: "Failing",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // =========================================================================
  // deleteRole
  // =========================================================================

  describe("deleteRole", () => {
    it("deletes role and reassigns members to target role", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 3 },
        })
        .mockResolvedValueOnce({
          id: "role-target",
          companyId: "company-1",
          baseRole: "MEMBER",
        });
      mockPrisma.companyUser.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.companyRoleConfig.delete.mockResolvedValue({});

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyUser.updateMany).toHaveBeenCalledWith({
        where: { roleConfigId: "role-custom-1" },
        data: { roleConfigId: "role-target", role: "MEMBER" },
      });
      expect(mockPrisma.companyRoleConfig.delete).toHaveBeenCalledWith({
        where: { id: "role-custom-1" },
      });
    });

    it("deletes role without reassigning when no members", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 0 },
        })
        .mockResolvedValueOnce({
          id: "role-target",
          companyId: "company-1",
          baseRole: "MEMBER",
        });
      mockPrisma.companyRoleConfig.delete.mockResolvedValue({});

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyUser.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.companyRoleConfig.delete).toHaveBeenCalled();
    });

    it("returns error when trying to delete a system role", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        ...sampleSystemRole,
        _count: { members: 5 },
      });

      const result = await deleteRole({
        roleId: "role-admin",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete system roles");
      expect(mockPrisma.companyRoleConfig.delete).not.toHaveBeenCalled();
    });

    it("returns error when role not found", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue(null);

      const result = await deleteRole({
        roleId: "nonexistent",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Role not found");
    });

    it("returns error when role belongs to different company", async () => {
      mockPrisma.companyRoleConfig.findUnique.mockResolvedValue({
        ...sampleCustomRole,
        companyId: "other-company",
        _count: { members: 0 },
      });

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not belong to this company");
    });

    it("returns error when target role not found", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 1 },
        })
        .mockResolvedValueOnce(null); // target not found

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Target role not found");
    });

    it("returns error when target role belongs to different company", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 1 },
        })
        .mockResolvedValueOnce({
          id: "role-target",
          companyId: "other-company",
        });

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Target role not found");
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 0 },
        })
        .mockResolvedValueOnce({
          id: "role-target",
          companyId: "company-1",
          baseRole: "MEMBER",
        });
      mockPrisma.companyRoleConfig.delete.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-target",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint");
    });

    it("uses target baseRole or defaults to MEMBER for reassignment", async () => {
      mockPrisma.companyRoleConfig.findUnique
        .mockResolvedValueOnce({
          ...sampleCustomRole,
          _count: { members: 2 },
        })
        .mockResolvedValueOnce({
          id: "role-manager-target",
          companyId: "company-1",
          baseRole: "MANAGER",
        });
      mockPrisma.companyUser.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.companyRoleConfig.delete.mockResolvedValue({});

      await deleteRole({
        roleId: "role-custom-1",
        reassignToId: "role-manager-target",
      });

      expect(mockPrisma.companyUser.updateMany).toHaveBeenCalledWith({
        where: { roleConfigId: "role-custom-1" },
        data: { roleConfigId: "role-manager-target", role: "MANAGER" },
      });
    });
  });
});
