import { isValidBirthDate, parseGender } from "@/lib/constants/demographics";
import { parseJobLevel } from "@/lib/constants/job-levels";
import { normalizePhone } from "@/lib/people/phone";

/** Fields the employee import can fill, in the order the mapping step shows them. */
export const IMPORT_FIELDS = [
  "nationalId",
  "name",
  "email",
  "phone",
  "title",
  "hub",
  "department",
  "managerName",
  "managerNationalId",
  "managerEmail",
  "startDate",
  "gender",
  "birthDate",
  "jobLevel",
  "role",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

// Kultiva's format requires cédula and name. Email is optional: people
// without one get no email and answer surveys from a personal link
export const REQUIRED_IMPORT_FIELDS: readonly ImportField[] = ["nationalId", "name"];

/** The downloadable template (Kultiva's format) and the sheet people fill in. */
export const TEMPLATE_HREF = "/employees-import-template.xlsx";
export const TEMPLATE_FILENAME = "Formato-colaboradores-kultiva.xlsx";
export const TEMPLATE_SHEET_NAME = "Colaboradores";

/** Cédulas of the template's grey example rows, which must be deleted before uploading. */
export const TEMPLATE_EXAMPLE_NATIONAL_IDS: readonly string[] = ["1010101010", "1020304050", "1040506070", "1030405060"];

/** A parsed file: header cells and the non-blank data rows below them. */
export interface ImportTable {
  headers: string[];
  rows: string[][];
  /** Spreadsheet row number of each row in `rows` (the header is row 1). */
  rowNumbers: number[];
}

/** Field → index of the column in `ImportTable.headers` it is read from. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export type ImportRowData = Partial<Record<ImportField, string>>;

export type ImportIssueCode =
  | "national_id_required"
  | "duplicate_national_id"
  | "example_row"
  | "no_email"
  | "role_without_email"
  | "email_invalid"
  | "duplicate_email"
  | "phone_invalid"
  | "name_too_short"
  | "role_invalid"
  | "gender_unknown"
  | "job_level_unknown"
  | "invalid_date"
  | "birth_date_range"
  | "own_manager"
  | "manager_not_in_file";

export interface ImportIssue {
  code: ImportIssueCode;
  field?: ImportField;
  value?: string;
}

export interface ImportRowResult {
  /** Spreadsheet row number, as the person sees it in Excel. */
  row: number;
  data: ImportRowData;
  /** Block the row from being imported. */
  errors: ImportIssue[];
  /** Shown in the review, but the row is still imported. */
  warnings: ImportIssue[];
}

/** Lowercase, no accents, words separated by single spaces: "Cédula del líder" → "cedula del lider". */
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Normalized headers each field is recognized by: Kultiva's template first,
// then common Spanish variants and the old CSV template's English names
const HEADER_ALIASES: Record<ImportField, string[]> = {
  nationalId: ["cedula", "cedula de ciudadania", "numero de cedula", "documento", "numero de documento", "documento de identidad", "identificacion", "national id"],
  name: ["nombres y apellidos", "nombre completo", "nombre", "nombres", "name", "full name"],
  email: ["correo corporativo", "correo", "correo electronico", "email", "e mail"],
  phone: ["celular", "numero de celular", "telefono celular", "movil", "telefono movil", "whatsapp", "telefono", "numero de telefono", "phone", "mobile", "phone number"],
  title: ["cargo", "puesto", "title", "job title"],
  hub: ["sede", "hub", "site", "location"],
  department: ["area", "departamento", "department"],
  managerName: ["lider directo", "lider", "jefe directo", "jefe inmediato", "jefe", "manager", "manager name"],
  managerNationalId: ["cedula del lider", "cedula lider", "cedula del jefe", "cedula jefe", "manager national id"],
  managerEmail: ["correo del lider", "correo del jefe", "correo del jefe directo", "manager email"],
  startDate: ["fecha de ingreso", "fecha ingreso", "ingreso", "start date", "hire date"],
  gender: ["genero", "sexo", "gender"],
  birthDate: ["fecha de nacimiento", "fecha nacimiento", "nacimiento", "birth date", "date of birth"],
  jobLevel: ["nivel jerarquico", "nivel", "job level", "level"],
  role: ["rol", "role"],
};

