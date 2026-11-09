// Demographic groups used to segment climate results (spec §3.5). Climate
// results only ever show them aggregated and suppressed, never a person's
// values; those only appear in Personas, to admins (and to the person on
// their own page).

export const GENDERS = ["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"] as const;
export type GenderKey = (typeof GENDERS)[number];

/** Generations by birth year (same cut-offs as Kultiva's reports). */
export const GENERATIONS = ["GEN_Z", "MILLENNIALS", "GEN_X", "BABY_BOOMERS"] as const;
export type GenerationKey = (typeof GENERATIONS)[number];

/** Tenure at the time of answering. */
export const TENURES = ["UP_TO_1", "1_TO_3", "3_TO_5", "OVER_5"] as const;
export type TenureKey = (typeof TENURES)[number];

export function isGender(value: unknown): value is GenderKey {
  return typeof value === "string" && (GENDERS as readonly string[]).includes(value);
}

export function generationOf(birthDate: Date | null | undefined): GenerationKey | null {
  if (!birthDate) return null;
  const year = new Date(birthDate).getUTCFullYear();
  if (Number.isNaN(year)) return null;
  if (year >= 1997) return "GEN_Z";
  if (year >= 1981) return "MILLENNIALS";
  if (year >= 1965) return "GEN_X";
  return "BABY_BOOMERS";
}

/** A usable date of birth: a real date, from 1900 up to today. */
export function isValidBirthDate(date: Date, today: Date = new Date()): boolean {
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 1900 && date <= today;
}

export function tenureOf(startDate: Date | null | undefined, at: Date = new Date()): TenureKey | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime()) || start > at) return null;
  // Whole years completed at `at`
  let years = at.getUTCFullYear() - start.getUTCFullYear();
  const beforeAnniversary =
    at.getUTCMonth() < start.getUTCMonth() ||
    (at.getUTCMonth() === start.getUTCMonth() && at.getUTCDate() < start.getUTCDate());
  if (beforeAnniversary) years--;
  if (years < 1) return "UP_TO_1";
  if (years < 3) return "1_TO_3";
  if (years < 5) return "3_TO_5";
  return "OVER_5";
}

/** Parse a gender cell from a CSV import (Spanish or English, any case). */
export function parseGender(value: string | null | undefined): GenderKey | null {
  const v = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!v) return null;
  if (["f", "female", "femenino", "mujer", "woman"].includes(v)) return "FEMALE";
  if (["m", "male", "masculino", "hombre", "man"].includes(v)) return "MALE";
  if (["nb", "no binario", "no binaria", "non-binary", "nonbinary", "non binary", "no-binario"].includes(v)) return "NON_BINARY";
  if (["prefiero no decirlo", "prefiero no decir", "prefer not to say", "n/a", "na", "no responde"].includes(v)) return "PREFER_NOT_TO_SAY";
  return isGender(value?.trim().toUpperCase()) ? (value!.trim().toUpperCase() as GenderKey) : null;
}
