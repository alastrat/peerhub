export const CLIMATE_SURVEY_TYPE_LABELS: Record<string, string> = {
  CLIMATE: "Climate Survey",
  PULSE: "Pulse Survey",
  ENPS: "eNPS",
};

export const CLIMATE_SURVEY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const CLIMATE_SURVEY_STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  CLOSED: "outline",
  ARCHIVED: "secondary",
};

export const SURVEY_QUESTION_TYPE_LABELS: Record<string, string> = {
  LIKERT: "Likert Scale (1-5)",
  TEXT: "Open Text",
  NPS: "NPS (0-10)",
  RATING: "Numeric Rating",
};

export const SURVEY_FREQUENCY_LABELS: Record<string, string> = {
  ONCE: "One-time",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BIANNUAL: "Biannual",
  ANNUAL: "Annual",
};

export const LIKERT_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

export const NPS_CATEGORIES = {
  DETRACTOR: { min: 0, max: 6, label: "Detractors", color: "text-red-600" },
  PASSIVE: { min: 7, max: 8, label: "Passives", color: "text-yellow-600" },
  PROMOTER: { min: 9, max: 10, label: "Promoters", color: "text-green-600" },
} as const;

export const DEFAULT_DIMENSIONS = [
  { name: "Leadership", description: "Quality and effectiveness of leadership across the organization", icon: "Crown" },
  { name: "Communication", description: "Transparency, clarity, and frequency of organizational communication", icon: "MessageSquare" },
  { name: "Work-Life Balance", description: "Support for maintaining healthy work-life boundaries", icon: "Scale" },
  { name: "Growth & Development", description: "Opportunities for learning, career advancement, and skill development", icon: "TrendingUp" },
  { name: "Recognition", description: "Acknowledgment and appreciation of employee contributions", icon: "Award" },
  { name: "Culture & Values", description: "Alignment between stated values and actual organizational culture", icon: "Heart" },
  { name: "Compensation & Benefits", description: "Fairness and competitiveness of pay and benefits", icon: "DollarSign" },
] as const;

export function calculateNPS(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const promoters = ratings.filter((r) => r >= 9).length;
  const detractors = ratings.filter((r) => r <= 6).length;
  return Math.round(((promoters - detractors) / ratings.length) * 100);
}

export function getNPSCategory(score: number): "DETRACTOR" | "PASSIVE" | "PROMOTER" {
  if (score <= 6) return "DETRACTOR";
  if (score <= 8) return "PASSIVE";
  return "PROMOTER";
}