/**
 * Match file headers to fields. Exact (normalized) matches win, then the same
 * text without spaces ("managerEmail" = "manager email"). Each column feeds at
 * most one field, so "Cédula del líder" never also counts as "Cédula".
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const compact = (s: string) => s.replace(/ /g, "");
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const passes: ((header: string, alias: string) => boolean)[] = [
    (header, alias) => header === alias,
    (header, alias) => compact(header) === compact(alias),
  ];
  for (const matches of passes) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== undefined) continue;
      const index = normalized.findIndex(
        (header, i) => header !== "" && !used.has(i) && HEADER_ALIASES[field].some((alias) => matches(header, alias)),
      );
      if (index >= 0) {
        mapping[field] = index;
        used.add(index);
      }
    }
  }
  return mapping;
}

/** Cédulas are compared without spaces or thousands separators ("1.010.101.010" = "1010101010"). */
export function normalizeNationalId(value: string): string {
  return value.replace(/[\s.,]/g, "").toUpperCase();
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * "2022-03-15", "2022/03/15", "15/03/2022" or "15-03-2022" → "2022-03-15".
 * Day-first is the Colombian convention; anything else (or an impossible
 * date such as 2022-02-30) → null.
 */
export function normalizeImportDate(value: string): string | null {
  const v = value.trim();
  let year: number, month: number, day: number;
  const ymd = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ][\d:.]+Z?)?$/);
  const dmy = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ymd) [year, month, day] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
  else if (dmy) [day, month, year] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** How a name is compared when a row points at its leader by name. */
