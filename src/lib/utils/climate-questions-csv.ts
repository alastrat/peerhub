import Papa from "papaparse";

export type QuestionType = "LIKERT" | "TEXT" | "NPS" | "RATING";

export interface ParsedQuestionRow {
  text: string;
  type: QuestionType;
  dimensionId: string;
  isRequired: boolean;
}

export interface RowError {
  /** 1-based row number as it appears in the source file (header is row 1, first data row is row 2). */
  row: number;
  message: string;
  /** The raw row that produced the error, for the preview UI. */
  raw?: Record<string, string>;
}

export interface ParseResult {
  valid: ParsedQuestionRow[];
  errors: RowError[];
  /** Total data rows seen (excluding header), regardless of validity. */
  total: number;
}

interface DimensionLookup {
  id: string;
  name: string;
}

const ALLOWED_TYPES: QuestionType[] = ["LIKERT", "TEXT", "NPS", "RATING"];

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "sí", "si", "verdadero"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n", "falso"]);

function parseRequired(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === null) return true; // default
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed === "") return true;
  if (TRUE_VALUES.has(trimmed)) return true;
  if (FALSE_VALUES.has(trimmed)) return false;
  return null;
}

function normalizeType(raw: string | undefined): QuestionType | null {
  if (raw === undefined || raw === null) return "LIKERT"; // default
  const trimmed = String(raw).trim().toUpperCase();
  if (trimmed === "") return "LIKERT";
  if ((ALLOWED_TYPES as string[]).includes(trimmed)) return trimmed as QuestionType;
  return null;
}

function findDimensionId(
  raw: string | undefined,
  dimensions: DimensionLookup[]
): { id: string; matched: boolean } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { id: "", matched: true };
  const lc = trimmed.toLowerCase();
  const match = dimensions.find((d) => d.name.toLowerCase() === lc);
  if (match) return { id: match.id, matched: true };
  return { id: "", matched: false };
}

/**
 * Parse a CSV string of climate-survey questions.
 *
 * Expected headers (case-insensitive, trimmed):
 *   - text       (required)
 *   - type       (LIKERT | TEXT | NPS | RATING — defaults to LIKERT)
 *   - dimension  (matches dimension name, case-insensitive — optional)
 *   - required   (true/false/sí/no/1/0 — defaults to true)
 *
 * Unknown columns are ignored. Empty rows are skipped silently.
 */
export function parseQuestionsCsv(
  csv: string,
  dimensions: DimensionLookup[]
): ParseResult {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: ParsedQuestionRow[] = [];
  const errors: RowError[] = [];

  if (result.errors && result.errors.length > 0) {
    for (const err of result.errors) {
      // Papaparse's raw messages aren't translation keys; surface them under
      // the defined `parse_failed` bucket so the UI gets a localized string.
      // Row index is 0-based for data rows; +2 to make it 1-based with header offset.
      errors.push({
        row: typeof err.row === "number" ? err.row + 2 : 0,
        message: "parse_failed",
      });
    }
  }

  const rows = result.data || [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] || {};
    const rowNumber = i + 2; // header is row 1, data starts row 2

    const text = String(raw.text ?? "").trim();
    if (!text) {
      errors.push({
        row: rowNumber,
        message: "empty_text",
        raw,
      });
      continue;
    }

    const type = normalizeType(raw.type);
    if (type === null) {
      errors.push({
        row: rowNumber,
        message: "invalid_type",
        raw,
      });
      continue;
    }

    const required = parseRequired(raw.required);
    if (required === null) {
      errors.push({
        row: rowNumber,
        message: "invalid_required",
        raw,
      });
      continue;
    }

    const dim = findDimensionId(raw.dimension, dimensions);
    if (!dim.matched) {
      errors.push({
        row: rowNumber,
        message: "unknown_dimension",
        raw,
      });
      continue;
    }

    valid.push({
      text,
      type,
      dimensionId: dim.id,
      isRequired: required,
    });
  }

  return {
    valid,
    errors,
    total: rows.length,
  };
}
