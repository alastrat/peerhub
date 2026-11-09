/**
 * A CSV file's text: comma-separated, quoted where needed, with a BOM so
 * Excel reads accents (UTF-8) correctly. Cells that a spreadsheet would run
 * as a formula get a leading apostrophe (a phone number such as
 * "+573001234567" stays as it is).
 */
export function toCsv(rows: (string | null | undefined)[][]): string {
  const cell = (value: string | null | undefined) => {
    let v = value ?? "";
    if (/^[=@\t\r]/.test(v) || /^[+-](?!\d+$)/.test(v)) v = `'${v}`;
    return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
