import Papa from "papaparse";
import { readSheet } from "read-excel-file/universal";

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

function parseRequired(
  raw: string | boolean | number | undefined | null
): boolean | null {
  if (raw === undefined || raw === null) return true; // default
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return null;
  }
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
 * Validate a single row (after header normalization). Used by both the CSV
 * and XLSX parsers so they share identical validation/coercion semantics.
 */
function validateRow(
  raw: Record<string, string>,
  rowNumber: number,
  dimensions: DimensionLookup[],
  required: boolean | null,
  errors: RowError[]
): ParsedQuestionRow | null {
  const text = String(raw.text ?? "").trim();
  if (!text) {
    errors.push({ row: rowNumber, message: "empty_text", raw });
    return null;
  }

  const type = normalizeType(raw.type);
  if (type === null) {
    errors.push({ row: rowNumber, message: "invalid_type", raw });
    return null;
  }

  if (required === null) {
    errors.push({ row: rowNumber, message: "invalid_required", raw });
    return null;
  }

  const dim = findDimensionId(raw.dimension, dimensions);
  if (!dim.matched) {
    errors.push({ row: rowNumber, message: "unknown_dimension", raw });
    return null;
  }

  return {
    text,
    type,
    dimensionId: dim.id,
    isRequired: required,
  };
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

    const required = parseRequired(raw.required);
    const parsed = validateRow(raw, rowNumber, dimensions, required, errors);
    if (parsed) valid.push(parsed);
  }

  return {
    valid,
    errors,
    total: rows.length,
  };
}

/**
 * Parse an XLSX workbook (as an ArrayBuffer) of climate-survey questions.
 *
 * Reads the FIRST sheet only. Header row uses the same column names as the
 * CSV variant (case-insensitive, trimmed). Empty rows are skipped silently.
 * Unknown columns are ignored. On any parse error (corrupt file, not real
 * xlsx, etc.) the result contains a single `parse_failed` error.
 */
export async function parseQuestionsXlsx(
  buffer: ArrayBuffer,
  dimensions: DimensionLookup[]
): Promise<ParseResult> {
  let rows: (string | number | boolean | typeof Date | null)[][];
  try {
    // `readSheet` reads sheet index 1 (the first sheet) by default. We
    // deliberately don't pass a Schema so we share the coercion logic with
    // the CSV path.
    rows = (await readSheet(buffer)) as unknown as (
      | string
      | number
      | boolean
      | typeof Date
      | null
    )[][];
  } catch {
    return {
      valid: [],
      errors: [{ row: 0, message: "parse_failed" }],
      total: 0,
    };
  }

  if (!rows || rows.length === 0) {
    return { valid: [], errors: [], total: 0 };
  }

  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((h) =>
    h === null || h === undefined ? "" : String(h).trim().toLowerCase()
  );

  const valid: ParsedQuestionRow[] = [];
  const errors: RowError[] = [];

  let dataRowCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i] || [];
    // Skip empty rows silently (every cell empty/null).
    const hasContent = cells.some(
      (c) => c !== null && c !== undefined && String(c).trim() !== ""
    );
    if (!hasContent) continue;

    dataRowCount += 1;
    const rowNumber = i + 1; // 1-based; header is row 1

    // Build a Record<string, string> matching the shape papaparse produces,
    // BUT we keep the raw value for `required` separately so we can hand the
    // boolean/number variants to the shared coercion helper.
    const raw: Record<string, string> = {};
    let requiredRaw: string | boolean | number | undefined | null = undefined;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const value = cells[c];
      if (key === "required") {
        if (typeof value === "boolean" || typeof value === "number") {
          requiredRaw = value;
          raw[key] = String(value);
        } else if (value === null || value === undefined) {
          requiredRaw = undefined;
        } else {
          requiredRaw = String(value);
          raw[key] = String(value);
        }
        continue;
      }
      if (value === null || value === undefined) continue;
      raw[key] = String(value);
    }

    const required = parseRequired(requiredRaw);
    const parsed = validateRow(raw, rowNumber, dimensions, required, errors);
    if (parsed) valid.push(parsed);
  }

  return {
    valid,
    errors,
    total: dataRowCount,
  };
}

/**
 * Dispatch by file extension. `.xlsx`/`.xls` go through the XLSX parser;
 * everything else is treated as CSV. This is the single entry point the
 * import dialog should call.
 */
export async function parseQuestionsFile(
  file: File,
  dimensions: DimensionLookup[]
): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    return parseQuestionsXlsx(buffer, dimensions);
  }
  const text = await file.text();
  return parseQuestionsCsv(text, dimensions);
}
