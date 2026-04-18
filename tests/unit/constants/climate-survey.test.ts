import { describe, it, expect } from "vitest";
import {
  calculateNPS,
  getNPSCategory,
  CLIMATE_SURVEY_TYPE_LABELS,
  CLIMATE_SURVEY_STATUS_LABELS,
  CLIMATE_SURVEY_STATUS_COLORS,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
  LIKERT_LABELS,
  NPS_CATEGORIES,
  DEFAULT_DIMENSIONS,
} from "@/lib/constants/climate-survey";

// ---------------------------------------------------------------------------
// calculateNPS
// ---------------------------------------------------------------------------

describe("calculateNPS", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateNPS([])).toBe(0);
  });

  it("returns 100 when all ratings are promoters (9-10)", () => {
    expect(calculateNPS([9, 10, 9, 10])).toBe(100);
  });

  it("returns -100 when all ratings are detractors (0-6)", () => {
    expect(calculateNPS([0, 1, 2, 3, 4, 5, 6])).toBe(-100);
  });

  it("returns 0 when all ratings are passives (7-8)", () => {
    expect(calculateNPS([7, 8, 7, 8])).toBe(0);
  });

  it("calculates correctly with a mix of promoters and detractors", () => {
    // 2 promoters, 2 detractors, 1 passive => (2-2)/5 * 100 = 0
    expect(calculateNPS([10, 9, 3, 1, 7])).toBe(0);
  });

  it("rounds the result to the nearest integer", () => {
    // 1 promoter, 0 detractors, 2 passives => (1-0)/3 * 100 = 33.33 => 33
    expect(calculateNPS([9, 7, 8])).toBe(33);
  });

  it("handles a single promoter value", () => {
    expect(calculateNPS([10])).toBe(100);
  });

  it("handles a single detractor value", () => {
    expect(calculateNPS([5])).toBe(-100);
  });

  it("handles a single passive value", () => {
    expect(calculateNPS([7])).toBe(0);
  });

  it("handles boundary value 6 as detractor", () => {
    expect(calculateNPS([6])).toBe(-100);
  });

  it("handles boundary value 9 as promoter", () => {
    expect(calculateNPS([9])).toBe(100);
  });

  it("calculates negative NPS when detractors outnumber promoters", () => {
    // 1 promoter, 3 detractors => (1-3)/4 * 100 = -50
    expect(calculateNPS([10, 2, 3, 4])).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// getNPSCategory
// ---------------------------------------------------------------------------

describe("getNPSCategory", () => {
  it("returns DETRACTOR for scores 0-6", () => {
    for (let i = 0; i <= 6; i++) {
      expect(getNPSCategory(i)).toBe("DETRACTOR");
    }
  });

  it("returns PASSIVE for scores 7-8", () => {
    expect(getNPSCategory(7)).toBe("PASSIVE");
    expect(getNPSCategory(8)).toBe("PASSIVE");
  });

  it("returns PROMOTER for scores 9-10", () => {
    expect(getNPSCategory(9)).toBe("PROMOTER");
    expect(getNPSCategory(10)).toBe("PROMOTER");
  });
});

// ---------------------------------------------------------------------------
// Static constants — structural integrity checks
// ---------------------------------------------------------------------------

describe("climate survey constants", () => {
  it("CLIMATE_SURVEY_TYPE_LABELS covers all expected types", () => {
    expect(Object.keys(CLIMATE_SURVEY_TYPE_LABELS)).toEqual(
      expect.arrayContaining(["CLIMATE", "PULSE", "ENPS"])
    );
  });

  it("CLIMATE_SURVEY_STATUS_LABELS covers all expected statuses", () => {
    expect(Object.keys(CLIMATE_SURVEY_STATUS_LABELS)).toEqual(
      expect.arrayContaining(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"])
    );
  });

  it("CLIMATE_SURVEY_STATUS_COLORS has same keys as STATUS_LABELS", () => {
    expect(Object.keys(CLIMATE_SURVEY_STATUS_COLORS).sort()).toEqual(
      Object.keys(CLIMATE_SURVEY_STATUS_LABELS).sort()
    );
  });

  it("SURVEY_QUESTION_TYPE_LABELS covers expected question types", () => {
    expect(Object.keys(SURVEY_QUESTION_TYPE_LABELS)).toEqual(
      expect.arrayContaining(["LIKERT", "TEXT", "NPS", "RATING"])
    );
  });

  it("SURVEY_FREQUENCY_LABELS covers expected frequencies", () => {
    expect(Object.keys(SURVEY_FREQUENCY_LABELS)).toEqual(
      expect.arrayContaining(["ONCE", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"])
    );
  });

  it("LIKERT_LABELS covers 1-5 scale", () => {
    expect(Object.keys(LIKERT_LABELS).map(Number).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("NPS_CATEGORIES defines DETRACTOR, PASSIVE, and PROMOTER", () => {
    expect(NPS_CATEGORIES.DETRACTOR).toEqual(
      expect.objectContaining({ min: 0, max: 6 })
    );
    expect(NPS_CATEGORIES.PASSIVE).toEqual(
      expect.objectContaining({ min: 7, max: 8 })
    );
    expect(NPS_CATEGORIES.PROMOTER).toEqual(
      expect.objectContaining({ min: 9, max: 10 })
    );
  });

  it("DEFAULT_DIMENSIONS contains at least 5 dimensions with required fields", () => {
    expect(DEFAULT_DIMENSIONS.length).toBeGreaterThanOrEqual(5);
    for (const dim of DEFAULT_DIMENSIONS) {
      expect(dim).toHaveProperty("name");
      expect(dim).toHaveProperty("description");
      expect(dim).toHaveProperty("icon");
      expect(dim.name.length).toBeGreaterThan(0);
    }
  });
});
