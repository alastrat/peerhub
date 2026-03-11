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
    it("has all company roles", () => {
      expect(ROLE_LABELS.ADMIN).toBe("Admin");
      expect(ROLE_LABELS.MANAGER).toBe("Manager");
      expect(ROLE_LABELS.MEMBER).toBe("Member");
    });
  });

  describe("GLOBAL_ROLE_LABELS", () => {
    it("has all global roles", () => {
      expect(GLOBAL_ROLE_LABELS.SUPER_ADMIN).toBe("Super Admin");
      expect(GLOBAL_ROLE_LABELS.USER).toBe("User");
    });
  });

  describe("REVIEWER_TYPE_LABELS", () => {
    it("has all reviewer types", () => {
      expect(REVIEWER_TYPE_LABELS.SELF).toBe("Self");
      expect(REVIEWER_TYPE_LABELS.MANAGER).toBe("Manager");
      expect(REVIEWER_TYPE_LABELS.PEER).toBe("Peer");
      expect(REVIEWER_TYPE_LABELS.DIRECT_REPORT).toBe("Direct Report");
      expect(REVIEWER_TYPE_LABELS.EXTERNAL).toBe("External");
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
