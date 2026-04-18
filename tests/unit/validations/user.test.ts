import { describe, it, expect } from "vitest";
import {
  employeeFieldsSchema,
  createUserSchema,
  updateUserSchema,
  updateEmployeeDetailsSchema,
  inviteUserSchema,
  bulkInviteSchema,
  csvImportRowSchema,
} from "@/lib/validations/user";

describe("user validations", () => {
  describe("employeeFieldsSchema", () => {
    it("accepts an empty object (all fields optional)", () => {
      const result = employeeFieldsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts all fields populated", () => {
      const result = employeeFieldsSchema.safeParse({
        title: "Engineer",
        employeeCode: "EMP-001",
        departmentId: "dept-1",
        managerId: "mgr-1",
        hubId: "hub-1",
        startDate: new Date("2024-01-15"),
      });
      expect(result.success).toBe(true);
    });

    it("accepts null values for nullable fields", () => {
      const result = employeeFieldsSchema.safeParse({
        title: null,
        employeeCode: null,
        departmentId: null,
        managerId: null,
        hubId: null,
        startDate: null,
      });
      expect(result.success).toBe(true);
    });

    it("coerces date strings to Date objects", () => {
      const result = employeeFieldsSchema.safeParse({
        startDate: "2024-01-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
      }
    });
  });

  describe("createUserSchema", () => {
    it("accepts valid input", () => {
      const result = createUserSchema.safeParse({
        email: "test@example.com",
        name: "John Doe",
        role: "MEMBER",
      });
      expect(result.success).toBe(true);
    });

    it("defaults role to MEMBER", () => {
      const result = createUserSchema.parse({
        email: "test@example.com",
        name: "John Doe",
      });
      expect(result.role).toBe("MEMBER");
    });

    it("rejects invalid email", () => {
      const result = createUserSchema.safeParse({
        email: "not-an-email",
        name: "John Doe",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short name", () => {
      const result = createUserSchema.safeParse({
        email: "test@example.com",
        name: "J",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional employee fields", () => {
      const result = createUserSchema.safeParse({
        email: "test@example.com",
        name: "John Doe",
        title: "Engineer",
        departmentId: "dept-1",
        managerId: "mgr-1",
        employeeCode: "EMP-001",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid role", () => {
      const result = createUserSchema.safeParse({
        email: "test@example.com",
        name: "John Doe",
        role: "EMPLOYEE", // Old role name should be invalid
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserSchema", () => {
    it("accepts partial updates", () => {
      expect(updateUserSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
      expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
      expect(updateUserSchema.safeParse({ title: "CTO" }).success).toBe(true);
    });

    it("accepts nullable employee fields", () => {
      const result = updateUserSchema.safeParse({
        title: null,
        departmentId: null,
        managerId: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = updateUserSchema.safeParse({ name: "J" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEmployeeDetailsSchema", () => {
    it("accepts org-chart fields", () => {
      const result = updateEmployeeDetailsSchema.safeParse({
        title: "Senior Engineer",
        departmentId: "dept-1",
        managerId: "mgr-1",
        employeeCode: "EMP-001",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null values for clearing fields", () => {
      const result = updateEmployeeDetailsSchema.safeParse({
        title: null,
        departmentId: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateEmployeeDetailsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("inviteUserSchema", () => {
    it("accepts valid invitation", () => {
      const result = inviteUserSchema.safeParse({
        email: "invite@example.com",
        role: "MEMBER",
      });
      expect(result.success).toBe(true);
    });

    it("defaults role to MEMBER", () => {
      const result = inviteUserSchema.parse({
        email: "invite@example.com",
      });
      expect(result.role).toBe("MEMBER");
    });

    it("rejects invalid email", () => {
      const result = inviteUserSchema.safeParse({
        email: "bad",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bulkInviteSchema", () => {
    it("validates a valid input with one invitation", () => {
      const result = bulkInviteSchema.safeParse({
        invitations: [{ email: "a@b.com", role: "MEMBER" }],
      });
      expect(result.success).toBe(true);
    });

    it("validates multiple invitations", () => {
      const result = bulkInviteSchema.safeParse({
        invitations: [
          { email: "a@b.com" },
          { email: "c@d.com", role: "ADMIN" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty invitations array", () => {
      const result = bulkInviteSchema.safeParse({ invitations: [] });
      expect(result.success).toBe(false);
    });

    it("rejects missing invitations", () => {
      const result = bulkInviteSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects when any invitation has invalid email", () => {
      const result = bulkInviteSchema.safeParse({
        invitations: [
          { email: "valid@example.com" },
          { email: "not-valid" },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("csvImportRowSchema", () => {
    it("accepts valid row", () => {
      const result = csvImportRowSchema.safeParse({
        email: "test@example.com",
        name: "John Doe",
        title: "Engineer",
        department: "Engineering",
        role: "MEMBER",
      });
      expect(result.success).toBe(true);
    });

    it("requires email and name", () => {
      expect(csvImportRowSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
      expect(csvImportRowSchema.safeParse({ name: "John" }).success).toBe(false);
    });

    it("rejects invalid role in CSV", () => {
      const result = csvImportRowSchema.safeParse({
        email: "test@example.com",
        name: "John",
        role: "EMPLOYEE",
      });
      expect(result.success).toBe(false);
    });
  });
});
