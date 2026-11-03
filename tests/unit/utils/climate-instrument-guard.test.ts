import { describe, it, expect } from "vitest";
import { applyInstrumentRules, instrumentDimensionCodes } from "@/lib/utils/climate-instrument-guard";
import { INSTRUMENT_DIMENSIONS, instrumentItemConfig } from "@/lib/constants/climate-instrument";

const dimIds = new Map(INSTRUMENT_DIMENSIONS.map((d) => [d.code, `dim-${d.code}`]));

function itemsOf(code: string, overrides: Record<string, unknown> = {}) {
  const dim = INSTRUMENT_DIMENSIONS.find((d) => d.code === code)!;
  return dim.items.map((item, i) => ({
    text: item.text,
    type: "LIKERT",
    dimensionId: `dim-${code}`,
    order: i,
    isRequired: true,
    config: instrumentItemConfig(item.code) as Record<string, unknown>,
    ...overrides,
  }));
}

describe("applyInstrumentRules", () => {
  it("passes custom-only surveys through untouched", () => {
    const qs = [{ text: "Custom", type: "LIKERT", dimensionId: "x", order: 0, isRequired: false, config: null }];
    const r = applyInstrumentRules(qs, dimIds);
    expect(r).toEqual({ ok: true, questions: qs, instrumentVersion: null });
  });

  it("sets the instrument version when instrument items are present", () => {
    const r = applyInstrumentRules(itemsOf("LID"), dimIds);
    expect(r.ok && r.instrumentVersion).toBe("KCO-2026.1");
  });

  it("canonicalizes edited text, type, scale, required flag and dimension", () => {
    const tampered = itemsOf("LID", {
      text: "Edited!",
      type: "TEXT",
      isRequired: false,
      dimensionId: "other",
    }).map((q, i) => ({ ...q, config: { ...q.config, scale: "AGREE_5", locked: false, itemCode: `LID-${i + 1}` } }));
    const r = applyInstrumentRules(tampered, dimIds);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const first = r.questions[0];
    expect(first.text).toBe(INSTRUMENT_DIMENSIONS[0].items[0].text);
    expect(first.type).toBe("LIKERT");
    expect(first.isRequired).toBe(true);
    expect(first.dimensionId).toBe("dim-LID");
    expect(first.config).toEqual({ scale: "FREQ_4", itemCode: "LID-1", locked: true });
  });

  it("rejects partial dimensions", () => {
    const r = applyInstrumentRules(itemsOf("LID").slice(0, 4), dimIds);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("LID-5");
  });

  it("rejects duplicated and unknown items", () => {
    const dup = applyInstrumentRules([...itemsOf("LID"), itemsOf("LID")[0]], dimIds);
    expect(dup.ok).toBe(false);
    const unknown = applyInstrumentRules(
      [{ text: "x", type: "LIKERT", order: 0, isRequired: true, config: { itemCode: "XXX-1" } }],
      dimIds,
    );
    expect(unknown).toEqual({ ok: false, error: "Unknown instrument item XXX-1" });
  });

  it("keeps custom questions out of instrument dimensions", () => {
    const qs = [
      ...itemsOf("LID"),
      { text: "Custom", type: "LIKERT", dimensionId: "dim-LID", order: 9, isRequired: true, config: null },
    ];
    const r = applyInstrumentRules(qs, dimIds);
    expect(r.ok).toBe(false);
  });

  it("allows custom questions in their own dimensions next to instrument items", () => {
    const qs = [
      ...itemsOf("LID"),
      { text: "Custom", type: "LIKERT", dimensionId: "custom", order: 9, isRequired: true, config: null },
    ];
    expect(applyInstrumentRules(qs, dimIds).ok).toBe(true);
  });

  it("fails clearly when the instrument isn't installed", () => {
    expect(applyInstrumentRules(itemsOf("LID"), new Map())).toEqual({
      ok: false,
      error: "The validated instrument is not installed",
    });
  });

  it("lists the dimension codes in use", () => {
    expect(instrumentDimensionCodes([...itemsOf("LID"), ...itemsOf("SME"), { config: null }]).sort()).toEqual(["LID", "SME"]);
  });
});
