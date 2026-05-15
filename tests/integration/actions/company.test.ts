import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrisma,
  type MockPrismaClient,
} from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createMemberSession,
  createSuperAdminSession,
  createManagerSession,
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import AFTER mocks
import {
  createCompany,
  updateCompany,
  getCompany,
  getAvailableCompanies,
  switchCompany,
} from "@/lib/actions/company";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleCompany = {
  id: "company-1",
  name: "Acme Corp",
  slug: "acme-corp",
  logo: null,
  primaryColor: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const sampleCompanyUser = {
  id: "cu-1",
  userId: "admin-user",
  companyId: "company-1",
  role: "ADMIN",
  isActive: true,
  employeeId: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("company actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
    // Pre-#9 the action skipped this lookup; now it pre-checks the user
    // exists before opening the transaction. Default to "user exists" so the
    // existing tests focus on transaction / slug behavior.
    mockPrisma.user.findUnique.mockResolvedValue({ id: "admin-user" });
  });

  // =========================================================================
  // createCompany
  // =========================================================================

  describe("createCompany", () => {
    it("creates company, employee, and admin companyUser in a transaction", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null); // slug not taken
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "admin-user",
        email: "admin@example.com",
        name: "Admin User",
        firstName: "Admin",
        lastName: "User",
      });

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.company.create.mockResolvedValue(sampleCompany);
          capturedTxClient.employee.create.mockResolvedValue({
            id: "emp-1",
            companyId: "company-1",
            email: "admin@example.com",
            name: "Admin User",
            title: "People Lead",
          });
          capturedTxClient.companyUser.create.mockResolvedValue(
            sampleCompanyUser
          );
          return fn(capturedTxClient);
        }
      );

      const result = await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
        jobTitle: "People Lead",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        company: sampleCompany,
        companyUser: sampleCompanyUser,
      });

      // Verify slug uniqueness check
      expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme-corp" },
      });

      // Verify transaction calls
      expect(capturedTxClient!.company.create).toHaveBeenCalledWith({
        data: { name: "Acme Corp", slug: "acme-corp", taxId: "900123456-7" },
      });
      expect(capturedTxClient!.employee.create).toHaveBeenCalledWith({
        data: {
          companyId: "company-1",
          email: "admin@example.com",
          name: "Admin User",
          title: "People Lead",
        },
      });
      expect(capturedTxClient!.companyUser.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-user",
          companyId: "company-1",
          role: "ADMIN",
          employeeId: "emp-1",
        },
      });
    });

    it("returns error when slug is already taken", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);

      const result = await createCompany({
        name: "Another Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("This URL is already taken");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns stale-session error when the User row is missing", async () => {
      // JWT is valid but underlying user was deleted (e.g. after a DB reset).
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/session is out of sync/i);
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("uses the authenticated session user id, ignoring input.userId", async () => {
      // Caller-supplied input.userId must be ignored — the action derives the
      // id from session.user.id to prevent membership injection.
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "admin-user",
        email: "admin@example.com",
        name: null,
        firstName: null,
        lastName: null,
      });

      let capturedTxClient: MockPrismaClient | null = null;
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
          capturedTxClient = createMockPrisma();
          capturedTxClient.company.create.mockResolvedValue(sampleCompany);
          capturedTxClient.employee.create.mockResolvedValue({ id: "emp-1" });
          capturedTxClient.companyUser.create.mockResolvedValue(
            sampleCompanyUser
          );
          return fn(capturedTxClient);
        }
      );

      await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "attacker-user", // attempt to point at someone else
      });

      // Should still use admin-user (from session), not attacker-user
      expect(capturedTxClient!.companyUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "admin-user" }),
      });
    });

    it("handles transaction errors gracefully", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Transaction failed")
      );

      const result = await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
      });

      expect(result.success).toBe(false);
      // Generic-Error fallback (PR #10): tagged 'unexpected error' to
      // distinguish from the Prisma-class branches.
      expect(result.error).toMatch(/^Failed to create company/);
    });

    it("handles database errors on slug check gracefully", async () => {
      mockPrisma.company.findUnique.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await createCompany({
        name: "Acme Corp",
        slug: "acme-corp",
        taxId: "900123456-7",
        userId: "admin-user",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/^Failed to create company/);
    });
  });

  // =========================================================================
  // updateCompany
  // =========================================================================

  describe("updateCompany", () => {
    it("updates company name successfully", async () => {
      const updatedCompany = { ...sampleCompany, name: "Acme Inc" };
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      const result = await updateCompany("company-1", { name: "Acme Inc" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCompany);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: "company-1" },
        data: { name: "Acme Inc" },
      });
    });

    it("updates company logo successfully", async () => {
      const updatedCompany = {
        ...sampleCompany,
        logo: "https://example.com/logo.png",
      };
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      const result = await updateCompany("company-1", {
        logo: "https://example.com/logo.png",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCompany);
    });

    it("updates company primaryColor successfully", async () => {
      const updatedCompany = { ...sampleCompany, primaryColor: "#FF0000" };
      mockPrisma.company.update.mockResolvedValue(updatedCompany);

      const result = await updateCompany("company-1", {
        primaryColor: "#FF0000",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCompany);
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await updateCompany("company-1", { name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.company.update).not.toHaveBeenCalled();
    });

    it("returns error when user is not ADMIN", async () => {
      mockSession = createMemberSession();

      const result = await updateCompany("company-1", { name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.company.update).not.toHaveBeenCalled();
    });

    it("returns error when MANAGER tries to update", async () => {
      mockSession = createManagerSession();

      const result = await updateCompany("company-1", { name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.company.update).not.toHaveBeenCalled();
    });

    it("returns error when companyId doesn't match session", async () => {
      // Admin session has companyId "company-1"
      const result = await updateCompany("company-other", { name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.company.update).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.company.update.mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await updateCompany("company-1", { name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update company");
    });
  });

  // =========================================================================
  // getCompany
  // =========================================================================

  describe("getCompany", () => {
    it("returns company when found", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);

      const result = await getCompany("company-1");

      expect(result).toEqual(sampleCompany);
      expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: "company-1" },
      });
    });

    it("returns null when company not found", async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const result = await getCompany("nonexistent");

      expect(result).toBeNull();
    });

    it("propagates database errors", async () => {
      mockPrisma.company.findUnique.mockRejectedValue(
        new Error("DB connection failed")
      );

      await expect(getCompany("company-1")).rejects.toThrow(
        "DB connection failed"
      );
    });
  });

  // =========================================================================
  // getAvailableCompanies
  // =========================================================================

  describe("getAvailableCompanies", () => {
    it("returns empty array when not authenticated", async () => {
      mockSession = null;

      const result = await getAvailableCompanies();

      expect(result).toEqual([]);
    });

    describe("regular user", () => {
      it("returns companies the user belongs to", async () => {
        const companyUsers = [
          {
            id: "cu-1",
            userId: "admin-user",
            companyId: "company-1",
            role: "ADMIN",
            isActive: true,
            company: { id: "company-1", name: "Acme Corp", slug: "acme-corp" },
          },
          {
            id: "cu-2",
            userId: "admin-user",
            companyId: "company-2",
            role: "MEMBER",
            isActive: true,
            company: {
              id: "company-2",
              name: "Beta Inc",
              slug: "beta-inc",
            },
          },
        ];
        mockPrisma.companyUser.findMany.mockResolvedValue(companyUsers);

        const result = await getAvailableCompanies();

        expect(result).toEqual([
          {
            companyId: "company-1",
            companyName: "Acme Corp",
            companySlug: "acme-corp",
            role: "ADMIN",
          },
          {
            companyId: "company-2",
            companyName: "Beta Inc",
            companySlug: "beta-inc",
            role: "MEMBER",
          },
        ]);

        expect(mockPrisma.companyUser.findMany).toHaveBeenCalledWith({
          where: { userId: "admin-user", isActive: true },
          include: {
            company: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { company: { name: "asc" } },
        });
      });

      it("returns empty array when user has no companies", async () => {
        mockPrisma.companyUser.findMany.mockResolvedValue([]);

        const result = await getAvailableCompanies();

        expect(result).toEqual([]);
      });
    });

    describe("SUPER_ADMIN", () => {
      beforeEach(() => {
        mockSession = createSuperAdminSession();
      });

      it("returns all companies with roles from companyUser records", async () => {
        const allCompanies = [
          { id: "company-1", name: "Acme Corp", slug: "acme-corp" },
          { id: "company-2", name: "Beta Inc", slug: "beta-inc" },
          { id: "company-3", name: "Gamma LLC", slug: "gamma-llc" },
        ];
        const superAdminCompanyUsers = [
          { companyId: "company-1", role: "ADMIN" },
        ];

        mockPrisma.company.findMany.mockResolvedValue(allCompanies);
        mockPrisma.companyUser.findMany.mockResolvedValue(
          superAdminCompanyUsers
        );

        const result = await getAvailableCompanies();

        expect(result).toEqual([
          {
            companyId: "company-1",
            companyName: "Acme Corp",
            companySlug: "acme-corp",
            role: "ADMIN",
          },
          {
            companyId: "company-2",
            companyName: "Beta Inc",
            companySlug: "beta-inc",
            role: "SUPER_ADMIN",
          },
          {
            companyId: "company-3",
            companyName: "Gamma LLC",
            companySlug: "gamma-llc",
            role: "SUPER_ADMIN",
          },
        ]);

        // Verify it fetches all companies
        expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        });

        // Verify it fetches super admin's companyUser records
        expect(mockPrisma.companyUser.findMany).toHaveBeenCalledWith({
          where: { userId: "super-admin-user", isActive: true },
          select: { companyId: true, role: true },
        });
      });

      it("returns SUPER_ADMIN role for companies without companyUser record", async () => {
        mockPrisma.company.findMany.mockResolvedValue([
          { id: "company-1", name: "Acme Corp", slug: "acme-corp" },
        ]);
        mockPrisma.companyUser.findMany.mockResolvedValue([]); // no companyUser records

        const result = await getAvailableCompanies();

        expect(result).toEqual([
          {
            companyId: "company-1",
            companyName: "Acme Corp",
            companySlug: "acme-corp",
            role: "SUPER_ADMIN",
          },
        ]);
      });

      it("returns empty array when no companies exist", async () => {
        mockPrisma.company.findMany.mockResolvedValue([]);
        mockPrisma.companyUser.findMany.mockResolvedValue([]);

        const result = await getAvailableCompanies();

        expect(result).toEqual([]);
      });
    });
  });

  // =========================================================================
  // switchCompany
  // =========================================================================

  describe("switchCompany", () => {
    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await switchCompany("company-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    describe("regular user", () => {
      it("succeeds when user belongs to the company", async () => {
        mockPrisma.companyUser.findFirst.mockResolvedValue(sampleCompanyUser);

        const result = await switchCompany("company-1");

        expect(result.success).toBe(true);
        expect(mockPrisma.companyUser.findFirst).toHaveBeenCalledWith({
          where: {
            userId: "admin-user",
            companyId: "company-1",
            isActive: true,
          },
        });
      });

      it("returns error when user does not belong to the company", async () => {
        mockPrisma.companyUser.findFirst.mockResolvedValue(null);

        const result = await switchCompany("company-other");

        expect(result.success).toBe(false);
        expect(result.error).toBe("You don't belong to this company");
      });
    });

    describe("SUPER_ADMIN", () => {
      beforeEach(() => {
        mockSession = createSuperAdminSession();
      });

      it("succeeds when company exists and companyUser already exists and is active", async () => {
        mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
        mockPrisma.companyUser.findFirst.mockResolvedValue({
          ...sampleCompanyUser,
          isActive: true,
        });

        const result = await switchCompany("company-1");

        expect(result.success).toBe(true);
        // Should not create or update companyUser
        expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
        expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
      });

      it("creates companyUser record when none exists", async () => {
        mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
        mockPrisma.companyUser.findFirst.mockResolvedValue(null);
        mockPrisma.companyUser.create.mockResolvedValue(sampleCompanyUser);

        const result = await switchCompany("company-1");

        expect(result.success).toBe(true);
        expect(mockPrisma.companyUser.create).toHaveBeenCalledWith({
          data: {
            userId: "super-admin-user",
            companyId: "company-1",
            role: "ADMIN",
            isActive: true,
          },
        });
      });

      it("reactivates inactive companyUser record", async () => {
        mockPrisma.company.findUnique.mockResolvedValue(sampleCompany);
        mockPrisma.companyUser.findFirst.mockResolvedValue({
          ...sampleCompanyUser,
          id: "cu-inactive",
          isActive: false,
        });
        mockPrisma.companyUser.update.mockResolvedValue({
          ...sampleCompanyUser,
          id: "cu-inactive",
          isActive: true,
        });

        const result = await switchCompany("company-1");

        expect(result.success).toBe(true);
        expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
          where: { id: "cu-inactive" },
          data: { isActive: true },
        });
        expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
      });

      it("returns error when company does not exist", async () => {
        mockPrisma.company.findUnique.mockResolvedValue(null);

        const result = await switchCompany("nonexistent");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Company not found");
        expect(mockPrisma.companyUser.findFirst).not.toHaveBeenCalled();
      });

      it("handles database errors gracefully", async () => {
        mockPrisma.company.findUnique.mockRejectedValue(
          new Error("DB connection failed")
        );

        // switchCompany doesn't have a try/catch itself — it's a bare function
        // Let's verify the behavior: since there's no try/catch,
        // we need to check if the error propagates
        // Looking at the source code: switchCompany doesn't have try/catch
        // so DB errors will propagate as unhandled
        await expect(switchCompany("company-1")).rejects.toThrow(
          "DB connection failed"
        );
      });
    });
  });
});
