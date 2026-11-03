import { describe, it, expect } from "vitest";
import {
  bandForMean,
  roundForBand,
  isBelowGoal,
  nextBand,
  bandRank,
  isClimateBand,
  scoreItem,
  scoreGroup,
  scoreSegments,
  findGaps,
  classifyImpact,
  isInstrumentSurvey,
  type ScoringQuestion,
  type ScoringResponse,
} from "@/lib/utils/climate-scoring";
import { instrumentItemConfig } from "@/lib/constants/climate-instrument";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function instrumentQ(id: string, dimensionId: string, order = 0): ScoringQuestion {
  return { id, type: "LIKERT", dimensionId, config: instrumentItemConfig(id), order };
}

function likert5(id: string, dimensionId: string | null, order = 0): ScoringQuestion {
  return { id, type: "LIKERT", dimensionId, config: { scale: "AGREE_5" }, order };
}

function resp(values: Record<string, number | null>): ScoringResponse {
  return {
    answers: Object.entries(values).map(([questionId, ratingValue]) => ({ questionId, ratingValue })),
  };
}

/** n responses giving `value` to every listed question. */
function repeat(n: number, values: Record<string, number>): ScoringResponse[] {
  return Array.from({ length: n }, () => resp(values));
}

// ---------------------------------------------------------------------------
// Bands
// ---------------------------------------------------------------------------

describe("bandForMean", () => {
  it.each([
    [4.0, "MUY_FAVORABLE"],
    [3.6, "MUY_FAVORABLE"],
    [3.55, "MUY_FAVORABLE"],
    [3.5499, "FAVORABLE"],
    [3.5, "FAVORABLE"],
    [3.1, "FAVORABLE"],
    [3.05, "FAVORABLE"],
    [3.0499, "DESFAVORABLE"],
    [3.0, "DESFAVORABLE"],
    [2.6, "DESFAVORABLE"],
    [2.55, "DESFAVORABLE"],
    [2.5499, "MUY_DESFAVORABLE"],
    [2.5, "MUY_DESFAVORABLE"],
    [1.0, "MUY_DESFAVORABLE"],
  ])("mean %s → %s", (m, band) => {
    expect(bandForMean(m)).toBe(band);
  });

  it("does not drop an exact x.x5 mean computed from answers into the lower band", () => {
    // 11 × 4 + 9 × 3 = 71 over 20 answers = 3.55, which floats to 3.5499999…
    const computed = (11 * 4 + 9 * 3) / 20;
    expect(roundForBand(computed)).toBe(3.6);
    expect(bandForMean(computed)).toBe("MUY_FAVORABLE");
  });

  it("classifies the study's company-wide mean (3.02) as Desfavorable", () => {
    expect(bandForMean(3.02)).toBe("DESFAVORABLE");
  });
});

