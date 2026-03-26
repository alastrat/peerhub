import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession, createManagerSession } from "../../helpers/mock-session";

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

vi.mock("@/lib/email/templates", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/utils", () => ({
  generateInviteToken: vi.fn(() => "mock-invite-token-abc123"),
  getExpiryDate: vi.fn(() => new Date("2026-03-19T00:00:00Z")),
}));

// Import AFTER mocks
import { inviteUser, createUser, updateUser, deleteUser } from "@/lib/actions/users";
import { sendInvitationEmail } from "@/lib/email/templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleCompanyUser = {
  id: "cu-1",
  userId: "user-1",
  companyId: "company-1",
  role: "MEMBER",
  isActive: true,
  employeeId: "emp-1",
  roleConfigId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleUser = {
  id: "user-1",
  email: "john@acme.com",
  name: "John Doe",
  image: null,
  globalRole: "USER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleEmployee = {
  id: "emp-new",
  companyId: "company-1",
  email: "john@acme.com",
  name: "John Doe",
  title: "Engineer",
  employeeCode: null,
  departmentId: null,
  managerId: null,
  hubId: null,
  startDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleInvitation = {
  id: "invite-1",
  email: "newuser@acme.com",
  companyId: "company-1",
  role: "MEMBER",
  departmentId: null,
  managerId: null,
  token: "mock-invite-token-abc123",
  expiresAt: new Date("2026-03-19T00:00:00Z"),
  acceptedAt: null,
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // inviteUser
  // =========================================================================

  describe("inviteUser", () => {
    it("creates invitation and sends email successfully", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null); // no existing user
      mockPrisma.invitation.findFirst.mockResolvedValue(null); // no pending invite
      mockPrisma.invitation.create.mockResolvedValue(sampleInvitation);
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "company-1",
        name: "Acme Corp",
      });

      const result = await inviteUser({
        email: "newuser@acme.com",
        role: "MEMBER",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ invitationId: "invite-1" });
      expect(mockPrisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "newuser@acme.com",
          companyId: "company-1",
          role: "MEMBER",
          token: "mock-invite-token-abc123",
        }),
      });
      expect(sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newuser@acme.com",
          companyName: "Acme Corp",
        })
      );
    });

    it("defaults role to MEMBER when not provided", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue(sampleInvitation);
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "company-1",
        name: "Acme Corp",
      });

      await inviteUser({ email: "newuser@acme.com" });

      expect(mockPrisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "MEMBER" }),
      });
    });

    it("returns error when user already exists in company", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);

      const result = await inviteUser({ email: "john@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists in this company");
      expect(mockPrisma.invitation.create).not.toHaveBeenCalled();
    });

    it("returns error when pending invitation exists", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.findFirst.mockResolvedValue(sampleInvitation);

      const result = await inviteUser({ email: "newuser@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("invitation is already pending");
      expect(mockPrisma.invitation.create).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await inviteUser({ email: "blocked@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("requires admin role (manager also unauthorized)", async () => {
      mockSession = createManagerSession();

      const result = await inviteUser({ email: "blocked@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await inviteUser({ email: "blocked@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("passes departmentId and managerId to invitation", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue({
        ...sampleInvitation,
        departmentId: "dept-1",
        managerId: "mgr-1",
      });
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "company-1",
        name: "Acme Corp",
      });

      await inviteUser({
        email: "newuser@acme.com",
        departmentId: "dept-1",
        managerId: "mgr-1",
      });

      expect(mockPrisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          departmentId: "dept-1",
          managerId: "mgr-1",
        }),
      });
    });

    it("handles email send failure gracefully", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue(sampleInvitation);
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "company-1",
        name: "Acme Corp",
      });
      (sendInvitationEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("SMTP error")
      );

      const result = await inviteUser({ email: "newuser@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send invitation");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyUser.findFirst.mockRejectedValue(
        new Error("DB connection lost")
      );

      const result = await inviteUser({ email: "newuser@acme.com" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send invitation");
    });
  });

  // =========================================================================
  // createUser
  // =========================================================================

  describe("createUser", () => {
    it("creates new user, employee, and companyUser when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // user doesn't exist
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null); // not in company
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-default" }); // default hub
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue({
        ...sampleCompanyUser,
        userId: "user-1",
        employeeId: "emp-new",
      });

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
        title: "Engineer",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: "john@acme.com", name: "John Doe" },
      });
      expect(mockPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: "company-1",
          email: "john@acme.com",
          name: "John Doe",
          title: "Engineer",
          hubId: "hub-default",
        }),
      });
      expect(mockPrisma.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          companyId: "company-1",
          role: "MEMBER",
          employeeId: "emp-new",
        }),
      });
    });

    it("uses existing user when found by email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleUser); // user exists
      mockPrisma.companyUser.findFirst.mockResolvedValue(null); // not in company
      mockPrisma.hub.findFirst.mockResolvedValue(null); // no default hub
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue(sampleCompanyUser);

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("returns error when user already exists in company", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists in this company");
      expect(mockPrisma.employee.create).not.toHaveBeenCalled();
    });

    it("uses provided hubId instead of default", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue(sampleCompanyUser);

      await createUser({
        email: "john@acme.com",
        name: "John Doe",
        hubId: "hub-custom",
      });

      // Should not query for default hub
      expect(mockPrisma.hub.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ hubId: "hub-custom" }),
      });
    });

    it("passes all optional fields to employee", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue(sampleCompanyUser);

      await createUser({
        email: "john@acme.com",
        name: "John Doe",
        title: "Senior Engineer",
        employeeCode: "EMP-001",
        departmentId: "dept-1",
        managerId: "mgr-1",
        startDate: "2026-01-15",
      });

      expect(mockPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Senior Engineer",
          employeeCode: "EMP-001",
          departmentId: "dept-1",
          managerId: "mgr-1",
          startDate: new Date("2026-01-15"),
        }),
      });
    });

    it("defaults role to MEMBER when not provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue(sampleCompanyUser);

      await createUser({ email: "john@acme.com", name: "John Doe" });

      expect(mockPrisma.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "MEMBER" }),
      });
    });

    it("uses provided role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.employee.create.mockResolvedValue(sampleEmployee);
      mockPrisma.companyUser.create.mockResolvedValue({
        ...sampleCompanyUser,
        role: "ADMIN",
      });

      await createUser({
        email: "john@acme.com",
        name: "John Doe",
        role: "ADMIN",
      });

      expect(mockPrisma.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "ADMIN" }),
      });
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("requires admin role (manager also unauthorized)", async () => {
      mockSession = createManagerSession();

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("DB connection lost")
      );

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create user");
    });

    it("handles employee creation failure", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sampleUser);
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.employee.create.mockRejectedValue(
        new Error("Unique constraint violation")
      );

      const result = await createUser({
        email: "john@acme.com",
        name: "John Doe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create user");
    });
  });

  // =========================================================================
  // updateUser
  // =========================================================================

  describe("updateUser", () => {
    it("updates companyUser role and isActive", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue({
        ...sampleCompanyUser,
        role: "MANAGER",
        isActive: true,
      });

      const result = await updateUser("cu-1", {
        role: "MANAGER",
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-1" },
        data: { role: "MANAGER", isActive: true },
      });
      // No employee fields, so employee.update should not be called
      expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    });

    it("updates employee fields when linked", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue(sampleCompanyUser);
      mockPrisma.employee.update.mockResolvedValue({});

      const result = await updateUser("cu-1", {
        title: "Senior Engineer",
        departmentId: "dept-2",
        managerId: "mgr-2",
        hubId: "hub-2",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: "emp-1" },
        data: {
          title: "Senior Engineer",
          departmentId: "dept-2",
          managerId: "mgr-2",
          hubId: "hub-2",
        },
      });
    });

    it("updates both companyUser and employee fields together", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue({
        ...sampleCompanyUser,
        role: "ADMIN",
      });
      mockPrisma.employee.update.mockResolvedValue({});

      const result = await updateUser("cu-1", {
        role: "ADMIN",
        title: "Director",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-1" },
        data: { role: "ADMIN" },
      });
      expect(mockPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: "emp-1" },
        data: { title: "Director" },
      });
    });

    it("skips employee update when companyUser has no employeeId", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        ...sampleCompanyUser,
        employeeId: null,
      });
      mockPrisma.companyUser.update.mockResolvedValue(sampleCompanyUser);

      const result = await updateUser("cu-1", {
        title: "Should be skipped",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    });

    it("allows setting fields to null", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue(sampleCompanyUser);
      mockPrisma.employee.update.mockResolvedValue({});

      await updateUser("cu-1", {
        title: null,
        departmentId: null,
        managerId: null,
        hubId: null,
      });

      expect(mockPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: "emp-1" },
        data: {
          title: null,
          departmentId: null,
          managerId: null,
          hubId: null,
        },
      });
    });

    it("returns error when user not found", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);

      const result = await updateUser("nonexistent", { role: "ADMIN" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
      expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await updateUser("cu-1", { role: "ADMIN" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("requires admin role (manager also unauthorized)", async () => {
      mockSession = createManagerSession();

      const result = await updateUser("cu-1", { role: "ADMIN" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await updateUser("cu-1", { role: "ADMIN" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockRejectedValue(
        new Error("DB error")
      );

      const result = await updateUser("cu-1", { role: "ADMIN" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update user");
    });

    it("handles employee update failure gracefully", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue(sampleCompanyUser);
      mockPrisma.employee.update.mockRejectedValue(
        new Error("FK constraint")
      );

      const result = await updateUser("cu-1", { title: "Failing" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update user");
    });

    it("updates companyUser with empty data when only employee fields provided", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue(sampleCompanyUser);
      mockPrisma.employee.update.mockResolvedValue({});

      await updateUser("cu-1", { title: "Engineer" });

      // companyUser.update is still called but with empty data object
      expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-1" },
        data: {},
      });
    });
  });

  // =========================================================================
  // deleteUser
  // =========================================================================

  describe("deleteUser", () => {
    it("soft deletes user by deactivating", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockResolvedValue({
        ...sampleCompanyUser,
        isActive: false,
      });

      const result = await deleteUser("cu-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-1" },
        data: { isActive: false },
      });
      // Should NOT hard-delete
      expect(mockPrisma.companyUser.delete).not.toHaveBeenCalled();
    });

    it("returns error when user not found", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);

      const result = await deleteUser("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
      expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
    });

    it("requires admin role", async () => {
      mockSession = createMemberSession();

      const result = await deleteUser("cu-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("requires admin role (manager also unauthorized)", async () => {
      mockSession = createManagerSession();

      const result = await deleteUser("cu-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when session is null", async () => {
      mockSession = null;

      const result = await deleteUser("cu-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);
      mockPrisma.companyUser.update.mockRejectedValue(
        new Error("DB connection lost")
      );

      const result = await deleteUser("cu-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete user");
    });
  });
});