export function nameKey(name: string): string {
  return normalizeHeader(name);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["ADMIN", "MANAGER", "MEMBER"];

function extractRow(cells: string[], mapping: ColumnMapping): ImportRowData {
  const data: ImportRowData = {};
  // Blank cells are left out: the API rejects "" for optional columns such as managerEmail
  for (const field of IMPORT_FIELDS) {
    const index = mapping[field];
    if (index === undefined) continue;
    const value = cells[index]?.trim();
    if (value) data[field] = value;
  }
  return data;
}

function countBy(values: (string | undefined)[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

/**
 * Normalize and check every row before anything is sent. Same rules as
 * /api/people/import, so rows fail here instead of mid-import, plus the
 * checks only the whole file allows (repeated cédulas or emails, leaders
 * missing from the file).
 */
export function validateEmployeeRows(table: ImportTable, mapping: ColumnMapping, today: Date = new Date()): ImportRowResult[] {
  const rows = table.rows.map((cells) => {
    const data = extractRow(cells, mapping);
    if (data.nationalId) data.nationalId = normalizeNationalId(data.nationalId);
    if (data.managerNationalId) data.managerNationalId = normalizeNationalId(data.managerNationalId);
    if (data.email) data.email = data.email.toLowerCase();
    if (data.managerEmail) data.managerEmail = data.managerEmail.toLowerCase();
    return data;
  });

  const nationalIdCounts = countBy(rows.map((d) => d.nationalId));
  const emailCounts = countBy(rows.map((d) => d.email));
  const fileNationalIds = new Set(nationalIdCounts.keys());
  const fileEmails = new Set(emailCounts.keys());
  const fileNames = new Set(rows.flatMap((d) => (d.name ? [nameKey(d.name)] : [])));

  return rows.map((data, i) => {
    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];

    if (!data.nationalId) {
      errors.push({ code: "national_id_required" });
    } else if (TEMPLATE_EXAMPLE_NATIONAL_IDS.includes(data.nationalId)) {
      errors.push({ code: "example_row" });
    } else if (nationalIdCounts.get(data.nationalId)! > 1) {
      errors.push({ code: "duplicate_national_id", value: data.nationalId });
    }

    // Without an email the row still loads: no invitation or email reaches
    // them, and they answer surveys from a personal link
    if (!data.email) {
      warnings.push({ code: "no_email" });
      if (data.role) warnings.push({ code: "role_without_email" });
    } else if (!EMAIL_RE.test(data.email)) errors.push({ code: "email_invalid" });
    else if (emailCounts.get(data.email)! > 1) errors.push({ code: "duplicate_email", value: data.email });

    if (data.phone) {
      const phone = normalizePhone(data.phone);
      if (phone) data.phone = phone;
      else errors.push({ code: "phone_invalid", value: data.phone });
    }

    if (!data.name || data.name.length < 2) errors.push({ code: "name_too_short" });

    // The API only accepts the uppercase value
    if (data.role) {
      if (ROLES.includes(data.role.toUpperCase())) data.role = data.role.toUpperCase();
      else errors.push({ code: "role_invalid" });
    }

    if (data.gender) {
      const gender = parseGender(data.gender);
      if (gender) data.gender = gender;
      else errors.push({ code: "gender_unknown", value: data.gender });
    }

    if (data.jobLevel) {
      const level = parseJobLevel(data.jobLevel);
      if (level) data.jobLevel = level;
      else errors.push({ code: "job_level_unknown", value: data.jobLevel });
    }

    for (const field of ["startDate", "birthDate"] as const) {
      if (!data[field]) continue;
      const date = normalizeImportDate(data[field]!);
      if (!date) errors.push({ code: "invalid_date", field, value: data[field] });
      else data[field] = date;
    }
    if (data.birthDate && !errors.some((e) => e.field === "birthDate") && !isValidBirthDate(new Date(data.birthDate), today)) {
      errors.push({ code: "birth_date_range", field: "birthDate" });
    }

    // A leader who isn't in the file may already be in the company: the API
    // looks there, so this only warns
    if (data.managerNationalId && data.managerNationalId === data.nationalId) {
      errors.push({ code: "own_manager" });
    } else if (data.managerNationalId) {
      if (!fileNationalIds.has(data.managerNationalId)) warnings.push({ code: "manager_not_in_file", value: data.managerName ?? data.managerNationalId });
    } else if (data.managerEmail) {
      if (!fileEmails.has(data.managerEmail)) warnings.push({ code: "manager_not_in_file", value: data.managerName ?? data.managerEmail });
    } else if (data.managerName && !fileNames.has(nameKey(data.managerName))) {
      warnings.push({ code: "manager_not_in_file", value: data.managerName });
    }

    return { row: table.rowNumbers[i] ?? i + 2, data, errors, warnings };
  });
}

/**
 * Leaders before the people who report to them, so each row finds its leader
 * already imported. Rows keep their file order otherwise; cycles are broken
 * where they're found.
 */
export function orderForImport<T extends { data: ImportRowData }>(rows: T[]): T[] {
  const index = (key: (d: ImportRowData) => string | undefined) => {
    const map = new Map<string, number>();
    rows.forEach((r, i) => {
      const k = key(r.data);
      if (k && !map.has(k)) map.set(k, i);
    });
    return map;
  };
  const byNationalId = index((d) => d.nationalId);
  const byEmail = index((d) => d.email);
  const byName = index((d) => (d.name ? nameKey(d.name) : undefined));

  const managerOf = (d: ImportRowData): number | undefined =>
    (d.managerNationalId !== undefined ? byNationalId.get(d.managerNationalId) : undefined) ??
    (d.managerEmail !== undefined ? byEmail.get(d.managerEmail) : undefined) ??
    (d.managerName !== undefined ? byName.get(nameKey(d.managerName)) : undefined);

  const state = new Array<"new" | "visiting" | "done">(rows.length).fill("new");
  const ordered: T[] = [];
  const visit = (i: number) => {
    if (state[i] !== "new") return;
    state[i] = "visiting";
    const manager = managerOf(rows[i].data);
    if (manager !== undefined && manager !== i) visit(manager);
    state[i] = "done";
    ordered.push(rows[i]);
  };
  rows.forEach((_, i) => visit(i));
  return ordered;
}
