import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseQuestionsXlsx } from "@/lib/utils/climate-questions-import";

const DIMENSIONS = [
  { id: "dim-leadership", name: "Liderazgo" },
  { id: "dim-comms", name: "Comunicación" },
];

function buildXlsxBuffer(rows: unknown[][], sheetName = "Preguntas"): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // `bookType: 'xlsx'` + `type: 'array'` → ArrayBuffer.
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseQuestionsXlsx", () => {
  it("parses a simple valid file with all columns", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type", "dimension", "required"],
      ["Mi líder me da retroalimentación", "LIKERT", "Liderazgo", true],
      ["Comentarios adicionales", "TEXT", "", false],
    ]);

    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.errors).toEqual([]);
    expect(result.total).toBe(2);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toEqual({
      text: "Mi líder me da retroalimentación",
      type: "LIKERT",
      dimensionId: "dim-leadership",
      isRequired: true,
    });
    expect(result.valid[1]).toEqual({
      text: "Comentarios adicionales",
      type: "TEXT",
      dimensionId: "",
      isRequired: false,
    });
  });

  it("defaults type to LIKERT and required to true when columns are missing", async () => {
    const buf = buildXlsxBuffer([["text"], ["Sólo el texto"]]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      type: "LIKERT",
      isRequired: true,
      dimensionId: "",
    });
  });

  it("matches dimension name case-insensitively", async () => {
    const buf = buildXlsxBuffer([
      ["text", "dimension"],
      ["Pregunta uno", "liderazgo"],
      ["Pregunta dos", "COMUNICACIÓN"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid[0].dimensionId).toBe("dim-leadership");
    expect(result.valid[1].dimensionId).toBe("dim-comms");
  });

  it("accepts case-insensitive type values", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type"],
      ["A", "nps"],
      ["B", "Rating"],
      ["C", "Text"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid.map((r) => r.type)).toEqual(["NPS", "RATING", "TEXT"]);
  });

  it("accepts boolean cells for required (true/false)", async () => {
    const buf = buildXlsxBuffer([
      ["text", "required"],
      ["A", true],
      ["B", false],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.errors).toEqual([]);
    expect(result.valid.map((r) => r.isRequired)).toEqual([true, false]);
  });

  it("accepts numeric cells for required (1/0)", async () => {
    const buf = buildXlsxBuffer([
      ["text", "required"],
      ["A", 1],
      ["B", 0],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.errors).toEqual([]);
    expect(result.valid.map((r) => r.isRequired)).toEqual([true, false]);
  });

  it("accepts spanish/english string cells for required", async () => {
    const buf = buildXlsxBuffer([
      ["text", "required"],
      ["A", "sí"],
      ["B", "no"],
      ["C", "YES"],
      ["D", "FALSE"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.errors).toEqual([]);
    expect(result.valid.map((r) => r.isRequired)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("rejects rows with empty text", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type"],
      ["", "LIKERT"],
      ["Buena pregunta", "LIKERT"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ message: "empty_text" });
  });

  it("rejects rows with invalid type", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type"],
      ["A", "MULTIPLE_CHOICE"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("invalid_type");
  });

  it("rejects rows with unrecognized dimension", async () => {
    const buf = buildXlsxBuffer([
      ["text", "dimension"],
      ["A", "Compensación"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("unknown_dimension");
  });

  it("rejects rows with invalid string required value", async () => {
    const buf = buildXlsxBuffer([
      ["text", "required"],
      ["A", "maybe"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("invalid_required");
  });

  it("rejects numeric required values that are not 0 or 1", async () => {
    const buf = buildXlsxBuffer([
      ["text", "required"],
      ["A", 7],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("invalid_required");
  });

  it("skips empty rows silently", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type"],
      ["A", "LIKERT"],
      ["", ""],
      [null, null],
      ["B", "TEXT"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.total).toBe(2);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });

  it("ignores headers it doesn't recognize", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type", "extra_column"],
      ["A", "LIKERT", "noise"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it("normalizes header casing", async () => {
    const buf = buildXlsxBuffer([
      ["TEXT", "TYPE", "Dimension", "Required"],
      ["A", "LIKERT", "Liderazgo", true],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].dimensionId).toBe("dim-leadership");
  });

  it("ignores additional sheets — only the first is read", async () => {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["text", "type"],
      ["First sheet question", "LIKERT"],
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["text", "type"],
      ["IGNORE ME — second sheet", "TEXT"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Preguntas");
    XLSX.utils.book_append_sheet(wb, ws2, "Otras");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].text).toBe("First sheet question");
    expect(result.errors).toEqual([]);
  });

  it("returns parse_failed for a corrupt buffer", async () => {
    const garbage = new TextEncoder().encode("this is definitely not an xlsx file");
    const buf = garbage.buffer.slice(
      garbage.byteOffset,
      garbage.byteOffset + garbage.byteLength
    ) as ArrayBuffer;
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.valid).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.errors).toEqual([{ row: 0, message: "parse_failed" }]);
  });

  it("preserves the raw row for previewing errors", async () => {
    const buf = buildXlsxBuffer([
      ["text", "type"],
      ["A", "WRONG"],
    ]);
    const result = await parseQuestionsXlsx(buf, DIMENSIONS);

    expect(result.errors[0].raw).toMatchObject({ text: "A", type: "WRONG" });
  });
});
