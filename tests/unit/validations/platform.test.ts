import { describe, it, expect } from "vitest";
import {
  domainSchema,
  updateGlobalRoleSchema,
  createPlatformCompanySchema,
  createPlatformCompanyWithAdminSchema,
  personalInfoSchema,
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

describe("createPlatformCompanyWithAdminSchema", () => {
  it("validates a valid input", () => {
    const result = createPlatformCompanyWithAdminSchema.safeParse({
      name: "Acme Corp",
      slug: "acme-corp",
      adminEmail: "admin@acme.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid admin email", () => {
    const result = createPlatformCompanyWithAdminSchema.safeParse({
      name: "Acme",
      slug: "acme",
      adminEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing adminEmail", () => {
    const result = createPlatformCompanyWithAdminSchema.safeParse({
      name: "Acme",
      slug: "acme",
    });
    expect(result.success).toBe(false);
  });

  it("inherits name + slug validation from createPlatformCompanySchema", () => {
    expect(
      createPlatformCompanyWithAdminSchema.safeParse({
        name: "A",
        slug: "acme",
        adminEmail: "x@y.com",
      }).success
    ).toBe(false);
    expect(
      createPlatformCompanyWithAdminSchema.safeParse({
        name: "Acme",
        slug: "Acme",
        adminEmail: "x@y.com",
      }).success
    ).toBe(false);
  });
});

describe("personalInfoSchema", () => {
  it("validates a complete input", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+573001234567",
      jobTitle: "People Operations Lead",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty phone", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "",
      jobTitle: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an undefined phone", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a phone without country code", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "3001234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone with letters", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+57abc1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty lastName", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects firstName longer than 50 chars", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "x".repeat(51),
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects jobTitle longer than 100 chars", () => {
    const result = personalInfoSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      jobTitle: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
