import { describe, it, expect } from "vitest";
import {
  createNominationSchema,
  approveNominationSchema,
  rejectNominationSchema,
  bulkApproveNominationsSchema,
  addExternalRaterSchema,
} from "@/lib/validations/nomination";

describe("createNominationSchema", () => {
  it("validates a valid input", () => {
    const result = createNominationSchema.safeParse({
      cycleId: "cycle-1",
      nomineeIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty nomineeIds array", () => {
    const result = createNominationSchema.safeParse({
      cycleId: "cycle-1",
      nomineeIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing cycleId", () => {
    const result = createNominationSchema.safeParse({
      nomineeIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing nomineeIds", () => {
    const result = createNominationSchema.safeParse({ cycleId: "cycle-1" });
    expect(result.success).toBe(false);
  });
});

describe("approveNominationSchema", () => {
  it("validates a valid input", () => {
    const result = approveNominationSchema.safeParse({
      nominationId: "nom-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing nominationId", () => {
    const result = approveNominationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string nominationId", () => {
    const result = approveNominationSchema.safeParse({ nominationId: 123 });
    expect(result.success).toBe(false);
  });
});

describe("rejectNominationSchema", () => {
  it("validates with nominationId only", () => {
    const result = rejectNominationSchema.safeParse({
      nominationId: "nom-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional reason", () => {
    const result = rejectNominationSchema.safeParse({
      nominationId: "nom-1",
      reason: "Not in the same team",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing nominationId", () => {
    const result = rejectNominationSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("bulkApproveNominationsSchema", () => {
  it("validates a valid input", () => {
    const result = bulkApproveNominationsSchema.safeParse({
      nominationIds: ["nom-1", "nom-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = bulkApproveNominationsSchema.safeParse({
      nominationIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing nominationIds", () => {
    const result = bulkApproveNominationsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("addExternalRaterSchema", () => {
  it("validates a valid input", () => {
    const result = addExternalRaterSchema.safeParse({
      cycleId: "cycle-1",
      revieweeId: "user-1",
      email: "external@example.com",
      name: "External Reviewer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = addExternalRaterSchema.safeParse({
      cycleId: "cycle-1",
      revieweeId: "user-1",
      email: "not-an-email",
      name: "External",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = addExternalRaterSchema.safeParse({
      cycleId: "cycle-1",
      revieweeId: "user-1",
      email: "ext@example.com",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      addExternalRaterSchema.safeParse({ cycleId: "c1" }).success
    ).toBe(false);
    expect(
      addExternalRaterSchema.safeParse({
        cycleId: "c1",
        revieweeId: "u1",
        email: "a@b.com",
      }).success
    ).toBe(false);
  });
});
