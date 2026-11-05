// Report cover ("Portada del informe") helpers. Pure functions — no Prisma, no I/O.

import {
  getQuestionScale,
  getScaleAnchor,
  getScaleValues,
  INSTRUMENT_SCALE,
  type ScaleDefinition,
} from "@/lib/constants/climate-scales";
import { getInstrumentItemCode } from "@/lib/constants/climate-instrument";
import { businessDay } from "@/lib/constants/business-time";

// ---------------------------------------------------------------------------
// Fecha de aplicación
// ---------------------------------------------------------------------------

export interface ReportScheduleInput {
  accessStartDate: Date | null;
  accessEndDate: Date | null;
  distributions: { sentAt: Date | null; dueDate: Date }[];
}

export interface ReportSchedule {
  start: Date;
  end: Date;
  /** Calendar days from start to end, both included. */
  days: number;
  /** Times only mean something when an admin set the access window. */
  hasStartTime: boolean;
  hasEndTime: boolean;
}

function dayNumber(date: Date, timeZone: string): number {
  const [y, m, d] = businessDay(date, timeZone).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * A due date is a calendar day stored at UTC midnight (the distribute dialog's
 * date input). Noon UTC keeps that day in any business time zone, where
 * midnight would show the day before west of UTC.
 */
function dueDay(dueDate: Date): Date {
  return new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate(), 12));
}

/**
 * When the survey ran: its access window, else from the first send to the
 * last due date. Null when neither bound is known or they're reversed.
 */
export function reportSchedule(input: ReportScheduleInput, timeZone: string): ReportSchedule | null {
  const sent = input.distributions.map((d) => d.sentAt).filter((d): d is Date => d != null);
  const start =
    input.accessStartDate ?? (sent.length ? new Date(Math.min(...sent.map((d) => d.getTime()))) : null);
  const end =
    input.accessEndDate ??
    (input.distributions.length
      ? dueDay(new Date(Math.max(...input.distributions.map((d) => d.dueDate.getTime()))))
      : null);
  if (!start || !end) return null;
  const days = dayNumber(end, timeZone) - dayNumber(start, timeZone) + 1;
  if (days < 1) return null;
  return {
    start,
    end,
    days,
    hasStartTime: input.accessStartDate != null,
    hasEndTime: input.accessEndDate != null,
  };
}

// ---------------------------------------------------------------------------
// Escala de respuestas
// ---------------------------------------------------------------------------

interface ScaleQuestion {
  type: string;
  config?: unknown;
}

/**
 * The scale most questions are answered on (the instrument's when there is
 * one). NPS only counts when nothing else is scored, as in an eNPS survey.
 */
function mainScale(questions: ScaleQuestion[]): ScaleDefinition | null {
  const counts = new Map<string, { scale: ScaleDefinition; count: number }>();
  let nps: ScaleDefinition | null = null;
  let instrument = false;
  for (const q of questions) {
    const scale = getQuestionScale(q);
    if (!scale) continue;
    if (scale.kind === "nps") {
      nps = scale;
      continue;
    }
    if (getInstrumentItemCode(q.config) != null) instrument = true;
    const entry = counts.get(scale.key) ?? { scale, count: 0 };
    entry.count++;
    counts.set(scale.key, entry);
  }
  if (instrument && counts.has(INSTRUMENT_SCALE)) return counts.get(INSTRUMENT_SCALE)!.scale;
  let best: { scale: ScaleDefinition; count: number } | null = null;
  for (const entry of counts.values()) if (!best || entry.count > best.count) best = entry;
  return best?.scale ?? nps;
}

/** Default "Escala de respuestas": the main scale's labels ("Nunca, Casi nunca, …"), or its range. */
export function defaultScaleText(questions: ScaleQuestion[], locale: string): string {
  const scale = mainScale(questions);
  if (!scale) return "";
  if (!scale.anchors) return `${scale.min} – ${scale.max}`;
  return getScaleValues(scale)
    .map((v) => getScaleAnchor(scale, v, locale) ?? String(v))
    .join(", ");
}

/** Comma-separated scale text as list items. */
export function splitScaleText(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Texto introductorio
// ---------------------------------------------------------------------------

/** Paragraphs of the intro text: blank lines split them, single newlines stay inside. */
export function introParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** A stored value equal to the default is kept as null, so the default can still follow the locale. */
export function storedCoverText(value: string, defaultValue: string): string {
  const text = value.trim();
  return text === defaultValue.trim() ? "" : text;
}

// ---------------------------------------------------------------------------
// Dimensiones evaluadas
// ---------------------------------------------------------------------------

export interface ReportDimension {
  id: string;
  name: string;
  questionCount: number;
}

/** Dimensions in question order, with how many questions each has. */
export function reportDimensions(
  questions: { dimension: { id: string; name: string } | null }[],
): ReportDimension[] {
  const byId = new Map<string, ReportDimension>();
  for (const q of questions) {
    if (!q.dimension) continue;
    const entry = byId.get(q.dimension.id) ?? { id: q.dimension.id, name: q.dimension.name, questionCount: 0 };
    entry.questionCount++;
    byId.set(q.dimension.id, entry);
  }
  return [...byId.values()];
}
