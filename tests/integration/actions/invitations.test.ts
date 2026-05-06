import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import AFTER mocks
import {
  getInvitationByToken,
  acceptInvitation,
} from "@/lib/actions/invitations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date("2025-06-01T12:00:00Z");
const future = new Date("2025-12-01T12:00:00Z");
const past = new Date("2024-01-01T12:00:00Z");

function makeMockInvitation(overrides?: Record<string, unknown>) {
  return {
    id: "inv-1",
    token: "valid-token",
    email: "alice@acme.com",
    role: "EMPLOYEE",
    companyId: "company-1",
    departmentId: "dept-1",
    hubId: "hub-1",
    managerId: "mgr-1",
    roleConfigId: "rc-1",
    expiresAt: future,
    acceptedAt: null,
    company: { name: "Acme Corp", slug: "acme-corp" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("invitation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // getInvitationByToken
  // =========================================================================

  describe("getInvitationByToken", () => {
    it("returns invitation preview with department and hub names", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findUnique.mockResolvedValue({ name: "Engineering" });
      mockPrisma.hub.findUnique.mockResolvedValue({ name: "West Coast" });

      const result = await getInvitationByToken("valid-token");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "inv-1",
        email: "alice@acme.com",
        role: "EMPLOYEE",
        companyName: "Acme Corp",
        companySlug: "acme-corp",
        inviterEmail: null,
        expiresAt: future.toISOString(),
        acceptedAt: null,
        isExpired: false,
        departmentName: "Engineering",
        hubName: "West Coast",
        // Pre-fill fields default to null on regular member invites; the
        // SUPER_ADMIN create-account flow is what populates them.
        inviteeFirstName: null,
        inviteeLastName: null,
        inviteePhone: null,
        inviteeJobTitle: null,
      });
    });

    it("returns null department/hub when invitation has no departmentId/hubId", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ departmentId: null, hubId: null })
      );

      const result = await getInvitationByToken("valid-token");

      expect(result.success).toBe(true);
      expect(result.data!.departmentName).toBeNull();
      expect(result.data!.hubName).toBeNull();
      expect(mockPrisma.department.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.hub.findUnique).not.toHaveBeenCalled();
    });

    it("marks invitation as expired when expiresAt is in the past", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ expiresAt: past })
      );

      const result = await getInvitationByToken("expired-token");

      expect(result.success).toBe(true);
      expect(result.data!.isExpired).toBe(true);
    });

    it("includes acceptedAt ISO string when invitation was already accepted", async () => {
      const acceptedDate = new Date("2025-05-15T10:00:00Z");
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ acceptedAt: acceptedDate })
      );

      const result = await getInvitationByToken("accepted-token");

      expect(result.success).toBe(true);
      expect(result.data!.acceptedAt).toBe(acceptedDate.toISOString());
    });

    it("returns error when token is not found", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      const result = await getInvitationByToken("nonexistent-token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invitation not found");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.invitation.findUnique.mockRejectedValue(new Error("DB connection lost"));

      const result = await getInvitationByToken("any-token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to load invitation");
    });

    it("handles department/hub lookup failure gracefully", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findUnique.mockRejectedValue(new Error("DB error"));

      const result = await getInvitationByToken("valid-token");

      // The whole call fails because Promise.all rejects
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to load invitation");
    });
  });

  // =========================================================================
  // acceptInvitation
  // =========================================================================

  describe("acceptInvitation", () => {
    let capturedTx: MockPrismaClient;

    function setupTransaction() {
      capturedTx = createMockPrisma();
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          return fn(capturedTx);
        }
      );
    }

    it("creates user, employee, and company user for new invitation", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      // FK resolution lookups
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      // User does not exist
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({
        id: "user-new",
        email: "alice@acme.com",
        name: "Alice",
        globalRole: "USER",
      });
      // Employee does not exist
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({
        id: "emp-new",
        companyId: "company-1",
        email: "alice@acme.com",
        name: "Alice",
      });
      // CompanyUser does not exist
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      // Invitation update
      capturedTx.invitation.update.mockResolvedValue({});
      // Company lookup
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ email: "alice@acme.com", companySlug: "acme-corp" });

      // Verify user created — invitee* fields default to null when the
      // invitation didn't carry pre-filled profile data (regular member
      // invites). The acceptInvitation pattern always passes them through
      // with explicit nulls so the User row reflects the invitation's
      // origin path.
      expect(capturedTx.user.create).toHaveBeenCalledWith({
        data: {
          email: "alice@acme.com",
          name: "Alice",
          firstName: null,
          lastName: null,
          phone: null,
          globalRole: "USER",
        },
      });

      // Verify employee created with resolved FK ids
      expect(capturedTx.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: "company-1",
          email: "alice@acme.com",
          name: "Alice",
          departmentId: "dept-1",
          managerId: "mgr-1",
          hubId: "hub-1",
          isActive: true,
        }),
      });

      // Verify company user created
      expect(capturedTx.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-new",
          companyId: "company-1",
          role: "EMPLOYEE",
          roleConfigId: "rc-1",
          isActive: true,
        }),
      });

      // Verify invitation marked accepted
      expect(capturedTx.invitation.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { acceptedAt: expect.any(Date) },
      });
    });

    it("reuses existing user when user already exists", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "alice@acme.com",
      });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-new" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(true);
      expect(capturedTx.user.create).not.toHaveBeenCalled();
      expect(capturedTx.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "existing-user" }),
      });
    });

    it("updates existing employee with missing fields from invitation", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      // Employee exists but has empty fields
      capturedTx.employee.findUnique.mockResolvedValue({
        id: "emp-existing",
        name: null,
        departmentId: null,
        managerId: null,
        hubId: null,
        isActive: false,
      });
      capturedTx.employee.update.mockResolvedValue({ id: "emp-existing" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(true);
      expect(capturedTx.employee.update).toHaveBeenCalledWith({
        where: { id: "emp-existing" },
        data: expect.objectContaining({
          name: "Alice",
          departmentId: "dept-1",
          managerId: "mgr-1",
          hubId: "hub-1",
          isActive: true,
        }),
      });
    });

    it("does not overwrite existing employee fields", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      // Employee already has all fields filled
      capturedTx.employee.findUnique.mockResolvedValue({
        id: "emp-existing",
        name: "Alice Original",
        departmentId: "dept-other",
        managerId: "mgr-other",
        hubId: "hub-other",
        isActive: true,
      });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      const result = await acceptInvitation("valid-token", "Alice New Name");

      expect(result.success).toBe(true);
      // Should NOT call employee.update since all fields already filled
      expect(capturedTx.employee.update).not.toHaveBeenCalled();
    });

    it("updates existing company user rather than creating new one", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-new" });
      // Existing company user
      capturedTx.companyUser.findUnique.mockResolvedValue({
        id: "cu-existing",
        employeeId: "emp-old",
      });
      capturedTx.companyUser.update.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(true);
      expect(capturedTx.companyUser.create).not.toHaveBeenCalled();
      expect(capturedTx.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-existing" },
        data: expect.objectContaining({
          role: "EMPLOYEE",
          roleConfigId: "rc-1",
          employeeId: "emp-old", // keeps existing employeeId
          isActive: true,
        }),
      });
    });

    it("links new employeeId when existing company user has no employeeId", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-new" });
      capturedTx.companyUser.findUnique.mockResolvedValue({
        id: "cu-existing",
        employeeId: null,
      });
      capturedTx.companyUser.update.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      await acceptInvitation("valid-token", "Alice");

      expect(capturedTx.companyUser.update).toHaveBeenCalledWith({
        where: { id: "cu-existing" },
        data: expect.objectContaining({
          employeeId: "emp-new",
        }),
      });
    });

    it("returns error when token is not found", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      const result = await acceptInvitation("bad-token", "Alice");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invitation not found");
    });

    it("returns ALREADY_ACCEPTED error when invitation was already accepted", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ acceptedAt: new Date("2025-05-01T00:00:00Z") })
      );

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already been accepted");
      expect((result as { code?: string }).code).toBe("ALREADY_ACCEPTED");
    });

    it("returns EXPIRED error when invitation has expired", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ expiresAt: past })
      );

      const result = await acceptInvitation("expired-token", "Alice");

      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
      expect((result as { code?: string }).code).toBe("EXPIRED");
    });

    it("normalizes email to lowercase and trims", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ email: "  ALICE@Acme.COM  " })
      );
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-1" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      await acceptInvitation("valid-token", "Alice");

      expect(capturedTx.user.findUnique).toHaveBeenCalledWith({
        where: { email: "alice@acme.com" },
      });
    });

    it("uses email prefix as name when displayName is empty", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-1" });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: "mgr-1" });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-1" });

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-1" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      await acceptInvitation("valid-token", "   ");

      expect(capturedTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "alice",
        }),
      });
    });

    it("resolves null for FK ids that are 'none' sentinel values", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ departmentId: "none", hubId: "none", managerId: "none" })
      );

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-1" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      await acceptInvitation("valid-token", "Alice");

      // Should not have tried to resolve "none" ids
      expect(mockPrisma.department.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.employee.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.hub.findFirst).not.toHaveBeenCalled();

      expect(capturedTx.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          departmentId: null,
          managerId: null,
          hubId: null,
        }),
      });
    });

    it("resolves null for FK ids whose target rows no longer exist", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(makeMockInvitation());
      // All FK lookups return null (deleted rows)
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.employee.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findFirst.mockResolvedValue(null);

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-1" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue({ slug: "acme-corp" });

      await acceptInvitation("valid-token", "Alice");

      expect(capturedTx.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          departmentId: null,
          managerId: null,
          hubId: null,
        }),
      });
    });

    it("returns empty companySlug when company is not found in transaction", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ departmentId: null, hubId: null, managerId: null })
      );

      setupTransaction();
      capturedTx.user.findUnique.mockResolvedValue(null);
      capturedTx.user.create.mockResolvedValue({ id: "user-1", email: "alice@acme.com" });
      capturedTx.employee.findUnique.mockResolvedValue(null);
      capturedTx.employee.create.mockResolvedValue({ id: "emp-1" });
      capturedTx.companyUser.findUnique.mockResolvedValue(null);
      capturedTx.companyUser.create.mockResolvedValue({});
      capturedTx.invitation.update.mockResolvedValue({});
      capturedTx.company.findUnique.mockResolvedValue(null);

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(true);
      expect(result.data!.companySlug).toBe("");
    });

    it("handles transaction errors gracefully", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(
        makeMockInvitation({ departmentId: null, hubId: null, managerId: null })
      );
      mockPrisma.$transaction.mockRejectedValue(new Error("Transaction deadlock"));

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Transaction deadlock");
    });

    it("handles non-Error thrown values in catch block", async () => {
      mockPrisma.invitation.findUnique.mockRejectedValue("string error");

      const result = await acceptInvitation("valid-token", "Alice");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to accept invitation");
    });
  });
});
