import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createMemberSession,
  createSuperAdminSession,
  createUnauthenticatedSession,
} from "../../helpers/mock-session";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createSuperAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/validations/platform", () => ({
  domainSchema: { parse: vi.fn((v: string) => v) },
  updateGlobalRoleSchema: { parse: vi.fn((v: unknown) => v) },
  createPlatformCompanySchema: { parse: vi.fn((v: unknown) => v) },
}));

vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

// Import AFTER mocks
import {
  addSuperAdminDomain,
  removeSuperAdminDomain,
  updateUserGlobalRole,
  deletePlatformUser,
  createPlatformCompany,
  deletePlatformCompany,
  updateCompanyDomain,
  inviteMember,
  updateMemberRole,
  toggleMemberActive,
  removeMember,
  updateMemberDetails,
  cancelInvitation,
  resendInvitation,
  updateProfile,
} from "@/lib/actions/platform";

// Re-import sendEmail so we can control it per-test
import { sendEmail } from "@/lib/email/resend";
const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;

// ===========================================================================
// SUPER ADMIN FUNCTIONS
// ===========================================================================

describe("addSuperAdminDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should add a new domain successfully", async () => {
    mockPrisma.superAdminDomain.findUnique.mockResolvedValue(null);
    mockPrisma.superAdminDomain.create.mockResolvedValue({
      id: "dom-1",
      domain: "acme.com",
    });

    const result = await addSuperAdminDomain("acme.com");

    expect(result.success).toBe(true);
    expect(result).toEqual({
      success: true,
      data: { id: "dom-1", domain: "acme.com" },
    });
    expect(mockPrisma.superAdminDomain.findUnique).toHaveBeenCalledWith({
      where: { domain: "acme.com" },
    });
    expect(mockPrisma.superAdminDomain.create).toHaveBeenCalledWith({
      data: { domain: "acme.com" },
    });
  });

  it("should return error for duplicate domain", async () => {
    mockPrisma.superAdminDomain.findUnique.mockResolvedValue({
      id: "dom-1",
      domain: "acme.com",
    });

    const result = await addSuperAdminDomain("acme.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Domain already exists");
    expect(mockPrisma.superAdminDomain.create).not.toHaveBeenCalled();
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await addSuperAdminDomain("acme.com");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
    expect(mockPrisma.superAdminDomain.findUnique).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockSession = createUnauthenticatedSession();

    const result = await addSuperAdminDomain("acme.com");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.superAdminDomain.findUnique.mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await addSuperAdminDomain("acme.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB connection failed");
  });
});

describe("removeSuperAdminDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should remove a domain successfully", async () => {
    mockPrisma.superAdminDomain.delete.mockResolvedValue({
      id: "dom-1",
      domain: "acme.com",
    });

    const result = await removeSuperAdminDomain("dom-1");

    expect(result.success).toBe(true);
    expect(mockPrisma.superAdminDomain.delete).toHaveBeenCalledWith({
      where: { id: "dom-1" },
    });
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await removeSuperAdminDomain("dom-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
    expect(mockPrisma.superAdminDomain.delete).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.superAdminDomain.delete.mockRejectedValue(
      new Error("Record not found")
    );

    const result = await removeSuperAdminDomain("dom-nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Record not found");
  });
});

