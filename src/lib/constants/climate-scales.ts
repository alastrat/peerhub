// Response scales for climate survey questions.
//
// Scales are immutable: changing a range or a label means adding a new key,
// never editing an existing one. A question's scale is stored as
// `config.scale` on SurveyQuestion / ClimateSurveyTemplateQuestion, and
// because questions are copied per survey, that key freezes the scale for
// every survey that already exists.

export type ScaleKey = "FREQ_4" | "AGREE_5" | "FACES_5" | "NUMERIC_5" | "NPS_11";

export type ScaleKind = "frequency" | "agreement" | "faces" | "numeric" | "nps";

export interface ScaleDefinition {
  key: ScaleKey;
  kind: ScaleKind;
  min: number;
  max: number;
  anchors: Record<number, { es: string; en: string }> | null;
  /** Lowest value counted as favorable; null when favorability doesn't apply. */
  favorableMin: number | null;
  /** Shown as faces (emoji per value) instead of plain options. */
  faces?: Record<number, string>;
}

export const CLIMATE_SCALES: Record<ScaleKey, ScaleDefinition> = {
  // Validated Kultiva instrument (4-point frequency Likert)
  FREQ_4: {
    key: "FREQ_4",
    kind: "frequency",
    min: 1,
    max: 4,
    anchors: {
      1: { es: "Nunca", en: "Never" },
      2: { es: "Casi nunca", en: "Rarely" },
      3: { es: "Casi siempre", en: "Almost always" },
      4: { es: "Siempre", en: "Always" },
    },
    favorableMin: 3,
  },
  // 5-point agreement scale (legacy surveys answered before 2026-04-16)
  AGREE_5: {
    key: "AGREE_5",
    kind: "agreement",
    min: 1,
    max: 5,
    anchors: {
      1: { es: "Muy en Desacuerdo", en: "Strongly Disagree" },
      2: { es: "En Desacuerdo", en: "Disagree" },
      3: { es: "Neutral", en: "Neutral" },
      4: { es: "De Acuerdo", en: "Agree" },
      5: { es: "Muy de Acuerdo", en: "Strongly Agree" },
    },
    favorableMin: 4,
  },
  // "Escala de caritas": five faces, worst to best (Kultiva's POC)
  FACES_5: {
    key: "FACES_5",
    kind: "faces",
    min: 1,
    max: 5,
    anchors: {
      1: { es: "Muy mal", en: "Very bad" },
      2: { es: "Mal", en: "Bad" },
      3: { es: "Regular", en: "Okay" },
      4: { es: "Bien", en: "Good" },
      5: { es: "Muy bien", en: "Very good" },
    },
    favorableMin: 4,
    faces: { 1: "😠", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" },
  },
  // RATING questions: plain 1-5 numbers
  NUMERIC_5: {
    key: "NUMERIC_5",
    kind: "numeric",
    min: 1,
    max: 5,
    anchors: null,
    favorableMin: null,
  },
  NPS_11: {
    key: "NPS_11",
    kind: "nps",
    min: 0,
    max: 10,
    anchors: null,
    favorableMin: null,
  },
};

/**
 * Scale used by LIKERT questions that don't name one. The portal has shown
 * LIKERT as Nunca…Siempre (1–4) since 2026-04-16; the migration
 * 20261103060000 stamped every older question with its real scale.
 */
export const DEFAULT_LIKERT_SCALE: ScaleKey = "FREQ_4";

/** Scale of the validated Kultiva instrument. */
export const INSTRUMENT_SCALE: ScaleKey = "FREQ_4";

/** Scales a user can pick for a LIKERT question. */
export const SELECTABLE_LIKERT_SCALES: ScaleKey[] = ["FREQ_4", "AGREE_5", "FACES_5"];

export function isScaleKey(value: unknown): value is ScaleKey {
  return typeof value === "string" && value in CLIMATE_SCALES;
}

function readConfig(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

/** Scale of a question, or null when the question isn't numeric (TEXT). */
export function getQuestionScale(question: {
  type: string;
  config?: unknown;
}): ScaleDefinition | null {
  switch (question.type) {
    case "LIKERT": {
      const key = readConfig(question.config).scale;
      return CLIMATE_SCALES[isScaleKey(key) ? key : DEFAULT_LIKERT_SCALE];
    }
    case "RATING":
      return CLIMATE_SCALES.NUMERIC_5;
    case "NPS":
      return CLIMATE_SCALES.NPS_11;
    default:
      return null;
  }
}

/** Every answer value of a scale, low to high. */
export function getScaleValues(scale: ScaleDefinition): number[] {
  const values: number[] = [];
  for (let v = scale.min; v <= scale.max; v++) values.push(v);
  return values;
}

export function getScaleAnchor(
  scale: ScaleDefinition,
  value: number,
  locale = "es",
): string | null {
  const anchor = scale.anchors?.[value];
  if (!anchor) return null;
  const label = locale === "en" ? anchor.en : anchor.es;
  // Face scales lead with the face, so results read like the survey did
  const face = getScaleFace(scale, value);
  return face ? `${face} ${label}` : label;
}

/** The face shown for a value on a face scale ("escala de caritas"), else null. */
export function getScaleFace(scale: ScaleDefinition, value: number): string | null {
  return scale.faces?.[value] ?? null;
}

/** Short label for the question-type picker, e.g. "Likert (1-4)". */
export function getScaleRangeLabel(scale: ScaleDefinition): string {
  return `${scale.min}-${scale.max}`;
}

/** Position of a mean within its scale, 0-100 (1 on a 1-5 scale is 0%, not 20%). */
export function scalePercent(scale: ScaleDefinition, mean: number): number {
  if (scale.max === scale.min) return 0;
  const pct = ((mean - scale.min) / (scale.max - scale.min)) * 100;
  return Math.max(0, Math.min(100, pct));
}
