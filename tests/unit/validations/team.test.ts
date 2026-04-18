import { describe, it, expect } from "vitest";
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from "@/lib/validations/team";

describe("createTeamSchema", () => {
  it("validates a minimal valid input", () => {
    const result = createTeamSchema.safeParse({ name: "Engineering" });
    expect(result.success).toBe(true);
  });

  it("validates a complete input", () => {
    const result = createTeamSchema.safeParse({
      name: "Engineering",
      description: "Core engineering team",
      hubId: "hub-1",
      departmentId: "dept-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createTeamSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createTeamSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name at boundary (1 and 100 characters)", () => {
    expect(createTeamSchema.safeParse({ name: "A" }).success).toBe(true);
    expect(createTeamSchema.safeParse({ name: "A".repeat(100) }).success).toBe(true);
  });

  it("rejects description longer than 500 characters", () => {
    const result = createTeamSchema.safeParse({
      name: "Team",
      description: "D".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at boundary (500 characters)", () => {
    const result = createTeamSchema.safeParse({
      name: "Team",
      description: "D".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createTeamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateTeamSchema", () => {
  it("validates a valid input", () => {
    const result = updateTeamSchema.safeParse({ name: "Updated Team" });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateTeamSchema.safeParse({
      name: "Team",
      description: null,
      hubId: null,
      departmentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateTeamSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = updateTeamSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters", () => {
    const result = updateTeamSchema.safeParse({
      name: "Team",
      description: "D".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("addTeamMemberSchema", () => {
  it("validates a valid input", () => {
    const result = addTeamMemberSchema.safeParse({
      employeeId: "emp-1",
      role: "MEMBER",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to MEMBER", () => {
    const result = addTeamMemberSchema.parse({ employeeId: "emp-1" });
    expect(result.role).toBe("MEMBER");
  });

  it("accepts LEAD role", () => {
    const result = addTeamMemberSchema.safeParse({
      employeeId: "emp-1",
      role: "LEAD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = addTeamMemberSchema.safeParse({
      employeeId: "emp-1",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty employeeId", () => {
    const result = addTeamMemberSchema.safeParse({ employeeId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing employeeId", () => {
    const result = addTeamMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