describe("band helpers", () => {
  it("ranks bands low to high", () => {
    expect(bandRank("MUY_DESFAVORABLE")).toBeLessThan(bandRank("MUY_FAVORABLE"));
  });

  it("detects bands below the goal", () => {
    expect(isBelowGoal("DESFAVORABLE", "FAVORABLE")).toBe(true);
    expect(isBelowGoal("FAVORABLE", "FAVORABLE")).toBe(false);
    expect(isBelowGoal("MUY_FAVORABLE", "FAVORABLE")).toBe(false);
  });

  it("moves one band up and caps at the top", () => {
    expect(nextBand("MUY_DESFAVORABLE")).toBe("DESFAVORABLE");
    expect(nextBand("FAVORABLE")).toBe("MUY_FAVORABLE");
    expect(nextBand("MUY_FAVORABLE")).toBe("MUY_FAVORABLE");
  });

  it("validates band strings", () => {
    expect(isClimateBand("FAVORABLE")).toBe(true);
    expect(isClimateBand("GOOD")).toBe(false);
    expect(isClimateBand(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

describe("scoreItem", () => {
  it("computes mean, favorability (3–4) and distribution on the 4-point scale", () => {
    const q = instrumentQ("LID-1", "d1");
    const score = scoreItem(q, [resp({ "LID-1": 4 }), resp({ "LID-1": 3 }), resp({ "LID-1": 2 }), resp({ "LID-1": 1 })]);
    expect(score.n).toBe(4);
    expect(score.mean).toBe(2.5);
    expect(score.favorability).toBe(0.5);
    expect(score.distribution).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1 });
    expect(score.scaleKey).toBe("FREQ_4");
    expect(score.isInstrument).toBe(true);
  });

  it("counts 4–5 as favorable on the legacy 5-point scale", () => {
    const q = likert5("q", "d1");
    const score = scoreItem(q, [resp({ q: 5 }), resp({ q: 4 }), resp({ q: 3 })]);
    expect(score.favorability).toBeCloseTo(2 / 3);
  });

  it("ignores null and out-of-range answers", () => {
    const q = instrumentQ("LID-1", "d1");
    const score = scoreItem(q, [resp({ "LID-1": 5 }), resp({ "LID-1": 0 }), resp({ "LID-1": null }), resp({ "LID-1": 4 })]);
    expect(score.n).toBe(1);
    expect(score.mean).toBe(4);
  });

  it("returns nulls when nobody answered", () => {
    const score = scoreItem(instrumentQ("LID-1", "d1"), []);
    expect(score).toMatchObject({ n: 0, mean: null, favorability: null });
  });

  it("has no favorability for NPS or numeric ratings", () => {
    expect(scoreItem({ id: "n", type: "NPS", dimensionId: null }, [resp({ n: 10 })]).favorability).toBeNull();
    expect(scoreItem({ id: "r", type: "RATING", dimensionId: null }, [resp({ r: 5 })]).favorability).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe("scoreGroup — instrument survey", () => {
  const questions: ScoringQuestion[] = [
    instrumentQ("LID-1", "lid", 1),
    instrumentQ("LID-2", "lid", 2),
    instrumentQ("CVI-1", "cvi", 3),
    instrumentQ("CVI-2", "cvi", 4),
    // custom question in its own dimension, on the 5-point scale
    likert5("custom", "custom-dim", 5),
    // NPS in the instrument dimension must never feed it
    { id: "nps", type: "NPS", dimensionId: "lid", order: 6 },
    { id: "text", type: "TEXT", dimensionId: "lid", order: 7 },
  ];

  const responses = [
    resp({ "LID-1": 4, "LID-2": 4, "CVI-1": 2, "CVI-2": 2, custom: 5, nps: 0 }),
    resp({ "LID-1": 4, "LID-2": 3, "CVI-1": 2, "CVI-2": 3, custom: 5, nps: 0 }),
  ];

  const result = scoreGroup(questions, responses);

  it("bands instrument dimensions and leaves custom ones unbanded", () => {
    const lid = result.dimensions.find((d) => d.dimensionId === "lid")!;
    const cvi = result.dimensions.find((d) => d.dimensionId === "cvi")!;
    const custom = result.dimensions.find((d) => d.dimensionId === "custom-dim")!;
    expect(lid.mean).toBeCloseTo(3.75);
    expect(lid.band).toBe("MUY_FAVORABLE");
    expect(lid.itemCount).toBe(2); // NPS + TEXT excluded
    expect(cvi.mean).toBeCloseTo(2.25);
    expect(cvi.band).toBe("MUY_DESFAVORABLE");
    expect(custom.isInstrument).toBe(false);
    expect(custom.band).toBeNull();
    expect(custom.scaleKey).toBe("AGREE_5");
  });

  it("builds the Índice de Clima from instrument dimensions only, equally weighted", () => {
    expect(result.index?.isInstrument).toBe(true);
    expect(result.index?.mean).toBeCloseTo((3.75 + 2.25) / 2);
    expect(result.index?.band).toBe("DESFAVORABLE"); // 3.0
    expect(result.index?.scaleKey).toBe("FREQ_4");
  });

  it("averages favorability across dimensions", () => {
    // LID: both items 100% favorable (3 counts) → 100%. CVI: 0% and 50% → 25%.
    expect(result.index?.favorability).toBeCloseTo(0.625);
  });

  it("reports scale position as a percent of the 1–4 range", () => {
    const lid = result.dimensions.find((d) => d.dimensionId === "lid")!;
    expect(lid.percent).toBeCloseTo(((3.75 - 1) / 3) * 100);
  });

  it("detects the instrument survey", () => {
    expect(isInstrumentSurvey(questions)).toBe(true);
    expect(isInstrumentSurvey([likert5("x", null)])).toBe(false);
  });

  it("weights dimensions equally regardless of item count", () => {
    const qs = [instrumentQ("A-1", "a"), instrumentQ("B-1", "b"), instrumentQ("B-2", "b"), instrumentQ("B-3", "b")];
    const r = scoreGroup(qs, [resp({ "A-1": 4, "B-1": 1, "B-2": 1, "B-3": 1 })]);
    expect(r.index?.mean).toBeCloseTo(2.5); // (4 + 1) / 2, not 7/4
  });
});

describe("scoreGroup — non-instrument surveys", () => {
  it("computes an overall mean when all scored questions share one scale", () => {
    const qs = [likert5("a", "d1"), likert5("b", "d2"), { id: "nps", type: "NPS", dimensionId: null }];
    const r = scoreGroup(qs, [resp({ a: 5, b: 3, nps: 10 })]);
    expect(r.index?.mean).toBe(4); // NPS 10 kept out
    expect(r.index?.isInstrument).toBe(false);
    expect(r.index?.band).toBeNull();
  });

  it("has no overall mean when scales are mixed", () => {
    const qs = [likert5("a", "d1"), { id: "r", type: "RATING", dimensionId: "d2" }];
    const r = scoreGroup(qs, [resp({ a: 5, r: 1 })]);
    expect(r.index).toBeNull();
  });

  it("never mixes scales inside a dimension", () => {
    const qs = [likert5("a", "d1", 1), { id: "r", type: "RATING", dimensionId: "d1", order: 2 }];
    const r = scoreGroup(qs, [resp({ a: 5, r: 1 })]);
    const d1 = r.dimensions[0];
    expect(d1.itemCount).toBe(1);
    expect(d1.mean).toBe(5);
  });

  it("ignores questions without a dimension for dimension scores", () => {
    const r = scoreGroup([likert5("a", null)], [resp({ a: 4 })]);
    expect(r.dimensions).toHaveLength(0);
    expect(r.index?.mean).toBe(4);
  });

  it("handles a survey with only text questions", () => {
    const r = scoreGroup([{ id: "t", type: "TEXT", dimensionId: null }], [resp({})]);
    expect(r.items).toHaveLength(0);
    expect(r.index).toBeNull();
  });
});

describe("scoreGroup — suppression", () => {
  const qs = [instrumentQ("LID-1", "lid")];

  it("suppresses groups below the minimum size", () => {
    const r = scoreGroup(qs, repeat(4, { "LID-1": 4 }), { minGroupSize: 5 });
    expect(r.suppressed).toBe(true);
    expect(r.respondents).toBe(4);
    expect(r.dimensions).toHaveLength(0);
    expect(r.items).toHaveLength(0);
    expect(r.index).toBeNull();
  });

  it("shows groups at exactly the minimum size", () => {
    const r = scoreGroup(qs, repeat(5, { "LID-1": 4 }), { minGroupSize: 5 });
    expect(r.suppressed).toBe(false);
    expect(r.index?.mean).toBe(4);
  });

  it("handles an empty group", () => {
    const r = scoreGroup(qs, []);
    expect(r.respondents).toBe(0);
    expect(r.index?.mean).toBeNull();
    expect(r.index?.band).toBeNull();
  });
});

describe("scoreSegments", () => {
  const qs = [instrumentQ("LID-1", "lid")];
  type R = ScoringResponse & { teams: { id: string; name: string }[] };
  const mk = (v: number, teams: string[]): R => ({
    ...resp({ "LID-1": v }),
    teams: teams.map((t) => ({ id: t, name: t.toUpperCase() })),
  });

  it("puts a response in every segment it belongs to and suppresses small ones", () => {
    const responses = [
      ...Array.from({ length: 5 }, () => mk(4, ["a"])),
      mk(1, ["a", "b"]),
      mk(1, ["b"]),
    ];
    const segs = scoreSegments(qs, responses, (r) => r.teams, 5);
    const a = segs.find((s) => s.segmentId === "a")!;
    const b = segs.find((s) => s.segmentId === "b")!;
    expect(a.respondents).toBe(6);
    expect(a.index?.mean).toBeCloseTo(21 / 6);
    expect(b.respondents).toBe(2);
    expect(b.suppressed).toBe(true);
  });

  it("sorts segments by name and skips responses with no segment", () => {
    const segs = scoreSegments(qs, [mk(4, ["z"]), mk(4, ["m"]), mk(4, [])], (r) => r.teams, 1);
    expect(segs.map((s) => s.segmentName)).toEqual(["M", "Z"]);
  });
});

// ---------------------------------------------------------------------------
// Gaps and impact
// ---------------------------------------------------------------------------

describe("findGaps", () => {
  it("returns banded dimensions below the goal, lowest first", () => {
    const qs = [instrumentQ("A-1", "a"), instrumentQ("B-1", "b"), instrumentQ("C-1", "c"), likert5("x", "x")];
    const r = scoreGroup(qs, [resp({ "A-1": 4, "B-1": 2, "C-1": 1, x: 1 })]);
    const gaps = findGaps(r.dimensions, "FAVORABLE");
    expect(gaps.map((g) => g.dimensionId)).toEqual(["c", "b"]);
  });

  it("respects a stricter goal", () => {
    // mean 3.5 → Favorable
    const r = scoreGroup([instrumentQ("A-1", "a")], [resp({ "A-1": 3 }), resp({ "A-1": 4 })]);
    expect(findGaps(r.dimensions, "FAVORABLE")).toHaveLength(0);
    expect(findGaps(r.dimensions, "MUY_FAVORABLE")).toHaveLength(1);
  });
});

describe("classifyImpact", () => {
  it("only counts band changes", () => {
    expect(classifyImpact("DESFAVORABLE", "FAVORABLE")).toBe("IMPROVED");
    expect(classifyImpact("FAVORABLE", "DESFAVORABLE")).toBe("WORSENED");
    expect(classifyImpact("FAVORABLE", "FAVORABLE")).toBe("UNCHANGED");
    expect(classifyImpact("FAVORABLE", null)).toBe("NOT_EVALUABLE");
  });
});
