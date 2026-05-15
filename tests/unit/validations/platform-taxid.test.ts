/**
 * Dedicated coverage for the taxIdSchema field that recently went from
 * optional → required-with-sentinel. The schema is format-agnostic by design
 * (one field serves NIT/VAT/EIN/etc) but still rejects junk.
 */
import { describe, it, expect } from "vitest";
import {
  taxIdSchema,
  createPlatformCompanySchema,
} from "@/lib/validations/platform";

describe("taxIdSchema", () => {
  it("accepts a Colombian NIT with check digit", () => {
    expect(taxIdSchema.safeParse("900123456-7").success).toBe(true);
  });

  it("accepts a US EIN with dash", () => {
    expect(taxIdSchema.safeParse("12-3456789").success).toBe(true);
  });

  it("accepts a VAT-style id with slash", () => {
    expect(taxIdSchema.safeParse("ES/12345678X").success).toBe(true);
  });

  it("accepts the PENDING sentinel used while a company is still being created", () => {
    expect(taxIdSchema.safeParse("PENDING").success).toBe(true);
  });

  it("trims surrounding whitespace before validation", () => {
    const result = taxIdSchema.safeParse("  900123456-7  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("900123456-7");
  });

  it("rejects whitespace-only input (after trim it's empty)", () => {
    expect(taxIdSchema.safeParse("    ").success).toBe(false);
  });

  it("rejects input shorter than 5 characters", () => {
    expect(taxIdSchema.safeParse("abc1").success).toBe(false);
  });

  it("rejects input longer than 32 characters", () => {
    expect(taxIdSchema.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("rejects illegal characters like underscore, &, *, comma", () => {
    expect(taxIdSchema.safeParse("ABC_12345").success).toBe(false);
    expect(taxIdSchema.safeParse("ABC&12345").success).toBe(false);
    expect(taxIdSchema.safeParse("ABC*12345").success).toBe(false);
    expect(taxIdSchema.safeParse("ABC,12345").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(taxIdSchema.safeParse("").success).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(taxIdSchema.safeParse(123).success).toBe(false);
    expect(taxIdSchema.safeParse(null).success).toBe(false);
    expect(taxIdSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("createPlatformCompanySchema with taxId", () => {
  it("rejects when taxId is missing entirely", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme",
      slug: "acme",
    });
    expect(result.success).toBe(false);
  });

  it("accepts PENDING as the bootstrap sentinel value", () => {
    const result = createPlatformCompanySchema.safeParse({
      name: "Acme",
      slug: "acme",
      taxId: "PENDING",
    });
    expect(result.success).toBe(true);
  });
});
