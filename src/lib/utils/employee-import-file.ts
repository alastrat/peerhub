import Papa from "papaparse";
import readXlsxFile from "read-excel-file/universal";
import { autoMapColumns, normalizeHeader, TEMPLATE_SHEET_NAME, type ImportTable } from "./employee-import";

/**
 * Header row plus the data rows below it. Columns without a header (the
 * template's side notes) and rows that are blank in every kept column (the
 * template's empty formatted rows) are dropped.
 */
export function toImportTable(cells: string[][]): ImportTable {
  const headerIndex = cells.findIndex((row) => row.some((c) => c.trim()));
  if (headerIndex < 0) return { headers: [], rows: [], rowNumbers: [] };

  const headerRow = cells[headerIndex];
  const kept = headerRow.flatMap((h, i) => (h.trim() ? [i] : []));
  const table: ImportTable = { headers: kept.map((i) => headerRow[i].trim()), rows: [], rowNumbers: [] };
  cells.slice(headerIndex + 1).forEach((row, i) => {
    const values = kept.map((c) => (row[c] ?? "").trim());
    if (!values.some(Boolean)) return;
    table.rows.push(values);
    table.rowNumbers.push(headerIndex + i + 2);
  });
  return table;
}

/** CSV saved from Excel: comma or semicolon separated (Spanish Excel uses ";"), with or without a BOM. */
export function parseEmployeeCsv(text: string): ImportTable {
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: false });
  return toImportTable(data);
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  // Date-formatted cells come back as UTC midnight
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

/**
 * Kultiva's template (.xlsx): reads the "Colaboradores" sheet, or else the
 * first sheet whose headers we recognize. Numbers are kept as written, so a
 * cédula typed as a number doesn't turn into 1.01E+09.
 */
export async function parseEmployeeXlsx(input: ArrayBuffer | Blob): Promise<ImportTable> {
  const sheets = await readXlsxFile(input, { parseNumber: (value: string) => value });
  const tables = sheets.map((s) => ({ name: s.sheet, table: toImportTable(s.data.map((row) => row.map(cellToString))) }));
  const chosen =
    tables.find((s) => normalizeHeader(s.name) === normalizeHeader(TEMPLATE_SHEET_NAME)) ??
    tables.find((s) => Object.keys(autoMapColumns(s.table.headers)).length > 0) ??
    tables[0];
  return chosen?.table ?? { headers: [], rows: [], rowNumbers: [] };
}

export function isXlsxFile(file: { name: string }): boolean {
  return file.name.toLowerCase().endsWith(".xlsx");
}

/** The wizard's single entry point: .xlsx goes through the Excel reader, anything else is CSV. */
export async function parseEmployeeFile(file: File): Promise<ImportTable> {
  if (isXlsxFile(file)) return parseEmployeeXlsx(await file.arrayBuffer());
  return parseEmployeeCsv(await file.text());
}
