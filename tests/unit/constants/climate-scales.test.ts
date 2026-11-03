import { describe, it, expect } from "vitest";
import {
  CLIMATE_SCALES,
  getQuestionScale,
  getScaleValues,
  getScaleAnchor,
  isScaleKey,
  scalePercent,
} from "@/lib/constants/climate-scales";
import {
  INSTRUMENT_DIMENSIONS,
  INSTRUMENT_VERSION,
  instrumentItemConfig,
  getInstrumentItemCode,
  isLockedQuestion,
  getInstrumentDimensionCode,
} from "@/lib/constants/climate-instrument";

describe("getQuestionScale", () => {
  it("defaults LIKERT questions without a scale to the 4-point frequency scale the portal shows", () => {
    expect(getQuestionScale({ type: "LIKERT" })?.key).toBe("FREQ_4");
    expect(getQuestionScale({ type: "LIKERT", config: null })?.key).toBe("FREQ_4");
    expect(getQuestionScale({ type: "LIKERT", config: { scale: "BOGUS" } })?.key).toBe("FREQ_4");
  });

  it("reads the scale from config", () => {
    expect(getQuestionScale({ type: "LIKERT", config: { scale: "AGREE_5" } })?.key).toBe("AGREE_5");
  });

  it("maps other types", () => {
    expect(getQuestionScale({ type: "RATING" })?.key).toBe("NUMERIC_5");
    expect(getQuestionScale({ type: "NPS" })?.key).toBe("NPS_11");
    expect(getQuestionScale({ type: "TEXT" })).toBeNull();
  });
});

describe("scale helpers", () => {
  it("lists values low to high", () => {
    expect(getScaleValues(CLIMATE_SCALES.FREQ_4)).toEqual([1, 2, 3, 4]);
    expect(getScaleValues(CLIMATE_SCALES.NPS_11)).toHaveLength(11);
  });

  it("returns localized anchors", () => {
    expect(getScaleAnchor(CLIMATE_SCALES.FREQ_4, 1)).toBe("Nunca");
    expect(getScaleAnchor(CLIMATE_SCALES.FREQ_4, 4, "en")).toBe("Always");
    expect(getScaleAnchor(CLIMATE_SCALES.NUMERIC_5, 3)).toBeNull();
  });

  it("measures a mean's position from the scale minimum", () => {
    expect(scalePercent(CLIMATE_SCALES.AGREE_5, 1)).toBe(0);
    expect(scalePercent(CLIMATE_SCALES.AGREE_5, 5)).toBe(100);
    expect(scalePercent(CLIMATE_SCALES.FREQ_4, 2.5)).toBe(50);
    expect(scalePercent(CLIMATE_SCALES.FREQ_4, 9)).toBe(100);
  });

  it("validates keys", () => {
    expect(isScaleKey("FREQ_4")).toBe(true);
    expect(isScaleKey("FREQ_5")).toBe(false);
  });
});

describe("instrument definition", () => {
  it("has 12 dimensions of 5 items with unique codes", () => {
    expect(INSTRUMENT_DIMENSIONS).toHaveLength(12);
    const codes = INSTRUMENT_DIMENSIONS.flatMap((d) => d.items.map((i) => i.code));
    expect(codes).toHaveLength(60);
    expect(new Set(codes).size).toBe(60);
    for (const d of INSTRUMENT_DIMENSIONS) {
      expect(d.items).toHaveLength(5);
      for (const item of d.items) expect(getInstrumentDimensionCode(item.code)).toBe(d.code);
    }
  });

  it("builds locked FREQ_4 configs", () => {
    const config = instrumentItemConfig("LID-1");
    expect(config).toEqual({ scale: "FREQ_4", itemCode: "LID-1", locked: true });
    expect(getInstrumentItemCode(config)).toBe("LID-1");
    expect(isLockedQuestion(config)).toBe(true);
    expect(getQuestionScale({ type: "LIKERT", config })?.key).toBe("FREQ_4");
  });

  it("treats custom questions as unlocked", () => {
    expect(getInstrumentItemCode(null)).toBeNull();
    expect(getInstrumentItemCode({ itemCode: "" })).toBeNull();
    expect(isLockedQuestion({ scale: "FREQ_4" })).toBe(false);
    expect(isLockedQuestion([])).toBe(false);
  });

  it("is versioned", () => {
    expect(INSTRUMENT_VERSION).toBe("KCO-2026.1");
  });
});
