import { describe, it, expect } from "vitest";
import {
  ROLE_LABELS,
  GLOBAL_ROLE_LABELS,
  REVIEWER_TYPE_LABELS,
  ROLE_HIERARCHY,
  canManageRole,
  isAdmin,
  isManager,
} from "@/lib/constants/roles";

describe("roles constants", () => {
  describe("ROLE_LABELS", () => {
    it("has all company roles (Spanish default)", () => {
      expect(ROLE_LABELS.ADMIN).toBe("Administrador");
      expect(ROLE_LABELS.MANAGER).toBe("Gerente");
      expect(ROLE_LABELS.MEMBER).toBe("Miembro");
    });
  });

  describe("GLOBAL_ROLE_LABELS", () => {
    it("has all global roles (Spanish default)", () => {
      expect(GLOBAL_ROLE_LABELS.SUPER_ADMIN).toBe("Super Admin");
      expect(GLOBAL_ROLE_LABELS.USER).toBe("Usuario");
    });
  });

  describe("REVIEWER_TYPE_LABELS", () => {
    it("has all reviewer types (Spanish default)", () => {
      expect(REVIEWER_TYPE_LABELS.SELF).toBe("Autoevaluación");
      expect(REVIEWER_TYPE_LABELS.MANAGER).toBe("Gerente");
      expect(REVIEWER_TYPE_LABELS.PEER).toBe("Par");
      expect(REVIEWER_TYPE_LABELS.DIRECT_REPORT).toBe("Reporte Directo");
      expect(REVIEWER_TYPE_LABELS.EXTERNAL).toBe("Externo");
    });
  });

  describe("ROLE_HIERARCHY", () => {
    it("ADMIN > MANAGER > MEMBER", () => {
      expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.MANAGER);
      expect(ROLE_HIERARCHY.MANAGER).toBeGreaterThan(ROLE_HIERARCHY.MEMBER);
    });
  });

  describe("canManageRole", () => {
    it("ADMIN can manage MANAGER", () => {
      expect(canManageRole("ADMIN", "MANAGER")).toBe(true);
    });

    it("ADMIN can manage MEMBER", () => {
      expect(canManageRole("ADMIN", "MEMBER")).toBe(true);
    });

    it("MANAGER can manage MEMBER", () => {
      expect(canManageRole("MANAGER", "MEMBER")).toBe(true);
    });

    it("MANAGER cannot manage ADMIN", () => {
      expect(canManageRole("MANAGER", "ADMIN")).toBe(false);
    });

    it("MEMBER cannot manage MANAGER", () => {
      expect(canManageRole("MEMBER", "MANAGER")).toBe(false);
    });

    it("same role cannot manage same role", () => {
      expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
      expect(canManageRole("MANAGER", "MANAGER")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true for ADMIN", () => {
      expect(isAdmin("ADMIN")).toBe(true);
    });

    it("returns false for non-ADMIN", () => {
      expect(isAdmin("MANAGER")).toBe(false);
      expect(isAdmin("MEMBER")).toBe(false);
    });
  });

  describe("isManager", () => {
    it("returns true for MANAGER", () => {
      expect(isManager("MANAGER")).toBe(true);
    });

    it("returns true for ADMIN (admins are also managers)", () => {
      expect(isManager("ADMIN")).toBe(true);
    });

    it("returns false for MEMBER", () => {
      expect(isManager("MEMBER")).toBe(false);
    });
  });
});
