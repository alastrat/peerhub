// "Nivel jerárquico" from Kultiva's employee import format, lowest to highest.
// Labels live in the `job_levels` messages.

export const JOB_LEVELS = ["STAFF", "COORDINATOR", "LEADER", "MANAGER", "DIRECTOR"] as const;
export type JobLevelKey = (typeof JOB_LEVELS)[number];

export function isJobLevel(value: unknown): value is JobLevelKey {
  return typeof value === "string" && (JOB_LEVELS as readonly string[]).includes(value);
}

// The template's dropdown values (Spanish) plus their English labels
const JOB_LEVEL_ALIASES: Record<string, JobLevelKey> = {
  colaborador: "STAFF",
  colaboradora: "STAFF",
  staff: "STAFF",
  coordinador: "COORDINATOR",
  coordinadora: "COORDINATOR",
  coordinator: "COORDINATOR",
  lider: "LEADER",
  leader: "LEADER",
  gerencia: "MANAGER",
  gerente: "MANAGER",
  manager: "MANAGER",
  management: "MANAGER",
  direccion: "DIRECTOR",
  director: "DIRECTOR",
  directora: "DIRECTOR",
};

/** Parse a "Nivel jerárquico" cell from an import (Spanish or English, any case). */
export function parseJobLevel(value: string | null | undefined): JobLevelKey | null {
  const v = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!v) return null;
  return JOB_LEVEL_ALIASES[v] ?? (isJobLevel(value?.trim().toUpperCase()) ? (value!.trim().toUpperCase() as JobLevelKey) : null);
}
