// Scoring engine for climate surveys. Pure functions — no Prisma, no I/O.
// Rules: docs/climate-scoring-and-action-plans-spec.md §3.

import {
  CLIMATE_SCALES,
  getQuestionScale,
  scalePercent,
  type ScaleDefinition,
  type ScaleKey,
} from "@/lib/constants/climate-scales";
import { getInstrumentItemCode } from "@/lib/constants/climate-instrument";

// ---------------------------------------------------------------------------
// Bands
// ---------------------------------------------------------------------------

/** Ordered low → high. Mirrors the Prisma `ClimateBand` enum. */
export const CLIMATE_BANDS = [
  "MUY_DESFAVORABLE",
  "DESFAVORABLE",
  "FAVORABLE",
  "MUY_FAVORABLE",
] as const;

export type ClimateBand = (typeof CLIMATE_BANDS)[number];

export const DEFAULT_GOAL_BAND: ClimateBand = "FAVORABLE";

/** Default survey goal: % of favorable answers (Kultiva's POC used 75). */
export const DEFAULT_GOAL_PCT = 75;

/**
 * Round a mean to one decimal, half up, before banding. The epsilon keeps a
 * mean that should be exactly x.x5 (e.g. 71/20 = 3.55) from being stored as
 * 3.5499999… and falling into the lower band.
 */
export function roundForBand(mean: number): number {
  return Math.round(mean * 10 + 1e-9) / 10;
}

/** Band of a mean on the 1–4 instrument scale (study's mean-based table). */
export function bandForMean(mean: number): ClimateBand {
  const r = roundForBand(mean);
  if (r >= 3.6) return "MUY_FAVORABLE";
  if (r >= 3.1) return "FAVORABLE";
  if (r >= 2.6) return "DESFAVORABLE";
  return "MUY_DESFAVORABLE";
}

export function bandRank(band: ClimateBand): number {
  return CLIMATE_BANDS.indexOf(band);
}

export function isClimateBand(value: unknown): value is ClimateBand {
  return typeof value === "string" && (CLIMATE_BANDS as readonly string[]).includes(value);
}

/** True when `band` is below the survey's goal band. */
export function isBelowGoal(band: ClimateBand, goal: ClimateBand): boolean {
  return bandRank(band) < bandRank(goal);
}

