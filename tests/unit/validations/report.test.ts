import { describe, it, expect } from "vitest";
import {
  exportOptionsSchema,
  releaseReportSchema,
  releaseAllReportsSchema,
} from "@/lib/validations/report";

describe("exportOptionsSchema", () => {
  it("validates a minimal valid input", () => {
    const result = exportOptionsSchema.safeParse({ format: "csv" });
    expect(result.success).toBe(true);
  });

  it("validates a complete input", () => {
    const result = exportOptionsSchema.safeParse({
      format: "pdf",
      includeTextResponses: false,
      includeRatings: true,
      includeCharts: true,
      anonymize: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts both valid format values", () => {
    expect(exportOptionsSchema.safeParse({ format: "csv" }).success).toBe(true);
    expect(exportOptionsSchema.safeParse({ format: "pdf" }).success).toBe(true);
  });

  it("rejects invalid format value", () => {
    expect(exportOptionsSchema.safeParse({ format: "xlsx" }).success).toBe(false);
    expect(exportOptionsSchema.safeParse({ format: "json" }).success).toBe(false);
  });

  it("applies correct defaults", () => {
    const result = exportOptionsSchema.parse({ format: "csv" });
    expect(result.includeTextResponses).toBe(true);
    expect(result.includeRatings).toBe(true);
    expect(result.includeCharts).toBe(false);
    expect(result.anonymize).toBe(true);
  });

  it("rejects missing format", () => {
    const result = exportOptionsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean for boolean fields", () => {
    const result = exportOptionsSchema.safeParse({
      format: "csv",
      anonymize: "yes",
    });
    expect(result.success).toBe(false);
  });
});

// Use a valid CUID for testing. Prisma CUIDs look like "clxxxxxxxxxxxxxxxxxxxxxxxxx"
const validCuid = "clh1234567890abcdefghijklm";

describe("releaseReportSchema", () => {
  it("validates a valid input", () => {
    const result = releaseReportSchema.safeParse({
      cycleId: validCuid,
      participantId: validCuid,
      sendEmail: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults sendEmail to true", () => {
    const result = releaseReportSchema.parse({
      cycleId: validCuid,
      participantId: validCuid,
    });
    expect(result.sendEmail).toBe(true);
  });

  it("rejects non-CUID cycleId", () => {
    const result = releaseReportSchema.safeParse({
      cycleId: "not-a-cuid",
      participantId: validCuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-CUID participantId", () => {
    const result = releaseReportSchema.safeParse({
      cycleId: validCuid,
      participantId: "not-a-cuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(releaseReportSchema.safeParse({}).success).toBe(false);
    expect(
      releaseReportSchema.safeParse({ cycleId: validCuid }).success
    ).toBe(false);
  });
});

describe("releaseAllReportsSchema", () => {
  it("validates a valid input", () => {
    const result = releaseAllReportsSchema.safeParse({
      cycleId: validCuid,
      sendEmails: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults sendEmails to true", () => {
    const result = releaseAllReportsSchema.parse({ cycleId: validCuid });
    expect(result.sendEmails).toBe(true);
  });

  it("rejects non-CUID cycleId", () => {
    const result = releaseAllReportsSchema.safeParse({
      cycleId: "bad-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing cycleId", () => {
    const result = releaseAllReportsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
