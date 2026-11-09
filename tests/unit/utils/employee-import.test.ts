import { describe, it, expect } from "vitest";
import {
  autoMapColumns,
  normalizeHeader,
  normalizeImportDate,
  normalizeNationalId,
  orderForImport,
  validateEmployeeRows,
  type ImportRowData,
  type ImportTable,
} from "@/lib/utils/employee-import";

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

const TODAY = new Date("2026-11-04T12:00:00Z");

function table(headers: string[], rows: string[][]): ImportTable {
  return { headers, rows, rowNumbers: rows.map((_, i) => i + 2) };
}

/** A Kultiva-format row; pass overrides by header name. */
function kultivaRow(overrides: Partial<Record<(typeof KULTIVA_HEADERS)[number], string>> = {}): string[] {
  const base: Record<string, string> = {
    "Cédula": "52987654",
    "Nombres y Apellidos": "Luisa Fernanda Martínez Ochoa",
    "Cargo": "Directora de Talento Humano",
    "Correo corporativo": "luisa.martinez@acme.com.co",
    "Sede": "Bogotá",
    "Área": "Talento Humano",
    "Líder directo": "",
    "Cédula del líder": "",
    "Fecha de ingreso": "2016-01-11",
    "Género": "Femenino",
    "Fecha de nacimiento": "1982-02-14",
    "Nivel jerárquico": "Gerencia",
  };
  return KULTIVA_HEADERS.map((h) => overrides[h] ?? base[h]);
}

function validateKultiva(rows: string[][]) {
  const t = table(KULTIVA_HEADERS, rows);
  return validateEmployeeRows(t, autoMapColumns(t.headers), TODAY);
}

describe("normalizeHeader", () => {
  it("drops accents, case and punctuation", () => {
    expect(normalizeHeader("  Cédula del líder ")).toBe("cedula del lider");
    expect(normalizeHeader("Fecha de ingreso (AAAA-MM-DD)")).toBe("fecha de ingreso aaaa mm dd");
    expect(normalizeHeader("managerEmail")).toBe("manageremail");
  });
});

describe("autoMapColumns", () => {
  it("maps every column of Kultiva's template", () => {
    expect(autoMapColumns(KULTIVA_HEADERS)).toEqual({
      nationalId: 0,
      name: 1,
      title: 2,
      email: 3,
      hub: 4,
      department: 5,
      managerName: 6,
      managerNationalId: 7,
      startDate: 8,
      gender: 9,
      birthDate: 10,
      jobLevel: 11,
    });
  });

  it("still maps the old CSV template's English headers", () => {
    const headers = ["email", "name", "title", "department", "managerEmail", "role", "startDate", "gender", "birthDate"];
    expect(autoMapColumns(headers)).toEqual({
      email: 0,
      name: 1,
      title: 2,
      department: 3,
      managerEmail: 4,
      role: 5,
      startDate: 6,
      gender: 7,
      birthDate: 8,
    });
  });

  it("never maps one column to two fields, nor guesses from partial words", () => {
    // "Cédula del líder" must not be taken as the person's own cédula
    expect(autoMapColumns(["Cédula del líder", "Correo del jefe"])).toEqual({ managerNationalId: 0, managerEmail: 1 });
    expect(autoMapColumns(["Nombre de la mascota", "Observaciones"])).toEqual({});
  });

  it("ignores blank headers", () => {
    expect(autoMapColumns(["", "Cédula"])).toEqual({ nationalId: 1 });
  });
});

describe("normalizeNationalId", () => {
  it.each([
    ["1.010.223.344", "1010223344"],
    [" 52 987 654 ", "52987654"],
    ["1,020,304", "1020304"],
    ["pa-123x", "PA-123X"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeNationalId(input)).toBe(expected);
  });
});

describe("normalizeImportDate", () => {
  it.each([
    ["2022-03-15", "2022-03-15"],
    ["2022/3/5", "2022-03-05"],
    ["15/03/2022", "2022-03-15"],
    ["5-3-2022", "2022-03-05"],
    ["2022-03-15T00:00:00.000Z", "2022-03-15"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeImportDate(input)).toBe(expected);
  });

  it.each(["2022-02-30", "31/04/2022", "March 15, 2022", "15/03/22", "44635", ""])("rejects %j", (input) => {
    expect(normalizeImportDate(input)).toBeNull();
  });
});

