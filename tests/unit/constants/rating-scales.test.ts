import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATING_SCALE,
  RATING_SCALE_OPTIONS,
  getRatingLabel,
  getRatingColor,
  getRatingBgColor,
} from "@/lib/constants/rating-scales";

describe("DEFAULT_RATING_SCALE", () => {
  it("is the 1-5 scale", () => {
    expect(DEFAULT_RATING_SCALE.min).toBe(1);
    expect(DEFAULT_RATING_SCALE.max).toBe(5);
  });

  it("has labels for each value", () => {
    expect(DEFAULT_RATING_SCALE.labels[1]).toBe("Needs Improvement");
    expect(DEFAULT_RATING_SCALE.labels[5]).toBe("Outstanding");
  });
});

describe("RATING_SCALE_OPTIONS", () => {
  it("exposes three scales (1-5, 1-4, 1-10)", () => {
    expect(RATING_SCALE_OPTIONS.map((o) => o.id)).toEqual(["1-5", "1-4", "1-10"]);
  });

  it("each option has min, max, name, labels", () => {
    for (const opt of RATING_SCALE_OPTIONS) {
      expect(opt).toHaveProperty("min");
      expect(opt).toHaveProperty("max");
      expect(opt).toHaveProperty("name");
      expect(opt).toHaveProperty("labels");
    }
  });
});

describe("getRatingLabel", () => {
  it("returns the label for a defined value", () => {
    expect(getRatingLabel(3)).toBe("Meets Expectations");
  });

  it("falls back to the numeric string when value is not in scale", () => {
    expect(getRatingLabel(99)).toBe("99");
  });

  it("accepts a custom scale", () => {
    const scale = {
      min: 1,
      max: 3,
      labels: { 1: "Bad", 2: "OK", 3: "Great" },
    } as unknown as typeof DEFAULT_RATING_SCALE;
    expect(getRatingLabel(2, scale)).toBe("OK");
  });
});

describe("getRatingColor", () => {
  it("returns green for the top 20% of the scale", () => {
    expect(getRatingColor(5, 5)).toBe("text-green-600");
    expect(getRatingColor(8, 10)).toBe("text-green-600"); // 0.8 boundary
  });

  it("returns blue for 60-79% of the scale", () => {
    expect(getRatingColor(3, 5)).toBe("text-blue-600"); // 0.6
    expect(getRatingColor(6, 10)).toBe("text-blue-600"); // 0.6
    expect(getRatingColor(7, 10)).toBe("text-blue-600"); // 0.7
  });

  it("returns amber for 40-59% of the scale", () => {
    expect(getRatingColor(2, 5)).toBe("text-amber-600"); // 0.4
  });

  it("returns red for <40% of the scale", () => {
    expect(getRatingColor(1, 5)).toBe("text-red-600");
    expect(getRatingColor(0, 5)).toBe("text-red-600");
  });

  it("defaults max to 5 when omitted", () => {
    expect(getRatingColor(5)).toBe("text-green-600");
  });
});

describe("getRatingBgColor", () => {
  it("returns green-100 for top 20%", () => {
    expect(getRatingBgColor(5, 5)).toBe("bg-green-100");
  });

  it("returns blue-100 for 60-79%", () => {
    expect(getRatingBgColor(3, 5)).toBe("bg-blue-100");
  });

  it("returns amber-100 for 40-59%", () => {
    expect(getRatingBgColor(2, 5)).toBe("bg-amber-100");
  });

  it("returns red-100 for <40%", () => {
    expect(getRatingBgColor(1, 5)).toBe("bg-red-100");
  });
});
