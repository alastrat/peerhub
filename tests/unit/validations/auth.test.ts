import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  companySetupSchema,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("validates a valid email", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(loginSchema.safeParse({ email: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "not-email" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "@no-local.com" }).success).toBe(false);
  });

  it("rejects non-string email", () => {
    expect(loginSchema.safeParse({ email: 123 }).success).toBe(false);
    expect(loginSchema.safeParse({ email: true }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("validates email only (name is optional)", () => {
    const result = signupSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("validates email with name", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      name: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      name: "J",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 2 characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      name: "Jo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("companySetupSchema", () => {
  it("validates a complete valid input", () => {
    const result = companySetupSchema.safeParse({
      companyName: "Acme Corp",
      slug: "acme-corp",
    });
    expect(result.success).toBe(true);
  });

  it("rejects companyName shorter than 2 characters", () => {
    const result = companySetupSchema.safeParse({
      companyName: "A",
      slug: "acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects companyName longer than 100 characters", () => {
    const result = companySetupSchema.safeParse({
      companyName: "A".repeat(101),
      slug: "acme",
    });
    expect(result.success).toBe(false);
  });

  it("accepts companyName at boundary lengths (2 and 100)", () => {
    expect(
      companySetupSchema.safeParse({ companyName: "AB", slug: "ab" }).success
    ).toBe(true);
    expect(
      companySetupSchema.safeParse({
        companyName: "A".repeat(100),
        slug: "ab",
      }).success
    ).toBe(true);
  });

  it("rejects slug shorter than 2 characters", () => {
    const result = companySetupSchema.safeParse({
      companyName: "Acme",
      slug: "a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug longer than 50 characters", () => {
    const result = companySetupSchema.safeParse({
      companyName: "Acme",
      slug: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase letters", () => {
    const result = companySetupSchema.safeParse({
      companyName: "Acme",
      slug: "Acme-Corp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = companySetupSchema.safeParse({
      companyName: "Acme",
      slug: "acme corp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with special characters", () => {
    expect(
      companySetupSchema.safeParse({ companyName: "Acme", slug: "acme_corp" })
        .success
    ).toBe(false);
    expect(
      companySetupSchema.safeParse({ companyName: "Acme", slug: "acme.corp" })
        .success
    ).toBe(false);
  });

  it("accepts slug with lowercase letters, numbers, and hyphens", () => {
    expect(
      companySetupSchema.safeParse({ companyName: "Acme", slug: "acme-123" })
        .success
    ).toBe(true);
    expect(
      companySetupSchema.safeParse({ companyName: "Acme", slug: "99-corp" })
        .success
    ).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(companySetupSchema.safeParse({ companyName: "Acme" }).success).toBe(
      false
    );
    expect(companySetupSchema.safeParse({ slug: "acme" }).success).toBe(false);
    expect(companySetupSchema.safeParse({}).success).toBe(false);
  });
});
