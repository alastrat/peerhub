import { describe, it, expect, vi } from "vitest";
import {
  shuffleArray,
  aggregateRatings,
  aggregateTextResponses,
  groupResponsesByReviewerType,
  calculateOverallScore,
  categorizeTextFeedback,
} from "@/lib/utils/anonymity";

describe("anonymity utils", () => {
  // ──────────────────────────────────────────────
  // shuffleArray
  // ──────────────────────────────────────────────
  describe("shuffleArray", () => {
    it("returns a new array with the same elements", () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input);
      expect(result).toHaveLength(input.length);
      expect(result.sort()).toEqual(input.sort());
    });

    it("does not mutate the original array", () => {
      const input = [1, 2, 3];
      const copy = [...input];
      shuffleArray(input);
      expect(input).toEqual(copy);
    });

    it("returns an empty array when given an empty array", () => {
      expect(shuffleArray([])).toEqual([]);
    });

    it("returns a single-element array unchanged", () => {
      expect(shuffleArray([42])).toEqual([42]);
    });
  });

  // ──────────────────────────────────────────────
  // aggregateRatings
  // ──────────────────────────────────────────────
  describe("aggregateRatings", () => {
    it("returns aggregated ratings when count meets threshold", () => {
      const responses = [
        { ratingValue: 4 },
        { ratingValue: 5 },
        { ratingValue: 3 },
      ];
      const result = aggregateRatings(responses, 3);
      expect(result.isVisible).toBe(true);
      expect(result.ratings).toBeDefined();
      expect(result.ratings!.average).toBe(4);
      expect(result.ratings!.count).toBe(3);
      expect(result.ratings!.distribution).toEqual({ 3: 1, 4: 1, 5: 1 });
    });

    it("returns not visible when count is below threshold", () => {
      const responses = [{ ratingValue: 4 }, { ratingValue: 5 }];
      const result = aggregateRatings(responses, 3);
      expect(result.isVisible).toBe(false);
      expect(result.message).toContain("Minimum 3 responses required");
      expect(result.ratings).toBeUndefined();
    });

    it("filters out null and undefined rating values", () => {
      const responses = [
        { ratingValue: 4 },
        { ratingValue: null },
        { ratingValue: undefined },
        { ratingValue: 5 },
        { ratingValue: 3 },
      ];
      const result = aggregateRatings(responses, 3);
      expect(result.isVisible).toBe(true);
      expect(result.ratings!.count).toBe(3);
    });

    it("handles empty responses array", () => {
      const result = aggregateRatings([], 1);
      expect(result.isVisible).toBe(false);
    });

    it("rounds average to two decimal places", () => {
      const responses = [
        { ratingValue: 3 },
        { ratingValue: 3 },
        { ratingValue: 4 },
      ];
      const result = aggregateRatings(responses, 1);
      // (3 + 3 + 4) / 3 = 3.333...
      expect(result.ratings!.average).toBe(3.33);
    });

    it("builds correct distribution for duplicate ratings", () => {
      const responses = [
        { ratingValue: 5 },
        { ratingValue: 5 },
        { ratingValue: 5 },
        { ratingValue: 3 },
      ];
      const result = aggregateRatings(responses, 1);
      expect(result.ratings!.distribution).toEqual({ 5: 3, 3: 1 });
    });

    it("works with threshold of 1", () => {
      const result = aggregateRatings([{ ratingValue: 4 }], 1);
      expect(result.isVisible).toBe(true);
      expect(result.ratings!.count).toBe(1);
    });

    it("returns not visible when all values are null", () => {
      const responses = [
        { ratingValue: null },
        { ratingValue: null },
      ];
      const result = aggregateRatings(responses, 1);
      expect(result.isVisible).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // aggregateTextResponses
  // ──────────────────────────────────────────────
  describe("aggregateTextResponses", () => {
    it("returns shuffled text responses when count meets threshold", () => {
      const responses = [
        { textValue: "Great work" },
        { textValue: "Needs improvement" },
        { textValue: "Solid effort" },
      ];
      const result = aggregateTextResponses(responses, 3);
      expect(result.isVisible).toBe(true);
      expect(result.textResponses).toBeDefined();
      expect(result.textResponses!.sort()).toEqual(
        ["Great work", "Needs improvement", "Solid effort"].sort()
      );
    });

    it("returns not visible when count is below threshold", () => {
      const responses = [{ textValue: "Only one" }];
      const result = aggregateTextResponses(responses, 3);
      expect(result.isVisible).toBe(false);
      expect(result.message).toContain("Minimum 3 responses required");
    });

    it("filters out null, undefined, and whitespace-only text values", () => {
      const responses = [
        { textValue: "Good" },
        { textValue: null },
        { textValue: undefined },
        { textValue: "   " },
        { textValue: "" },
        { textValue: "Nice" },
        { textValue: "Well done" },
      ];
      const result = aggregateTextResponses(responses, 3);
      expect(result.isVisible).toBe(true);
      expect(result.textResponses).toHaveLength(3);
    });

    it("handles empty responses array", () => {
      const result = aggregateTextResponses([], 1);
      expect(result.isVisible).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // groupResponsesByReviewerType
  // ──────────────────────────────────────────────
  describe("groupResponsesByReviewerType", () => {
    it("groups responses by reviewer type and applies threshold", () => {
      const responses = [
        { ratingValue: 5, reviewerType: "SELF" as const },
        { ratingValue: 4, reviewerType: "MANAGER" as const },
        { ratingValue: 3, reviewerType: "PEER" as const },
        { ratingValue: 4, reviewerType: "PEER" as const },
        { ratingValue: 5, reviewerType: "PEER" as const },
      ];
      const result = groupResponsesByReviewerType(responses, 3);

      // SELF always shown (threshold=1)
      expect(result.SELF.isVisible).toBe(true);
      // MANAGER always shown (threshold=1)
      expect(result.MANAGER.isVisible).toBe(true);
      // PEER has 3 responses, meets threshold=3
      expect(result.PEER.isVisible).toBe(true);
      expect(result.PEER.ratings!.count).toBe(3);
    });

    it("hides PEER group when below threshold", () => {
      const responses = [
        { ratingValue: 4, reviewerType: "PEER" as const },
        { ratingValue: 5, reviewerType: "PEER" as const },
      ];
      const result = groupResponsesByReviewerType(responses, 3);
      expect(result.PEER.isVisible).toBe(false);
    });

    it("uses threshold=1 for SELF and MANAGER regardless of setting", () => {
      const responses = [
        { ratingValue: 5, reviewerType: "SELF" as const },
        { ratingValue: 4, reviewerType: "MANAGER" as const },
      ];
      const result = groupResponsesByReviewerType(responses, 10);
      expect(result.SELF.isVisible).toBe(true);
      expect(result.MANAGER.isVisible).toBe(true);
    });

    it("applies threshold to DIRECT_REPORT and EXTERNAL types", () => {
      const responses = [
        { ratingValue: 4, reviewerType: "DIRECT_REPORT" as const },
        { ratingValue: 3, reviewerType: "EXTERNAL" as const },
      ];
      const result = groupResponsesByReviewerType(responses, 2);
      expect(result.DIRECT_REPORT.isVisible).toBe(false);
      expect(result.EXTERNAL.isVisible).toBe(false);
    });

    it("handles empty responses array", () => {
      const result = groupResponsesByReviewerType([], 3);
      expect(result.SELF.isVisible).toBe(false);
      expect(result.PEER.isVisible).toBe(false);
    });

    it("returns all five reviewer types", () => {
      const result = groupResponsesByReviewerType([], 1);
      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "EXTERNAL"])
      );
    });
  });

  // ──────────────────────────────────────────────
  // calculateOverallScore
  // ──────────────────────────────────────────────
  describe("calculateOverallScore", () => {
    it("calculates weighted overall score with default weights", () => {
      const grouped = {
        SELF: { isVisible: true, ratings: { average: 4, count: 1, distribution: { 4: 1 } } },
        MANAGER: { isVisible: true, ratings: { average: 5, count: 1, distribution: { 5: 1 } } },
        PEER: { isVisible: true, ratings: { average: 3, count: 3, distribution: { 3: 3 } } },
        DIRECT_REPORT: { isVisible: true, ratings: { average: 4, count: 2, distribution: { 4: 2 } } },
        EXTERNAL: { isVisible: true, ratings: { average: 3, count: 1, distribution: { 3: 1 } } },
      };
      const result = calculateOverallScore(grouped);
      expect(result).not.toBeNull();
      expect(result!.count).toBe(8);
      // weighted: (4*0.1 + 5*0.3 + 3*0.3 + 4*0.2 + 3*0.1) / 1.0 = 3.9
      expect(result!.score).toBe(3.9);
    });

    it("returns null when no visible results exist", () => {
      const grouped = {
        SELF: { isVisible: false, message: "Not enough" },
        MANAGER: { isVisible: false, message: "Not enough" },
        PEER: { isVisible: false, message: "Not enough" },
        DIRECT_REPORT: { isVisible: false, message: "Not enough" },
        EXTERNAL: { isVisible: false, message: "Not enough" },
      };
      const result = calculateOverallScore(grouped);
      expect(result).toBeNull();
    });

    it("ignores non-visible groups in the calculation", () => {
      const grouped = {
        SELF: { isVisible: true, ratings: { average: 4, count: 1, distribution: { 4: 1 } } },
        MANAGER: { isVisible: true, ratings: { average: 5, count: 1, distribution: { 5: 1 } } },
        PEER: { isVisible: false, message: "Not enough" },
        DIRECT_REPORT: { isVisible: false, message: "Not enough" },
        EXTERNAL: { isVisible: false, message: "Not enough" },
      };
      const result = calculateOverallScore(grouped);
      expect(result).not.toBeNull();
      expect(result!.count).toBe(2);
      // weighted: (4*0.1 + 5*0.3) / (0.1 + 0.3) = 1.9 / 0.4 = 4.75
      expect(result!.score).toBe(4.75);
    });

    it("accepts custom weights that override defaults", () => {
      const grouped = {
        SELF: { isVisible: true, ratings: { average: 4, count: 1, distribution: { 4: 1 } } },
        MANAGER: { isVisible: true, ratings: { average: 5, count: 1, distribution: { 5: 1 } } },
        PEER: { isVisible: false, message: "Not enough" },
        DIRECT_REPORT: { isVisible: false, message: "Not enough" },
        EXTERNAL: { isVisible: false, message: "Not enough" },
      };
      const result = calculateOverallScore(grouped, { SELF: 0.5, MANAGER: 0.5 });
      expect(result).not.toBeNull();
      // (4*0.5 + 5*0.5) / 1.0 = 4.5
      expect(result!.score).toBe(4.5);
    });
  });

  // ──────────────────────────────────────────────
  // categorizeTextFeedback
  // ──────────────────────────────────────────────
  describe("categorizeTextFeedback", () => {
    it("categorizes feedback based on questionType", () => {
      const responses = [
        { textValue: "Communication skills", questionType: "strength" },
        { textValue: "Time management", questionType: "opportunity" },
      ];
      const result = categorizeTextFeedback(responses);
      expect(result.strengths).toContain("Communication skills");
      expect(result.opportunities).toContain("Time management");
    });

    it("categorizes feedback based on keyword heuristics", () => {
      const responses = [
        { textValue: "They excel at leadership" },
        { textValue: "Great at problem solving" },
        { textValue: "This is an impressive ability" },
        { textValue: "Does the job well" },
        { textValue: "Could improve delegation" },
      ];
      const result = categorizeTextFeedback(responses);
      expect(result.strengths).toContain("They excel at leadership");
      expect(result.strengths).toContain("Great at problem solving");
      expect(result.strengths).toContain("This is an impressive ability");
      expect(result.strengths).toContain("Does the job well");
      expect(result.opportunities).toContain("Could improve delegation");
    });

    it("filters out null, undefined, and whitespace-only text", () => {
      const responses = [
        { textValue: null },
        { textValue: undefined },
        { textValue: "   " },
        { textValue: "" },
        { textValue: "A strength area" },
      ];
      const result = categorizeTextFeedback(responses);
      const total = result.strengths.length + result.opportunities.length;
      expect(total).toBe(1);
    });

    it("handles empty responses array", () => {
      const result = categorizeTextFeedback([]);
      expect(result.strengths).toEqual([]);
      expect(result.opportunities).toEqual([]);
    });

    it("puts text with keyword 'strength' into strengths", () => {
      const responses = [
        { textValue: "A key strength is communication" },
      ];
      const result = categorizeTextFeedback(responses);
      expect(result.strengths).toContain("A key strength is communication");
    });

    it("puts unrecognized text into opportunities", () => {
      const responses = [
        { textValue: "Could use more training" },
      ];
      const result = categorizeTextFeedback(responses);
      expect(result.opportunities).toContain("Could use more training");
    });
  });
});
