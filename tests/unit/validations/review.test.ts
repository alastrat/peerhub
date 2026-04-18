import { describe, it, expect } from "vitest";
import {
  reviewResponseSchema,
  saveReviewProgressSchema,
  submitReviewSchema,
  declineReviewSchema,
  tokenReviewSchema,
} from "@/lib/validations/review";

const validResponse = {
  questionId: "q-1",
  ratingValue: 5,
  textValue: "Great work",
};

describe("reviewResponseSchema", () => {
  it("validates a complete response", () => {
    const result = reviewResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("requires questionId", () => {
    const result = reviewResponseSchema.safeParse({ ratingValue: 5 });
    expect(result.success).toBe(false);
  });

  it("accepts rating-only response", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      ratingValue: 3,
    });
    expect(result.success).toBe(true);
  });

  it("accepts text-only response", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      textValue: "Some feedback",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null ratingValue and textValue", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      ratingValue: null,
      textValue: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects ratingValue below 1", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      ratingValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects ratingValue above 10", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      ratingValue: 11,
    });
    expect(result.success).toBe(false);
  });

  it("accepts ratingValue at boundaries (1 and 10)", () => {
    expect(
      reviewResponseSchema.safeParse({ questionId: "q-1", ratingValue: 1 }).success
    ).toBe(true);
    expect(
      reviewResponseSchema.safeParse({ questionId: "q-1", ratingValue: 10 }).success
    ).toBe(true);
  });

  it("accepts selectedOptions", () => {
    const result = reviewResponseSchema.safeParse({
      questionId: "q-1",
      selectedOptions: ["opt-a", "opt-b"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts questionId-only (minimal)", () => {
    const result = reviewResponseSchema.safeParse({ questionId: "q-1" });
    expect(result.success).toBe(true);
  });
});

describe("saveReviewProgressSchema", () => {
  it("validates a valid input", () => {
    const result = saveReviewProgressSchema.safeParse({
      assignmentId: "assign-1",
      responses: [validResponse],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty responses array", () => {
    const result = saveReviewProgressSchema.safeParse({
      assignmentId: "assign-1",
      responses: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing assignmentId", () => {
    const result = saveReviewProgressSchema.safeParse({
      responses: [validResponse],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing responses", () => {
    const result = saveReviewProgressSchema.safeParse({
      assignmentId: "assign-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitReviewSchema", () => {
  it("validates a valid input", () => {
    const result = submitReviewSchema.safeParse({
      assignmentId: "assign-1",
      responses: [validResponse],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing assignmentId", () => {
    const result = submitReviewSchema.safeParse({
      responses: [validResponse],
    });
    expect(result.success).toBe(false);
  });
});

describe("declineReviewSchema", () => {
  it("validates with assignmentId only", () => {
    const result = declineReviewSchema.safeParse({ assignmentId: "assign-1" });
    expect(result.success).toBe(true);
  });

  it("accepts optional reason", () => {
    const result = declineReviewSchema.safeParse({
      assignmentId: "assign-1",
      reason: "Conflict of interest",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing assignmentId", () => {
    const result = declineReviewSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("tokenReviewSchema", () => {
  it("validates a valid input", () => {
    const result = tokenReviewSchema.safeParse({
      token: "abc-123-token",
      responses: [validResponse],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const result = tokenReviewSchema.safeParse({
      responses: [validResponse],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing responses", () => {
    const result = tokenReviewSchema.safeParse({ token: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects non-string token", () => {
    const result = tokenReviewSchema.safeParse({
      token: 123,
      responses: [],
    });
    expect(result.success).toBe(false);
  });
});
