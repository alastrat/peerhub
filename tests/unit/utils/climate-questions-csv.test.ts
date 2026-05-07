import { describe, it, expect } from "vitest";
import { parseQuestionsCsv } from "@/lib/utils/climate-questions-import";

const DIMENSIONS = [
  { id: "dim-leadership", name: "Liderazgo" },
  { id: "dim-comms", name: "Comunicación" },
];

describe("parseQuestionsCsv", () => {
  it("parses a simple valid file with all columns", () => {
    const csv = [
      "text,type,dimension,required",
      "Mi líder me da retroalimentación,LIKERT,Liderazgo,true",
      "Comentarios adicionales,TEXT,,false",
    ].join("\n");

    const result = parseQuestionsCsv(csv, DIMENSIONS);

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

  it("defaults type to LIKERT and required to true when columns are missing", () => {
    const csv = ["text", "Sólo el texto"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      type: "LIKERT",
      isRequired: true,
      dimensionId: "",
    });
  });

  it("matches dimension name case-insensitively", () => {
    const csv = [
      "text,dimension",
      "Pregunta uno,liderazgo",
      "Pregunta dos,COMUNICACIÓN",
    ].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid[0].dimensionId).toBe("dim-leadership");
    expect(result.valid[1].dimensionId).toBe("dim-comms");
  });

  it("accepts case-insensitive type values", () => {
    const csv = ["text,type", "A,nps", "B,Rating", "C,Text"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid.map((r) => r.type)).toEqual(["NPS", "RATING", "TEXT"]);
  });

  it("accepts spanish/english truthy strings for required", () => {
    const csv = [
      "text,required",
      "A,sí",
      "B,no",
      "C,1",
      "D,0",
      "E,YES",
      "F,FALSE",
    ].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid.map((r) => r.isRequired)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it("rejects rows with empty text", () => {
    const csv = ["text,type", ",LIKERT", "Buena pregunta,LIKERT"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 2, message: "empty_text" });
  });

  it("rejects rows with invalid type", () => {
    const csv = ["text,type", "A,MULTIPLE_CHOICE"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("invalid_type");
  });

  it("rejects rows with unrecognized dimension", () => {
    const csv = ["text,dimension", "A,Compensación"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("unknown_dimension");
  });

  it("rejects rows with invalid required value", () => {
    const csv = ["text,required", "A,maybe"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toBe("invalid_required");
  });

  it("preserves the raw row for previewing errors", () => {
    const csv = ["text,type", "A,WRONG"].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.errors[0].raw).toMatchObject({ text: "A", type: "WRONG" });
  });

  it("skips empty rows silently", () => {
    const csv = [
      "text,type",
      "A,LIKERT",
      "",
      "  ",
      "B,TEXT",
    ].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.total).toBe(2);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });

  it("trims whitespace from text", () => {
    const csv = ["text", "  hola mundo  "].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid[0].text).toBe("hola mundo");
  });

  it("normalizes header casing", () => {
    const csv = ["TEXT,TYPE,Dimension,Required", "A,LIKERT,Liderazgo,true"].join(
      "\n"
    );
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].dimensionId).toBe("dim-leadership");
  });

  it("maps papaparse errors to the parse_failed translation key", () => {
    // Unterminated quoted field — papaparse emits a structured error.
    const csv = ['text', '"unterminated quote that never closes'].join("\n");
    const result = parseQuestionsCsv(csv, DIMENSIONS);

    // Every non-validation error must map to a known translation key, never
    // raw papaparse text.
    const knownKeys = new Set([
      "empty_text",
      "invalid_type",
      "invalid_required",
      "unknown_dimension",
      "parse_failed",
    ]);
    for (const err of result.errors) {
      expect(knownKeys.has(err.message)).toBe(true);
    }
    expect(result.errors.some((e) => e.message === "parse_failed")).toBe(true);
  });
});