/** One band up (capped at the top band) — the default plan target. */
export function nextBand(band: ClimateBand): ClimateBand {
  return CLIMATE_BANDS[Math.min(bandRank(band) + 1, CLIMATE_BANDS.length - 1)];
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ScoringQuestion {
  id: string;
  type: string;
  dimensionId: string | null;
  config?: unknown;
  order?: number;
}

export interface ScoringAnswer {
  questionId: string;
  ratingValue: number | null;
}

export interface ScoringResponse {
  answers: ScoringAnswer[];
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export interface ItemScore {
  questionId: string;
  scaleKey: ScaleKey | null;
  isInstrument: boolean;
  n: number;
  mean: number | null;
  /** Share (0–1) of answers at or above the scale's favorable threshold. */
  favorability: number | null;
  distribution: Record<number, number>;
}

export interface DimensionScore {
  dimensionId: string;
  scaleKey: ScaleKey;
  isInstrument: boolean;
  itemCount: number;
  mean: number | null;
  favorability: number | null;
  band: ClimateBand | null;
  /** Mean's position within its scale, 0–100. */
  percent: number | null;
}

export interface IndexScore {
  scaleKey: ScaleKey;
  isInstrument: boolean;
  mean: number | null;
  favorability: number | null;
  band: ClimateBand | null;
  percent: number | null;
}

export interface GroupScore {
  respondents: number;
  suppressed: boolean;
  items: ItemScore[];
  dimensions: DimensionScore[];
  index: IndexScore | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function byOrder(a: ScoringQuestion, b: ScoringQuestion): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

export function isInstrumentQuestion(question: ScoringQuestion): boolean {
  return getInstrumentItemCode(question.config) != null;
}

/** A survey is an instrument survey when any of its questions is an instrument item. */
export function isInstrumentSurvey(questions: ScoringQuestion[]): boolean {
  return questions.some(isInstrumentQuestion);
}

/** Questions that produce a numeric score (everything but TEXT). */
function scoredQuestions(questions: ScoringQuestion[]) {
  return questions
    .map((q) => ({ question: q, scale: getQuestionScale(q) }))
    .filter((x): x is { question: ScoringQuestion; scale: ScaleDefinition } => x.scale != null);
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

export function scoreItem(question: ScoringQuestion, responses: ScoringResponse[]): ItemScore {
  const scale = getQuestionScale(question);
  const values: number[] = [];
  if (scale) {
    for (const r of responses) {
      for (const a of r.answers) {
        if (a.questionId !== question.id || a.ratingValue == null) continue;
        // Out-of-range values can only come from bad data; never let them skew a mean.
        if (a.ratingValue < scale.min || a.ratingValue > scale.max) continue;
        values.push(a.ratingValue);
      }
    }
  }

  const distribution: Record<number, number> = {};
  for (const v of values) distribution[v] = (distribution[v] ?? 0) + 1;

  const favorableMin = scale?.favorableMin ?? null;
  return {
    questionId: question.id,
    scaleKey: scale?.key ?? null,
    isInstrument: isInstrumentQuestion(question),
    n: values.length,
    mean: mean(values),
    favorability:
      favorableMin != null && values.length > 0
        ? values.filter((v) => v >= favorableMin).length / values.length
        : null,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Group (company or any segment)
// ---------------------------------------------------------------------------

export function scoreGroup(
  questions: ScoringQuestion[],
  responses: ScoringResponse[],
  opts: { minGroupSize?: number } = {},
): GroupScore {
  const respondents = responses.length;
  if (opts.minGroupSize != null && respondents < opts.minGroupSize) {
    return { respondents, suppressed: true, items: [], dimensions: [], index: null };
  }

  const sorted = [...questions].sort(byOrder);
  const scored = scoredQuestions(sorted);
  const itemScores = new Map(scored.map(({ question }) => [question.id, scoreItem(question, responses)]));
  const instrument = isInstrumentSurvey(sorted);

  // --- Dimensions ---------------------------------------------------------
  // NPS never feeds a dimension. In an instrument dimension only instrument
  // items count. Otherwise a dimension is scored on the scale of its first
  // question; questions on other scales are left out so scales never mix.
  const byDimension = new Map<string, { question: ScoringQuestion; scale: ScaleDefinition }[]>();
  for (const entry of scored) {
    if (entry.scale.kind === "nps" || !entry.question.dimensionId) continue;
    const list = byDimension.get(entry.question.dimensionId) ?? [];
    list.push(entry);
    byDimension.set(entry.question.dimensionId, list);
  }

  const dimensions: DimensionScore[] = [];
  for (const [dimensionId, entries] of byDimension) {
    const instrumentEntries = entries.filter((e) => isInstrumentQuestion(e.question));
    const isInstrumentDim = instrument && instrumentEntries.length > 0;
    const candidates = isInstrumentDim ? instrumentEntries : entries;
    const scale = candidates[0].scale;
    const items = candidates
      .filter((e) => e.scale.key === scale.key)
      .map((e) => itemScores.get(e.question.id)!);

    const answered = items.filter((i) => i.mean != null);
    const dimMean = mean(answered.map((i) => i.mean!));
    const favs = answered.map((i) => i.favorability).filter((f): f is number => f != null);

    dimensions.push({
      dimensionId,
      scaleKey: scale.key,
      isInstrument: isInstrumentDim,
      itemCount: items.length,
      mean: dimMean,
      favorability: scale.favorableMin != null ? mean(favs) : null,
      band: isInstrumentDim && dimMean != null ? bandForMean(dimMean) : null,
      percent: dimMean != null ? scalePercent(scale, dimMean) : null,
    });
  }

  // --- Index --------------------------------------------------------------
  let index: IndexScore | null = null;
  if (instrument) {
    const dims = dimensions.filter((d) => d.isInstrument && d.mean != null);
    const icMean = mean(dims.map((d) => d.mean!));
    const scale = CLIMATE_SCALES.FREQ_4;
    index = {
      scaleKey: scale.key,
      isInstrument: true,
      mean: icMean,
      favorability: mean(dims.map((d) => d.favorability).filter((f): f is number => f != null)),
      band: icMean != null ? bandForMean(icMean) : null,
      percent: icMean != null ? scalePercent(scale, icMean) : null,
    };
  } else {
    // Without the instrument there's only an overall mean when every scored
    // (non-NPS) question shares one scale.
    const items = scored.filter((e) => e.scale.kind !== "nps");
    const scaleKeys = new Set(items.map((e) => e.scale.key));
    if (scaleKeys.size === 1) {
      const scale = items[0].scale;
      const answered = items.map((e) => itemScores.get(e.question.id)!).filter((i) => i.mean != null);
      const overall = mean(answered.map((i) => i.mean!));
      const favs = answered.map((i) => i.favorability).filter((f): f is number => f != null);
      index = {
        scaleKey: scale.key,
        isInstrument: false,
        mean: overall,
        favorability: scale.favorableMin != null ? mean(favs) : null,
        band: null,
        percent: overall != null ? scalePercent(scale, overall) : null,
      };
    }
  }

  return {
    respondents,
    suppressed: false,
    items: scored.map(({ question }) => itemScores.get(question.id)!),
    dimensions,
    index,
  };
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export interface SegmentRef {
  id: string;
  name: string;
}

export interface SegmentScore extends GroupScore {
  segmentId: string;
  segmentName: string;
}

/**
 * Score every segment a response belongs to (a response can sit in several,
 * e.g. multiple teams). Segments under `minGroupSize` come back suppressed.
 */
export function scoreSegments<R extends ScoringResponse>(
  questions: ScoringQuestion[],
  responses: R[],
  segmentsOf: (response: R) => SegmentRef[],
  minGroupSize: number,
): SegmentScore[] {
  const groups = new Map<string, { name: string; responses: R[] }>();
  for (const r of responses) {
    for (const seg of segmentsOf(r)) {
      const g = groups.get(seg.id) ?? { name: seg.name, responses: [] };
      g.responses.push(r);
      groups.set(seg.id, g);
    }
  }
  return Array.from(groups.entries())
    .map(([segmentId, g]) => ({
      segmentId,
      segmentName: g.name,
      ...scoreGroup(questions, g.responses, { minGroupSize }),
    }))
    .sort((a, b) => a.segmentName.localeCompare(b.segmentName));
}

// ---------------------------------------------------------------------------
// Gaps and impact
// ---------------------------------------------------------------------------

/** Whether a favorability (0–1) misses the survey goal (a whole %), as the rounded % on screen reads. */
export function isBelowGoalPct(favorability: number | null, goalPct: number): boolean {
  return favorability != null && Math.round(favorability * 100) < goalPct;
}

/** Instrument dimensions below the goal, lowest mean first. */
export function findGaps(dimensions: DimensionScore[], goalPct: number): DimensionScore[] {
  return dimensions
    .filter((d) => d.band != null && d.mean != null && isBelowGoalPct(d.favorability, goalPct))
    .sort((a, b) => a.mean! - b.mean!);
}

export type ImpactResult = "IMPROVED" | "UNCHANGED" | "WORSENED" | "NOT_EVALUABLE";

/**
 * Outcome of a plan at the follow-up survey. Only a band change counts as
 * better or worse: with team-sized groups a small move in the mean is noise.
 */
export function classifyImpact(baseline: ClimateBand, result: ClimateBand | null): ImpactResult {
  if (result == null) return "NOT_EVALUABLE";
  const diff = bandRank(result) - bandRank(baseline);
  if (diff > 0) return "IMPROVED";
  if (diff < 0) return "WORSENED";
  return "UNCHANGED";
}

export function formatMean(mean: number | null | undefined): string {
  return mean == null ? "—" : mean.toFixed(2);
}

export function formatPct(share: number | null | undefined): string {
  return share == null ? "—" : `${Math.round(share * 100)}%`;
}
