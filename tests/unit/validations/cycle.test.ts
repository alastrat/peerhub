import { describe, it, expect } from "vitest";
import {
  createCycleSchema,
  updateCycleSchema,
  addParticipantsSchema,
  launchCycleSchema,
} from "@/lib/validations/cycle";

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
};

const validCreateInput = {
  name: "Q1 Review Cycle",
  templateId: "tmpl-123",
  reviewStartDate: futureDate(10),
  reviewEndDate: futureDate(40),
};

describe("createCycleSchema", () => {
  it("validates a minimal valid input", () => {
    const result = createCycleSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
  });

  it("validates a complete input with all optional fields", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      description: "Annual review",
      nominationStartDate: futureDate(1),
      nominationEndDate: futureDate(9),
      selfReviewEnabled: true,
      managerReviewEnabled: false,
      peerReviewEnabled: true,
      directReportEnabled: true,
      externalEnabled: false,
      minPeers: 2,
      maxPeers: 5,
      anonymityThreshold: 4,
      employeeNominatePeers: true,
      managerApprovePeers: false,
      participantIds: ["user-1", "user-2"],
      scope: "HUB",
      scopeIds: ["hub-1"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required name", () => {
    const { name, ...rest } = validCreateInput;
    const result = createCycleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCycleSchema.safeParse({ ...validCreateInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing templateId", () => {
    const { templateId, ...rest } = validCreateInput;
    const result = createCycleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty templateId", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      templateId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing review dates", () => {
    expect(
      createCycleSchema.safeParse({
        name: "Test",
        templateId: "t1",
        reviewEndDate: futureDate(10),
      }).success
    ).toBe(false);
    expect(
      createCycleSchema.safeParse({
        name: "Test",
        templateId: "t1",
        reviewStartDate: futureDate(1),
      }).success
    ).toBe(false);
  });

  it("rejects reviewEndDate before reviewStartDate (refine)", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      reviewStartDate: futureDate(40),
      reviewEndDate: futureDate(10),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("reviewEndDate");
    }
  });

  it("rejects maxPeers less than minPeers (refine)", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      minPeers: 5,
      maxPeers: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("maxPeers");
    }
  });

  it("accepts maxPeers equal to minPeers", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      minPeers: 5,
      maxPeers: 5,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for boolean and numeric fields", () => {
    const result = createCycleSchema.parse(validCreateInput);
    expect(result.selfReviewEnabled).toBe(true);
    expect(result.managerReviewEnabled).toBe(true);
    expect(result.peerReviewEnabled).toBe(true);
    expect(result.directReportEnabled).toBe(false);
    expect(result.externalEnabled).toBe(false);
    expect(result.minPeers).toBe(3);
    expect(result.maxPeers).toBe(8);
    expect(result.anonymityThreshold).toBe(3);
    expect(result.scope).toBe("CUSTOM");
  });

  it("rejects minPeers below 0", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      minPeers: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxPeers above 20", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      maxPeers: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects anonymityThreshold below 1 or above 10", () => {
    expect(
      createCycleSchema.safeParse({
        ...validCreateInput,
        anonymityThreshold: 0,
      }).success
    ).toBe(false);
    expect(
      createCycleSchema.safeParse({
        ...validCreateInput,
        anonymityThreshold: 11,
      }).success
    ).toBe(false);
  });

  it("rejects invalid scope enum value", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      scope: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid scope values", () => {
    for (const scope of ["ALL", "HUB", "DEPARTMENT", "TEAM", "CUSTOM"]) {
      const result = createCycleSchema.safeParse({
        ...validCreateInput,
        scope,
      });
      expect(result.success).toBe(true);
    }
  });

  it("coerces date strings to Date objects", () => {
    const result = createCycleSchema.safeParse({
      ...validCreateInput,
      reviewStartDate: "2026-06-01",
      reviewEndDate: "2026-07-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewStartDate).toBeInstanceOf(Date);
      expect(result.data.reviewEndDate).toBeInstanceOf(Date);
    }
  });
});

describe("updateCycleSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateCycleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    expect(
      updateCycleSchema.safeParse({ name: "Updated" }).success
    ).toBe(true);
    expect(
      updateCycleSchema.safeParse({ minPeers: 5 }).success
    ).toBe(true);
    expect(
      updateCycleSchema.safeParse({ description: null }).success
    ).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateCycleSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range numeric values", () => {
    expect(updateCycleSchema.safeParse({ minPeers: -1 }).success).toBe(false);
    expect(updateCycleSchema.safeParse({ maxPeers: 21 }).success).toBe(false);
    expect(updateCycleSchema.safeParse({ anonymityThreshold: 0 }).success).toBe(false);
    expect(updateCycleSchema.safeParse({ anonymityThreshold: 11 }).success).toBe(false);
  });
});

describe("addParticipantsSchema", () => {
  it("validates a valid input", () => {
    const result = addParticipantsSchema.safeParse({
      cycleId: "cycle-1",
      userIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty userIds array", () => {
    const result = addParticipantsSchema.safeParse({
      cycleId: "cycle-1",
      userIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing cycleId", () => {
    const result = addParticipantsSchema.safeParse({
      userIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userIds", () => {
    const result = addParticipantsSchema.safeParse({
      cycleId: "cycle-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("launchCycleSchema", () => {
  it("validates a valid input", () => {
    const result = launchCycleSchema.safeParse({
      cycleId: "cycle-1",
      sendEmails: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults sendEmails to true", () => {
    const result = launchCycleSchema.parse({ cycleId: "cycle-1" });
    expect(result.sendEmails).toBe(true);
  });

  it("rejects missing cycleId", () => {
    const result = launchCycleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string cycleId", () => {
    const result = launchCycleSchema.safeParse({ cycleId: 123 });
    expect(result.success).toBe(false);
  });
});
