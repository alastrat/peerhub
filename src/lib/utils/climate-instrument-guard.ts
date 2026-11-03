// Server-side integrity rules for the validated instrument (spec §3.2):
// items are verbatim, required, on FREQ_4 and in their own dimension;
// dimensions are applied whole; custom questions stay out of instrument
// dimensions. Locked items are canonicalized rather than trusted from the
// client.

import {
  INSTRUMENT_DIMENSIONS,
  INSTRUMENT_VERSION,
  getInstrumentItemCode,
  getInstrumentDimensionCode,
  instrumentItemConfig,
} from "@/lib/constants/climate-instrument";

export interface GuardQuestionInput {
  text: string;
  type: string;
  dimensionId?: string | null;
  order: number;
  isRequired: boolean;
  config?: Record<string, unknown> | null;
}

export type GuardResult<Q> =
  | { ok: true; questions: Q[]; instrumentVersion: string | null }
  // `code` + `values` name the translated message (action_errors.instrument.*)
  | { ok: false; error: string; code: GuardErrorCode; values?: Record<string, string> };

export type GuardErrorCode =
  | "unknown_item"
  | "duplicate_item"
  | "not_installed"
  | "incomplete_dimension"
  | "custom_in_instrument";

const ITEMS = new Map(
  INSTRUMENT_DIMENSIONS.flatMap((d) => d.items.map((i) => [i.code, { ...i, dimensionCode: d.code }] as const)),
);

/** Instrument dimension codes referenced by the questions (only locked items count). */
export function instrumentDimensionCodes(questions: { config?: unknown }[]): string[] {
  const codes = new Set<string>();
  for (const q of questions) {
    const code = getInstrumentItemCode(q.config);
    if (code) codes.add(getInstrumentDimensionCode(code));
  }
  return [...codes];
}

/**
 * @param dimensionIdByCode instrument dimension ids from the DB, keyed by code
 */
export function applyInstrumentRules<Q extends GuardQuestionInput>(
  questions: Q[],
  dimensionIdByCode: Map<string, string>,
): GuardResult<Q> {
  const seen = new Set<string>();
  const out: Q[] = [];

  for (const q of questions) {
    const code = getInstrumentItemCode(q.config);
    if (!code) {
      out.push(q);
      continue;
    }
    const item = ITEMS.get(code);
    if (!item) return { ok: false, error: `Unknown instrument item ${code}`, code: "unknown_item", values: { code } };
    if (seen.has(code)) {
      return { ok: false, error: `Instrument item ${code} appears twice`, code: "duplicate_item", values: { code } };
    }
    seen.add(code);
    const dimensionId = dimensionIdByCode.get(item.dimensionCode);
    if (!dimensionId) return { ok: false, error: "The validated instrument is not installed", code: "not_installed" };
    out.push({
      ...q,
      text: item.text,
      type: "LIKERT",
      isRequired: true,
      dimensionId,
      config: instrumentItemConfig(code),
    });
  }

  if (seen.size === 0) return { ok: true, questions: out, instrumentVersion: null };

  // Whole dimensions only
  for (const dimCode of new Set([...seen].map(getInstrumentDimensionCode))) {
    const dim = INSTRUMENT_DIMENSIONS.find((d) => d.code === dimCode)!;
    const missing = dim.items.filter((i) => !seen.has(i.code)).map((i) => i.code);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Instrument dimension "${dim.name}" must include all of its items (missing ${missing.join(", ")})`,
        code: "incomplete_dimension",
        values: { dimension: dim.name, missing: missing.join(", ") },
      };
    }
  }

  // Custom questions can't sit inside an instrument dimension
  const instrumentDimensionIds = new Set(dimensionIdByCode.values());
  const intruder = out.find(
    (q) => !getInstrumentItemCode(q.config) && q.dimensionId && instrumentDimensionIds.has(q.dimensionId),
  );
  if (intruder) {
    return {
      ok: false,
      error: "Custom questions can't be added to a validated instrument dimension; use another dimension",
      code: "custom_in_instrument",
    };
  }

  return { ok: true, questions: out, instrumentVersion: INSTRUMENT_VERSION };
}
