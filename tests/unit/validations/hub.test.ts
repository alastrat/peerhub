import { describe, it, expect } from "vitest";
import { createHubSchema, updateHubSchema } from "@/lib/validations/hub";

describe("createHubSchema", () => {
  it("validates a minimal valid input", () => {
    const result = createHubSchema.safeParse({ name: "HQ" });
    expect(result.success).toBe(true);
  });

  it("validates a complete input", () => {
    const result = createHubSchema.safeParse({
      name: "Headquarters",
      description: "Main office",
      address: "123 Main Street, NY 10001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createHubSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createHubSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name at boundary (1 and 100 characters)", () => {
    expect(createHubSchema.safeParse({ name: "A" }).success).toBe(true);
    expect(createHubSchema.safeParse({ name: "A".repeat(100) }).success).toBe(true);
  });

  it("rejects description longer than 500 characters", () => {
    const result = createHubSchema.safeParse({
      name: "Hub",
      description: "D".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 300 characters", () => {
    const result = createHubSchema.safeParse({
      name: "Hub",
      address: "A".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("accepts address at boundary (300 characters)", () => {
    const result = createHubSchema.safeParse({
      name: "Hub",
      address: "A".repeat(300),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createHubSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateHubSchema", () => {
  it("validates a valid input", () => {
    const result = updateHubSchema.safeParse({ name: "Updated Hub" });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateHubSchema.safeParse({
      name: "Hub",
      description: null,
      address: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateHubSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = updateHubSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters", () => {
    const result = updateHubSchema.safeParse({
      name: "Hub",
      description: "D".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 300 characters", () => {
    const result = updateHubSchema.safeParse({
      name: "Hub",
      address: "A".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});
