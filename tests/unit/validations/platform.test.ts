import { describe, it, expect } from "vitest";
import {
  domainSchema,
  updateGlobalRoleSchema,
  createPlatformCompanySchema,
} from "@/lib/validations/platform";

describe("domainSchema", () => {
  it("validates a standard domain", () => {
    const result = domainSchema.safeParse("example.com");
    expect(result.success).toBe(true);
  });

  it("validates a subdomain", () => {
    const result = domainSchema.safeParse("sub.example.com");
    expect(result.success).toBe(true);
  });

  it("transforms to lowercase (only works if input is already lowercase)", () => {
    // The regex enforces lowercase BEFORE transform runs,
    // so the transform only applies to already-valid lowercase input
    const result = domainSchema.parse("example.com");
    expect(result).toBe("example.com");
  });

  it("rejects domain shorter than 3 characters", () => {
    const result = domainSchema.safeParse("ab");
    expect(result.success).toBe(false);
  });

  it("rejects domain without TLD (no dot)", () => {
    const result = domainSchema.safeParse("localhost");
    expect(result.success).toBe(false);
  });

  it("rejects domain starting with a hyphen", () => {
    const result = domainSchema.safeParse("-example.com");
    expect(result.success).toBe(false);
  });

  it("rejects domain ending with a hyphen in a label", () => {
    const result = domainSchema.safeParse("example-.com");
    expect(result.success).toBe(false);
  });

  it("rejects domain with spaces", () => {
    const result = domainSchema.safeParse("example .com");
    expect(result.success).toBe(false);
  });

  it("rejects domain with uppercase after transform check via safeParse", () => {
    // The regex requires lowercase, but transform lowercases first
    // Since transform runs after regex in Zod string chains,
    // uppercase should fail the regex
    const result = domainSchema.safeParse("Example.com");
    // Zod applies regex before transform, so uppercase fails
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = domainSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects non-string input", () => {
    const result = domainSchema.safeParse(123);
    expect(result.success).toBe(false);
  });
});

describe("updateGlobalRoleSchema", () => {
  it("validates a valid input", () => {
    const result = updateGlobalRoleSchema.safeParse({
      userId: "user-1",
      globalRole: "SUPER_ADMIN",
    });
    expect(result.success).toBe(true);
  });

  it("accepts USER role", () => {
    const result = updateGlobalRoleSchema.safeParse({
      userId: "user-1",
      globalRole: "USER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid globalRole", () => {
    const result = updateGlobalRoleSchema.safeParse({
      userId: "user-1",
      globalRole: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = updateGlobalRoleSchema.safeParse({
      userId: "",
      globalRole: "USER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(updateGlobalRoleSchema.safeParse({}).success).toBe(false);
    expect(
      updateGlobalRoleSchema.safeParse({ userId: "u1" }).success
    ).toBe(false);
    expect(
      updateGlobalRoleSchema.safeParse({ globalRole: "USER" }).success
    ).toBe(false);
  });
});

describe("createPlatformCompanySchema", () => {
  it("validates a valid input", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme Corp",
      slug: "acme-corp",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "A",
      slug: "acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug shorter than 2 characters", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme",
      slug: "a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase letters", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme",
      slug: "Acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with special characters", () => {
    expect(
      createPlatformCompanySchema.safeParse({
        name: "Acme",
        slug: "acme_corp",
      }).success
    ).toBe(false);
    expect(
      createPlatformCompanySchema.safeParse({
        name: "Acme",
        slug: "acme.corp",
      }).success
    ).toBe(false);
  });

  it("accepts slug with lowercase, numbers, and hyphens", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme",
      slug: "acme-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(
      createPlatformCompanySchema.safeParse({ name: "Acme" }).success
    ).toBe(false);
    expect(
      createPlatformCompanySchema.safeParse({ slug: "acme" }).success
    ).toBe(false);
  });
});