describe("updateUserGlobalRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should update a user's global role successfully", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      globalRole: "USER",
    });
    mockPrisma.user.update.mockResolvedValue({
      id: "user-2",
      globalRole: "SUPER_ADMIN",
    });

    const result = await updateUserGlobalRole({
      userId: "user-2",
      globalRole: "SUPER_ADMIN",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { globalRole: "SUPER_ADMIN" },
    });
  });

  it("should block changing own global role", async () => {
    // The super admin session userId is "super-admin-user"
    const result = await updateUserGlobalRole({
      userId: "super-admin-user",
      globalRole: "USER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot change your own global role");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return error when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await updateUserGlobalRole({
      userId: "nonexistent",
      globalRole: "SUPER_ADMIN",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("User not found");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await updateUserGlobalRole({
      userId: "user-2",
      globalRole: "SUPER_ADMIN",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      globalRole: "USER",
    });
    mockPrisma.user.update.mockRejectedValue(new Error("DB error"));

    const result = await updateUserGlobalRole({
      userId: "user-2",
      globalRole: "SUPER_ADMIN",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("deletePlatformUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should delete a user successfully", async () => {
    mockPrisma.user.delete.mockResolvedValue({ id: "user-2" });

    const result = await deletePlatformUser("user-2");

    expect(result.success).toBe(true);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-2" },
    });
  });

  it("should block self-deletion", async () => {
    const result = await deletePlatformUser("super-admin-user");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot delete your own account");
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await deletePlatformUser("user-2");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.user.delete.mockRejectedValue(
      new Error("Foreign key constraint")
    );

    const result = await deletePlatformUser("user-2");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Foreign key constraint");
  });
});

describe("createPlatformCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should create a company successfully", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.company.create.mockResolvedValue({
      id: "comp-1",
      name: "Acme Inc",
      slug: "acme-inc",
    });

    const result = await createPlatformCompany({
      name: "Acme Inc",
      slug: "acme-inc",
    });

    expect(result.success).toBe(true);
    expect(result).toEqual({ success: true, data: { id: "comp-1" } });
    expect(mockPrisma.company.create).toHaveBeenCalledWith({
      data: { name: "Acme Inc", slug: "acme-inc" },
    });
  });

  it("should return error for duplicate slug", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "existing-comp",
      slug: "acme-inc",
    });

    const result = await createPlatformCompany({
      name: "Acme Inc",
      slug: "acme-inc",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Slug is already taken");
    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await createPlatformCompany({
      name: "Test",
      slug: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.company.create.mockRejectedValue(
      new Error("Unique constraint violation")
    );

    const result = await createPlatformCompany({
      name: "Test",
      slug: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unique constraint violation");
  });
});

describe("deletePlatformCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should delete a company successfully", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "comp-1",
      name: "Acme",
    });
    mockPrisma.company.delete.mockResolvedValue({ id: "comp-1" });

    const result = await deletePlatformCompany("comp-1");

    expect(result.success).toBe(true);
    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
  });

  it("should return error when company not found", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const result = await deletePlatformCompany("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Company not found");
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await deletePlatformCompany("comp-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "comp-1",
      name: "Acme",
    });
    mockPrisma.company.delete.mockRejectedValue(
      new Error("Cascade delete failed")
    );

    const result = await deletePlatformCompany("comp-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cascade delete failed");
  });
});

