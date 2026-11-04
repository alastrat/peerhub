// Shared by the /api/search route handler and the header search box, so it
// must stay free of server-only imports (Prisma, auth).

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 100;
export const SEARCH_RESULTS_PER_TYPE = 5;

// Order here is the order groups are queried and rendered in.
export const SEARCH_RESULT_TYPES = [
  "person",
  "climateSurvey",
  "actionPlan",
  "climateTemplate",
  "cycle",
  "department",
  "team",
  "company",
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

/**
 * Trims, collapses whitespace and caps the length of a raw query. Returns
 * null when there is nothing worth sending to the database.
 */
export function normalizeSearchQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const query = raw.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_QUERY_LENGTH).trim();
  return query.length >= SEARCH_MIN_QUERY_LENGTH ? query : null;
}
