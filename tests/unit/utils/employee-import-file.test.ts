import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseEmployeeCsv, parseEmployeeXlsx, toImportTable, isXlsxFile } from "@/lib/utils/employee-import-file";
import { autoMapColumns, orderForImport, validateEmployeeRows } from "@/lib/utils/employee-import";

// Copied into this realm's ArrayBuffer: under jsdom a Node Buffer's isn't one
function readArrayBuffer(file: string): ArrayBuffer {
  return new Uint8Array(readFileSync(file)).buffer;
}

const ROOT = path.resolve(__dirname, "../../..");
const TEMPLATE = path.join(ROOT, "public/employees-import-template.xlsx");
const DEMO = path.join(ROOT, "tests/fixtures/employees-import-demo.xlsx");

const KULTIVA_HEADERS = [
  "Cédula",
  "Nombres y Apellidos",
  "Cargo",
  "Correo corporativo",
  "Sede",
  "Área",
  "Líder directo",
  "Cédula del líder",
  "Fecha de ingreso",
  "Género",
  "Fecha de nacimiento",
  "Nivel jerárquico",
];

describe("toImportTable", () => {
  it("drops header-less columns and blank rows, keeping spreadsheet row numbers", () => {
    const table = toImportTable([
      ["", "", ""],
      ["Cédula", "Nombre", "", "Notas"],
      ["1", "Ana", "← nota sin encabezado", "x"],
      ["", "", "Encabezado rojo = obligatorio", ""],
      ["2", "Leo"],
    ]);
    expect(table).toEqual({
      headers: ["Cédula", "Nombre", "Notas"],
      rows: [["1", "Ana", "x"], ["2", "Leo", ""]],
      rowNumbers: [3, 5],
    });
  });

  it("handles an empty file", () => {
    expect(toImportTable([])).toEqual({ headers: [], rows: [], rowNumbers: [] });
  });
});

describe("parseEmployeeCsv", () => {
  it("reads comma-separated files with quoted commas", () => {
    const table = parseEmployeeCsv('email,name,title\nana@acme.com,"Pérez, Ana","Analista, Nómina"\n');
    expect(table.rows).toEqual([["ana@acme.com", "Pérez, Ana", "Analista, Nómina"]]);
  });

  it("reads semicolon-separated CSV from Spanish Excel, with a BOM and CRLF", () => {
    const table = parseEmployeeCsv("﻿Cédula;Nombres y Apellidos;Correo corporativo\r\n52987654;Luisa Martínez;luisa@acme.com\r\n\r\n");
    expect(table.headers).toEqual(["Cédula", "Nombres y Apellidos", "Correo corporativo"]);
    expect(table.rows).toEqual([["52987654", "Luisa Martínez", "luisa@acme.com"]]);
    expect(autoMapColumns(table.headers)).toEqual({ nationalId: 0, name: 1, email: 2 });
  });
});

describe("parseEmployeeXlsx", () => {
  it("reads the downloadable template's Colaboradores sheet, without its side notes", async () => {
    const table = await parseEmployeeXlsx(readArrayBuffer(TEMPLATE));
    expect(table.headers).toEqual(KULTIVA_HEADERS);
    // The four grey example rows; the legend in column N and the 500 formatted rows are dropped
    expect(table.rows.map((r) => r[0])).toEqual(["1010101010", "1020304050", "1040506070", "1030405060"]);
    expect(table.rowNumbers).toEqual([2, 3, 4, 5]);
    expect(table.rows[1]).toEqual([
      "1020304050",
      "María Pérez Gómez",
      "Analista de Talento Humano",
      "maria.perez@empresa.com",
      "Bogotá",
      "Talento Humano",
      "Camila Rojas Mejía",
      "1010101010",
      "2022-03-15",
      "Femenino",
      "1990-05-20",
      "Colaborador",
    ]);
  });

  it("rejects the template's untouched example rows", async () => {
    const table = await parseEmployeeXlsx(readArrayBuffer(TEMPLATE));
    const results = validateEmployeeRows(table, autoMapColumns(table.headers));
    expect(results.every((r) => r.errors.some((e) => e.code === "example_row"))).toBe(true);
  });

  it("imports a filled-in template: Excel dates, dotted cédulas, leaders first", async () => {
    const table = await parseEmployeeXlsx(readArrayBuffer(DEMO));
    expect(table.rows).toHaveLength(14);

    const results = validateEmployeeRows(table, autoMapColumns(table.headers), new Date("2026-11-04T12:00:00Z"));
    expect(results.flatMap((r) => r.errors)).toEqual([]);
    expect(results.flatMap((r) => r.warnings)).toEqual([]);

    const byName = Object.fromEntries(results.map((r) => [r.data.name, r.data]));
    // Typed as a real Excel date, not text
    expect(byName["Juan Camilo Arango Vélez"].startDate).toBe("2015-08-03");
    // Day-first text date
    expect(byName["Mariana López Bermúdez"].birthDate).toBe("1993-08-05");
    expect(byName["Felipe Andrés Cortés Niño"].nationalId).toBe("1010223344");
    expect(byName["Laura Cristina Vélez Montoya"]).toMatchObject({ gender: "NON_BINARY", jobLevel: "STAFF", hub: "Medellín" });

    const order = orderForImport(results).map((r) => r.data.name);
    const before = (leader: string, report: string) => expect(order.indexOf(leader)).toBeLessThan(order.indexOf(report));
    before("Luisa Fernanda Martínez Ochoa", "Daniela Ospina Cárdenas");
    before("Sebastián Moreno Quintero", "Mateo Giraldo Zapata");
    before("Juan Camilo Arango Vélez", "Sebastián Moreno Quintero");
    before("Andrés Felipe Restrepo Gómez", "Juan Camilo Arango Vélez");
    before("Luisa Fernanda Martínez Ochoa", "Natalia Herrera Pinzón");
  });

  it("falls back to the first sheet with known headers when there's no Colaboradores sheet", async () => {
    // The old CSV template saved as .xlsx by SheetJS, on a sheet named "Hoja1"
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["email", "name"],
      ["ana@acme.com", "Ana"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Notas"]]), "Notas");
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const table = await parseEmployeeXlsx(buffer);
    expect(table.headers).toEqual(["email", "name"]);
    expect(table.rows).toEqual([["ana@acme.com", "Ana"]]);
  });
});

describe("isXlsxFile", () => {
  it("goes by extension", () => {
    expect(isXlsxFile({ name: "Formato-colaboradores.XLSX" })).toBe(true);
    expect(isXlsxFile({ name: "colaboradores.csv" })).toBe(false);
  });
});
