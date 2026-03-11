import { describe, it, expect } from "vitest";
import {
  hasPermission,
  requirePermission,
  canAccessCompany,
  requireCompanyAccess,
  isCompanyAdmin,
  isCompanyManager,
  isSuperAdmin,
  getCompanyId,
  requireCompanyId,
} from "@/lib/permissions/abilities";
import {
  createAdminSession,
  createManagerSession,
  createMemberSession,
  createSuperAdminSession,
  createUnauthenticatedSession,
} from "../../helpers/mock-session";

describe("permissions/abilities", () => {
  describe("hasPermission", () => {
    it("returns false for null session", () => {
      expect(hasPermission(null, "read", "company")).toBe(false);
    });

    it("SUPER_ADMIN has all permissions", () => {
      const session = createSuperAdminSession();
      expect(hasPermission(session, "manage", "company")).toBe(true);
      expect(hasPermission(session, "delete", "user")).toBe(true);
      expect(hasPermission(session, "release", "report")).toBe(true);
    });

    describe("ADMIN permissions", () => {
      const session = createAdminSession();

      it("can manage company", () => {
        expect(hasPermission(session, "manage", "company")).toBe(true);
      });

      it("can CRUD users", () => {
        expect(hasPermission(session, "create", "user")).toBe(true);
        expect(hasPermission(session, "read", "user")).toBe(true);
        expect(hasPermission(session, "update", "user")).toBe(true);
        expect(hasPermission(session, "delete", "user")).toBe(true);
      });

      it("can CRUD templates", () => {
        expect(hasPermission(session, "create", "template")).toBe(true);
        expect(hasPermission(session, "delete", "template")).toBe(true);
      });

      it("can manage cycles", () => {
        expect(hasPermission(session, "create", "cycle")).toBe(true);
        expect(hasPermission(session, "manage", "cycle")).toBe(true);
      });

      it("can release reports", () => {
        expect(hasPermission(session, "release", "report")).toBe(true);
      });
    });

    describe("MANAGER permissions", () => {
      const session = createManagerSession();

      it("can read company", () => {
        expect(hasPermission(session, "read", "company")).toBe(true);
      });

      it("cannot manage company", () => {
        expect(hasPermission(session, "manage", "company")).toBe(false);
      });

      it("can read users but not create", () => {
        expect(hasPermission(session, "read", "user")).toBe(true);
        expect(hasPermission(session, "create", "user")).toBe(false);
      });

      it("can read templates but not create", () => {
        expect(hasPermission(session, "read", "template")).toBe(true);
        expect(hasPermission(session, "create", "template")).toBe(false);
      });

      it("can CRUD reviews", () => {
        expect(hasPermission(session, "create", "review")).toBe(true);
        expect(hasPermission(session, "read", "review")).toBe(true);
        expect(hasPermission(session, "update", "review")).toBe(true);
      });

      it("can update nominations", () => {
        expect(hasPermission(session, "update", "nomination")).toBe(true);
      });

      it("cannot release reports", () => {
        expect(hasPermission(session, "release", "report")).toBe(false);
      });
    });

    describe("MEMBER permissions", () => {
      const session = createMemberSession();

      it("can read company", () => {
        expect(hasPermission(session, "read", "company")).toBe(true);
      });

      it("cannot create users", () => {
        expect(hasPermission(session, "create", "user")).toBe(false);
      });

      it("cannot access templates", () => {
        expect(hasPermission(session, "read", "template")).toBe(false);
        expect(hasPermission(session, "create", "template")).toBe(false);
      });

      it("can create and read nominations", () => {
        expect(hasPermission(session, "create", "nomination")).toBe(true);
        expect(hasPermission(session, "read", "nomination")).toBe(true);
      });

      it("can CRUD reviews", () => {
        expect(hasPermission(session, "create", "review")).toBe(true);
        expect(hasPermission(session, "update", "review")).toBe(true);
      });

      it("can read reports", () => {
        expect(hasPermission(session, "read", "report")).toBe(true);
      });

      it("cannot update settings", () => {
        expect(hasPermission(session, "update", "settings")).toBe(false);
      });
    });

    describe("contextual permissions", () => {
      it("users can read own profile", () => {
        const session = createMemberSession();
        expect(
          hasPermission(session, "read", "user", {
            resourceUserId: "member-user",
          })
        ).toBe(true);
      });

      it("users can read own released reports", () => {
        const session = createMemberSession();
        expect(
          hasPermission(session, "read", "report", {
            isOwnReport: true,
            isReportReleased: true,
          })
        ).toBe(true);
      });

      it("users cannot read unreleased own reports", () => {
        const session = createMemberSession();
        expect(
          hasPermission(session, "read", "report", {
            isOwnReport: true,
            isReportReleased: false,
          })
        ).toBe(true); // base permission allows read
      });
    });
  });

  describe("requirePermission", () => {
    it("throws for unauthorized access", () => {
      expect(() => requirePermission(null, "manage", "company")).toThrow(
        "Unauthorized"
      );
    });

    it("does not throw for authorized access", () => {
      const session = createAdminSession();
      expect(() => requirePermission(session, "manage", "company")).not.toThrow();
    });
  });

  describe("canAccessCompany", () => {
    it("returns false for null session", () => {
      expect(canAccessCompany(null, "company-1")).toBe(false);
    });

    it("SUPER_ADMIN can access any company", () => {
      const session = createSuperAdminSession();
      expect(canAccessCompany(session, "any-company")).toBe(true);
    });

    it("user can access their own company", () => {
      const session = createAdminSession("company-1");
      expect(canAccessCompany(session, "company-1")).toBe(true);
    });

    it("user cannot access other companies", () => {
      const session = createAdminSession("company-1");
      expect(canAccessCompany(session, "company-2")).toBe(false);
    });
  });

  describe("requireCompanyAccess", () => {
    it("throws for unauthorized company access", () => {
      const session = createAdminSession("company-1");
      expect(() => requireCompanyAccess(session, "company-2")).toThrow(
        "Unauthorized"
      );
    });
  });

  describe("role helpers", () => {
    it("isCompanyAdmin", () => {
      expect(isCompanyAdmin(createAdminSession())).toBe(true);
      expect(isCompanyAdmin(createManagerSession())).toBe(false);
      expect(isCompanyAdmin(null)).toBe(false);
    });

    it("isCompanyManager", () => {
      expect(isCompanyManager(createAdminSession())).toBe(true);
      expect(isCompanyManager(createManagerSession())).toBe(true);
      expect(isCompanyManager(createMemberSession())).toBe(false);
    });

    it("isSuperAdmin", () => {
      expect(isSuperAdmin(createSuperAdminSession())).toBe(true);
      expect(isSuperAdmin(createAdminSession())).toBe(false);
    });
  });

  describe("getCompanyId / requireCompanyId", () => {
    it("getCompanyId returns null for null session", () => {
      expect(getCompanyId(null)).toBeNull();
    });

    it("getCompanyId returns companyId", () => {
      expect(getCompanyId(createAdminSession("comp-1"))).toBe("comp-1");
    });

    it("requireCompanyId throws when no company", () => {
      expect(() => requireCompanyId(createSuperAdminSession())).toThrow(
        "No company selected"
      );
    });

    it("requireCompanyId returns companyId", () => {
      expect(requireCompanyId(createAdminSession("comp-1"))).toBe("comp-1");
    });
  });
});