describe("validateEmployeeRows", () => {
  it("normalizes a valid Kultiva row into API fields", () => {
    const [result] = validateKultiva([kultivaRow({ "Cédula": "52.987.654", "Correo corporativo": "Luisa.Martinez@ACME.com.co", "Fecha de ingreso": "11/01/2016" })]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.data).toEqual({
      nationalId: "52987654",
      name: "Luisa Fernanda Martínez Ochoa",
      title: "Directora de Talento Humano",
      email: "luisa.martinez@acme.com.co",
      hub: "Bogotá",
      department: "Talento Humano",
      startDate: "2016-01-11",
      gender: "FEMALE",
      birthDate: "1982-02-14",
      jobLevel: "MANAGER",
    });
  });

  it("requires cédula and name", () => {
    const [result] = validateKultiva([kultivaRow({ "Cédula": "", "Nombres y Apellidos": "", "Correo corporativo": "" })]);
    expect(result.errors.map((e) => e.code)).toEqual(["national_id_required", "name_too_short"]);
  });

  it("loads a row without an email, with a warning, and reads the mobile number", () => {
    const t = table([...KULTIVA_HEADERS, "Celular"], [[...kultivaRow({ "Correo corporativo": "" }), "300 123-4567"]]);
    const mapping = autoMapColumns(t.headers);
    expect(mapping.phone).toBe(KULTIVA_HEADERS.length);
    const [result] = validateEmployeeRows(t, mapping, TODAY);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((w) => w.code)).toEqual(["no_email"]);
    expect(result.data.phone).toBe("3001234567");
    expect(result.data.email).toBeUndefined();
  });

  it("recognizes common mobile headers and rejects an invalid number", () => {
    for (const header of ["Celular", "Teléfono celular", "WhatsApp", "Móvil", "Phone"]) {
      expect(autoMapColumns(["Cédula", header]).phone).toBe(1);
    }
    const t = table([...KULTIVA_HEADERS, "Celular"], [[...kultivaRow(), "llamar"]]);
    const [result] = validateEmployeeRows(t, autoMapColumns(t.headers), TODAY);
    expect(result.errors).toEqual([{ code: "phone_invalid", value: "llamar" }]);
  });

  it("warns that a role is ignored without an email", () => {
    const t = table([...KULTIVA_HEADERS, "Rol"], [[...kultivaRow({ "Correo corporativo": "" }), "Manager"]]);
    const [result] = validateEmployeeRows(t, autoMapColumns(t.headers), TODAY);
    expect(result.warnings.map((w) => w.code)).toEqual(["no_email", "role_without_email"]);
  });

  it("rejects every row that shares a cédula or an email", () => {
    const results = validateKultiva([
      kultivaRow(),
      kultivaRow({ "Correo corporativo": "otra@acme.com.co" }),
      kultivaRow({ "Cédula": "1032456789", "Correo corporativo": "LUISA.martinez@acme.com.co" }),
    ]);
    expect(results[0].errors.map((e) => e.code)).toEqual(["duplicate_national_id", "duplicate_email"]);
    expect(results[1].errors).toEqual([{ code: "duplicate_national_id", value: "52987654" }]);
    expect(results[2].errors).toEqual([{ code: "duplicate_email", value: "luisa.martinez@acme.com.co" }]);
  });

  it("flags the template's example rows left in the file", () => {
    const [result] = validateKultiva([kultivaRow({ "Cédula": "1020304050" })]);
    expect(result.errors).toEqual([{ code: "example_row" }]);
  });

  it("rejects unknown dropdown values and bad dates", () => {
    const [result] = validateKultiva([
      kultivaRow({ "Género": "Otro", "Nivel jerárquico": "Jefe", "Fecha de ingreso": "2022-02-30", "Fecha de nacimiento": "1850-01-01" }),
    ]);
    expect(result.errors).toEqual([
      { code: "gender_unknown", value: "Otro" },
      { code: "job_level_unknown", value: "Jefe" },
      { code: "invalid_date", field: "startDate", value: "2022-02-30" },
      { code: "birth_date_range", field: "birthDate" },
    ]);
  });

  it("accepts every value of the template's dropdowns", () => {
    const genders = ["Femenino", "Masculino", "No binario", "Prefiero no decir"];
    const levels = ["Colaborador", "Coordinador", "Líder", "Gerencia", "Dirección"];
    const results = validateKultiva(
      levels.map((level, i) =>
        kultivaRow({ "Cédula": String(100 + i), "Correo corporativo": `p${i}@acme.com.co`, "Género": genders[i % 4], "Nivel jerárquico": level }),
      ),
    );
    expect(results.flatMap((r) => r.errors)).toEqual([]);
    expect(results.map((r) => r.data.jobLevel)).toEqual(["STAFF", "COORDINATOR", "LEADER", "MANAGER", "DIRECTOR"]);
    expect(results.map((r) => r.data.gender)).toEqual(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY", "FEMALE"]);
  });

  it("warns, without blocking, when the leader isn't in the file", () => {
    const results = validateKultiva([
      kultivaRow(),
      kultivaRow({ "Cédula": "1", "Correo corporativo": "a@acme.com.co", "Líder directo": "Luisa Fernanda Martínez Ochoa", "Cédula del líder": "52.987.654" }),
      kultivaRow({ "Cédula": "2", "Correo corporativo": "b@acme.com.co", "Líder directo": "luisa fernanda martinez ochoa" }),
      kultivaRow({ "Cédula": "3", "Correo corporativo": "c@acme.com.co", "Líder directo": "Pedro Pérez", "Cédula del líder": "999" }),
      kultivaRow({ "Cédula": "4", "Correo corporativo": "d@acme.com.co", "Líder directo": "Persona Externa" }),
    ]);
    expect(results.map((r) => r.errors)).toEqual([[], [], [], [], []]);
    expect(results[1].data.managerNationalId).toBe("52987654");
    expect(results[1].warnings).toEqual([]);
    expect(results[2].warnings).toEqual([]);
    expect(results[3].warnings).toEqual([{ code: "manager_not_in_file", value: "Pedro Pérez" }]);
    expect(results[4].warnings).toEqual([{ code: "manager_not_in_file", value: "Persona Externa" }]);
  });

  it("rejects a row that names itself as leader", () => {
    const [result] = validateKultiva([kultivaRow({ "Cédula del líder": "52987654" })]);
    expect(result.errors).toEqual([{ code: "own_manager" }]);
  });

  it("keeps the old CSV's role column working", () => {
    const t = table(["email", "name", "role"], [["ana@acme.com", "Ana", "manager"], ["leo@acme.com", "Leo", "boss"]]);
    const results = validateEmployeeRows(t, autoMapColumns(t.headers), TODAY);
    expect(results[0].data.role).toBe("MANAGER");
    expect(results[1].errors.map((e) => e.code)).toContain("role_invalid");
  });

  it("reports the spreadsheet row number", () => {
    const t: ImportTable = { headers: KULTIVA_HEADERS, rows: [kultivaRow()], rowNumbers: [7] };
    expect(validateEmployeeRows(t, autoMapColumns(t.headers), TODAY)[0].row).toBe(7);
  });
});

describe("orderForImport", () => {
  const row = (data: ImportRowData) => ({ data });

  it("puts each leader before the people who report to them", () => {
    const rows = [
      row({ nationalId: "3", name: "Mateo", managerNationalId: "2" }),
      row({ nationalId: "2", name: "Sebastián", managerName: "juan camilo" }),
      row({ nationalId: "1", name: "Juan Camilo" }),
      row({ nationalId: "4", name: "Daniela", email: "d@x.co", managerEmail: "l@x.co" }),
      row({ nationalId: "5", name: "Luisa", email: "l@x.co" }),
    ];
    expect(orderForImport(rows).map((r) => r.data.name)).toEqual(["Juan Camilo", "Sebastián", "Mateo", "Luisa", "Daniela"]);
  });

  it("keeps file order when there's nothing to reorder, and survives cycles", () => {
    const flat = [row({ nationalId: "1" }), row({ nationalId: "2" })];
    expect(orderForImport(flat)).toEqual(flat);

    const cycle = [row({ nationalId: "1", managerNationalId: "2" }), row({ nationalId: "2", managerNationalId: "1" })];
    expect(orderForImport(cycle)).toHaveLength(2);
  });
});