describe("updateCompanyDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should update a company domain successfully", async () => {
    mockPrisma.company.update.mockResolvedValue({
      id: "comp-1",
      domain: "acme.com",
    });

    const result = await updateCompanyDomain({
      companyId: "comp-1",
      domain: "acme.com",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { domain: "acme.com" },
    });
  });

  it("should reject invalid domain format", async () => {
    const result = await updateCompanyDomain({
      companyId: "comp-1",
      domain: "not a valid domain!",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid domain format");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("should accept null domain (clearing it)", async () => {
    mockPrisma.company.update.mockResolvedValue({
      id: "comp-1",
      domain: null,
    });

    const result = await updateCompanyDomain({
      companyId: "comp-1",
      domain: null,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { domain: null },
    });
  });

  it("should reject non-super-admin users", async () => {
    mockSession = createAdminSession();

    const result = await updateCompanyDomain({
      companyId: "comp-1",
      domain: "acme.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.company.update.mockRejectedValue(new Error("DB error"));

    const result = await updateCompanyDomain({
      companyId: "comp-1",
      domain: "acme.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

// ===========================================================================
// COMPANY ADMIN FUNCTIONS
// ===========================================================================

describe("inviteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it("should invite a new member successfully", async () => {
    mockPrisma.companyUser.findFirst.mockResolvedValue(null);
    mockPrisma.invitation.findUnique.mockResolvedValue(null);
    mockPrisma.invitation.upsert.mockResolvedValue({
      id: "inv-1",
      email: "newuser@example.com",
      token: "abc-token",
      company: { name: "Acme Corp" },
    });

    const result = await inviteMember({
      email: "newuser@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.inviteUrl).toContain("/invite/abc-token");
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("should reject invitation to a different company", async () => {
    const result = await inviteMember({
      email: "newuser@example.com",
      role: "MEMBER",
      companyId: "other-company",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot invite to a different company");
  });

  it("should reject invalid email", async () => {
    const result = await inviteMember({
      email: "not-an-email",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email address");
  });

  it("should reject empty email", async () => {
    const result = await inviteMember({
      email: "   ",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email address");
  });

  it("should reject when user is already a member", async () => {
    mockPrisma.companyUser.findFirst.mockResolvedValue({
      id: "cu-existing",
      userId: "user-existing",
    });

    const result = await inviteMember({
      email: "existing@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("User is already a member");
  });

  it("should reject when there is a pending invitation", async () => {
    mockPrisma.companyUser.findFirst.mockResolvedValue(null);
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-existing",
      email: "pending@example.com",
      acceptedAt: null,
    });

    const result = await inviteMember({
      email: "pending@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invitation already sent to this email");
  });

  it("should roll back invitation and return error when email sending fails", async () => {
    mockPrisma.companyUser.findFirst.mockResolvedValue(null);
    mockPrisma.invitation.findUnique.mockResolvedValue(null);
    mockPrisma.invitation.upsert.mockResolvedValue({
      id: "inv-1",
      email: "user@example.com",
      token: "abc-token",
      company: { name: "Acme Corp" },
    });
    mockSendEmail.mockRejectedValue(new Error("SMTP connection refused"));
    mockPrisma.invitation.delete.mockResolvedValue({});

    const result = await inviteMember({
      email: "user@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMTP connection refused");
    expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await inviteMember({
      email: "user@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should reject unauthenticated requests", async () => {
    mockSession = createUnauthenticatedSession();

    const result = await inviteMember({
      email: "user@example.com",
      role: "MEMBER",
      companyId: "company-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("updateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should update a member role successfully", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      userId: "user-2",
      companyId: "company-1",
      role: "MEMBER",
    });
    mockPrisma.companyUser.update.mockResolvedValue({
      id: "cu-2",
      role: "MANAGER",
    });

    const result = await updateMemberRole({
      companyUserId: "cu-2",
      role: "MANAGER",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
      where: { id: "cu-2" },
      data: { role: "MANAGER" },
    });
  });

  it("should return error when member not found", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue(null);

    const result = await updateMemberRole({
      companyUserId: "nonexistent",
      role: "MANAGER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member not found");
  });

  it("should reject when member belongs to different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-other",
      userId: "user-other",
      companyId: "other-company",
      role: "MEMBER",
    });

    const result = await updateMemberRole({
      companyUserId: "cu-other",
      role: "MANAGER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member does not belong to this company");
  });

  it("should block self role change", async () => {
    // admin-user is the session user's id from createAdminSession
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-admin",
      userId: "admin-user",
      companyId: "company-1",
      role: "ADMIN",
    });

    const result = await updateMemberRole({
      companyUserId: "cu-admin",
      role: "MEMBER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot change your own role");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await updateMemberRole({
      companyUserId: "cu-2",
      role: "MANAGER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      userId: "user-2",
      companyId: "company-1",
      role: "MEMBER",
    });
    mockPrisma.companyUser.update.mockRejectedValue(new Error("DB error"));

    const result = await updateMemberRole({
      companyUserId: "cu-2",
      role: "MANAGER",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("toggleMemberActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should toggle a member's active status successfully", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      userId: "user-2",
      companyId: "company-1",
      isActive: true,
    });
    mockPrisma.companyUser.update.mockResolvedValue({
      id: "cu-2",
      isActive: false,
    });

    const result = await toggleMemberActive({
      companyUserId: "cu-2",
      isActive: false,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
      where: { id: "cu-2" },
      data: { isActive: false },
    });
  });

  it("should return error when member not found", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue(null);

    const result = await toggleMemberActive({
      companyUserId: "nonexistent",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member not found");
  });

  it("should reject when member belongs to different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-other",
      userId: "user-other",
      companyId: "other-company",
    });

    const result = await toggleMemberActive({
      companyUserId: "cu-other",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member does not belong to this company");
  });

  it("should block self-deactivation", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-admin",
      userId: "admin-user",
      companyId: "company-1",
      isActive: true,
    });

    const result = await toggleMemberActive({
      companyUserId: "cu-admin",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot deactivate your own account");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await toggleMemberActive({
      companyUserId: "cu-2",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("removeMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should remove a member successfully", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      userId: "user-2",
      companyId: "company-1",
    });
    mockPrisma.companyUser.delete.mockResolvedValue({ id: "cu-2" });

    const result = await removeMember("cu-2");

    expect(result.success).toBe(true);
    expect(mockPrisma.companyUser.delete).toHaveBeenCalledWith({
      where: { id: "cu-2" },
    });
  });

  it("should return error when member not found", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue(null);

    const result = await removeMember("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member not found");
  });

  it("should reject when member belongs to different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-other",
      userId: "user-other",
      companyId: "other-company",
    });

    const result = await removeMember("cu-other");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member does not belong to this company");
  });

  it("should block self-removal", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-admin",
      userId: "admin-user",
      companyId: "company-1",
    });

    const result = await removeMember("cu-admin");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot remove yourself");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await removeMember("cu-2");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("updateMemberDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should update member details successfully", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      userId: "user-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });
    mockPrisma.department.findUnique.mockResolvedValue({
      id: "dept-1",
      companyId: "company-1",
    });
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp-mgr",
      companyId: "company-1",
    });
    mockPrisma.employee.update.mockResolvedValue({ id: "emp-2" });

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      title: "Engineer",
      departmentId: "dept-1",
      managerId: "emp-mgr",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-2" },
      data: {
        title: "Engineer",
        employeeCode: undefined,
        departmentId: "dept-1",
        managerId: "emp-mgr",
        startDate: undefined,
      },
    });
  });

  it("should return error when member not found", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue(null);

    const result = await updateMemberDetails({
      companyUserId: "nonexistent",
      title: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member not found");
  });

  it("should reject when member belongs to different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-other",
      companyId: "other-company",
      employee: { id: "emp-other" },
    });

    const result = await updateMemberDetails({
      companyUserId: "cu-other",
      title: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Member does not belong to this company");
  });

  it("should return error when no employee record is linked", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: null,
    });

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      title: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No employee record linked to this member");
  });

  it("should reject invalid department (not found or wrong company)", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });
    mockPrisma.department.findUnique.mockResolvedValue(null);

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      departmentId: "dept-invalid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Department not found");
  });

  it("should reject department from different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });
    mockPrisma.department.findUnique.mockResolvedValue({
      id: "dept-other",
      companyId: "other-company",
    });

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      departmentId: "dept-other",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Department not found");
  });

  it("should block employee from being their own manager", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      managerId: "emp-2",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("An employee cannot be their own manager");
  });

  it("should reject invalid manager (not found or wrong company)", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });
    mockPrisma.employee.findUnique.mockResolvedValue(null);

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      managerId: "emp-invalid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Manager not found");
  });

  it("should reject manager from different company", async () => {
    mockPrisma.companyUser.findUnique.mockResolvedValue({
      id: "cu-2",
      companyId: "company-1",
      employee: { id: "emp-2", companyId: "company-1" },
    });
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp-other-mgr",
      companyId: "other-company",
    });

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      managerId: "emp-other-mgr",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Manager not found");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await updateMemberDetails({
      companyUserId: "cu-2",
      title: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("cancelInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should cancel an invitation successfully", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      companyId: "company-1",
    });
    mockPrisma.invitation.delete.mockResolvedValue({ id: "inv-1" });

    const result = await cancelInvitation("inv-1");

    expect(result.success).toBe(true);
    expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
  });

  it("should return error when invitation not found", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue(null);

    const result = await cancelInvitation("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invitation not found");
  });

  it("should reject when invitation belongs to different company", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-other",
      companyId: "other-company",
    });

    const result = await cancelInvitation("inv-other");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invitation does not belong to this company");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await cancelInvitation("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("resendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it("should resend an invitation successfully", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      email: "user@example.com",
      companyId: "company-1",
      token: "abc-token",
      company: { name: "Acme Corp" },
    });
    mockPrisma.invitation.update.mockResolvedValue({ id: "inv-1" });

    const result = await resendInvitation("inv-1");

    expect(result.success).toBe(true);
    expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { expiresAt: expect.any(Date) },
    });
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("should return error when invitation not found", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue(null);

    const result = await resendInvitation("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invitation not found");
  });

  it("should reject when invitation belongs to different company", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-other",
      companyId: "other-company",
      email: "user@example.com",
      token: "tok",
      company: { name: "Other" },
    });

    const result = await resendInvitation("inv-other");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invitation does not belong to this company");
  });

  it("should return error when email sending fails", async () => {
    mockPrisma.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      email: "user@example.com",
      companyId: "company-1",
      token: "abc-token",
      company: { name: "Acme Corp" },
    });
    mockPrisma.invitation.update.mockResolvedValue({ id: "inv-1" });
    mockSendEmail.mockRejectedValue(new Error("Email service unavailable"));

    const result = await resendInvitation("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Email service unavailable");
  });

  it("should reject non-admin users", async () => {
    mockSession = createMemberSession();

    const result = await resendInvitation("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession("company-1");
  });

  it("should update profile name successfully", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "admin-user",
      name: "New Name",
    });

    const result = await updateProfile({ name: "New Name" });

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "admin-user" },
      data: { name: "New Name" },
    });
  });

  it("should update profile image successfully", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "admin-user",
      image: "https://example.com/photo.jpg",
    });

    const result = await updateProfile({
      image: "https://example.com/photo.jpg",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "admin-user" },
      data: { image: "https://example.com/photo.jpg" },
    });
  });

  it("should reject unauthenticated requests", async () => {
    mockSession = createUnauthenticatedSession();

    const result = await updateProfile({ name: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.user.update.mockRejectedValue(new Error("DB error"));

    const result = await updateProfile({ name: "New Name" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});
