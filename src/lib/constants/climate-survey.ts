// Flat maps — default to Spanish (platform default locale)
export const CLIMATE_SURVEY_TYPE_LABELS: Record<string, string> = {
  CLIMATE: "Encuesta de Clima",
  PULSE: "Encuesta de Pulso",
  ENPS: "eNPS",
  LEADERSHIP: "Liderazgo",
  CULTURE: "Cultura",
  PERFORMANCE: "Desempeño",
};

export const CLIMATE_SURVEY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
};

export const CLIMATE_SURVEY_STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  CLOSED: "outline",
  ARCHIVED: "secondary",
};

export const SURVEY_QUESTION_TYPE_LABELS: Record<string, string> = {
  LIKERT: "Escala Likert (1-5)",
  TEXT: "Texto Abierto",
  NPS: "NPS (0-10)",
  RATING: "Calificación Numérica",
};

export const SURVEY_FREQUENCY_LABELS: Record<string, string> = {
  ONCE: "Una vez",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  BIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

export const LIKERT_LABELS: Record<number, string> = {
  1: "Muy en Desacuerdo",
  2: "En Desacuerdo",
  3: "Neutral",
  4: "De Acuerdo",
  5: "Muy de Acuerdo",
};

export const NPS_CATEGORIES = {
  DETRACTOR: { min: 0, max: 6, label: "Detractores", color: "text-red-600" },
  PASSIVE: { min: 7, max: 8, label: "Pasivos", color: "text-yellow-600" },
  PROMOTER: { min: 9, max: 10, label: "Promotores", color: "text-green-600" },
} as const;

export const DEFAULT_DIMENSIONS = [
  { name: "Liderazgo", description: "Calidad y efectividad del liderazgo en la organización", icon: "Crown" },
  { name: "Comunicación", description: "Transparencia, claridad y frecuencia de la comunicación organizacional", icon: "MessageSquare" },
  { name: "Equilibrio Vida-Trabajo", description: "Apoyo para mantener límites saludables entre vida y trabajo", icon: "Scale" },
  { name: "Crecimiento y Desarrollo", description: "Oportunidades de aprendizaje, avance profesional y desarrollo de habilidades", icon: "TrendingUp" },
  { name: "Reconocimiento", description: "Reconocimiento y apreciación de las contribuciones de los empleados", icon: "Award" },
  { name: "Cultura y Valores", description: "Alineación entre los valores declarados y la cultura organizacional real", icon: "Heart" },
  { name: "Compensación y Beneficios", description: "Justicia y competitividad de la remuneración y los beneficios", icon: "DollarSign" },
] as const;

// Locale-aware getters
const CLIMATE_SURVEY_TYPE_LABELS_I18N: Record<string, Record<string, string>> = {
  es: CLIMATE_SURVEY_TYPE_LABELS,
  en: {
    CLIMATE: "Climate Survey",
    PULSE: "Pulse Survey",
    ENPS: "eNPS",
    LEADERSHIP: "Leadership",
    CULTURE: "Culture",
    PERFORMANCE: "Performance",
  },
};

const CLIMATE_SURVEY_STATUS_LABELS_I18N: Record<string, Record<string, string>> = {
  es: CLIMATE_SURVEY_STATUS_LABELS,
  en: { DRAFT: "Draft", ACTIVE: "Active", CLOSED: "Closed", ARCHIVED: "Archived" },
};

const SURVEY_QUESTION_TYPE_LABELS_I18N: Record<string, Record<string, string>> = {
  es: SURVEY_QUESTION_TYPE_LABELS,
  en: { LIKERT: "Likert Scale (1-5)", TEXT: "Open Text", NPS: "NPS (0-10)", RATING: "Numeric Rating" },
};

const SURVEY_FREQUENCY_LABELS_I18N: Record<string, Record<string, string>> = {
  es: SURVEY_FREQUENCY_LABELS,
  en: { ONCE: "One-time", WEEKLY: "Weekly", BIWEEKLY: "Biweekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", BIANNUAL: "Biannual", ANNUAL: "Annual" },
};

const LIKERT_LABELS_I18N: Record<string, Record<number, string>> = {
  es: LIKERT_LABELS,
  en: { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" },
};

type NPSCategoryMap = Record<string, { min: number; max: number; label: string; color: string }>;

const NPS_CATEGORIES_I18N: Record<string, NPSCategoryMap> = {
  es: NPS_CATEGORIES,
  en: {
    DETRACTOR: { min: 0, max: 6, label: "Detractors", color: "text-red-600" },
    PASSIVE: { min: 7, max: 8, label: "Passives", color: "text-yellow-600" },
    PROMOTER: { min: 9, max: 10, label: "Promoters", color: "text-green-600" },
  },
};

const DEFAULT_DIMENSIONS_I18N: Record<string, readonly { name: string; description: string; icon: string }[]> = {
  es: DEFAULT_DIMENSIONS,
  en: [
    { name: "Leadership", description: "Quality and effectiveness of leadership across the organization", icon: "Crown" },
    { name: "Communication", description: "Transparency, clarity, and frequency of organizational communication", icon: "MessageSquare" },
    { name: "Work-Life Balance", description: "Support for maintaining healthy work-life boundaries", icon: "Scale" },
    { name: "Growth & Development", description: "Opportunities for learning, career advancement, and skill development", icon: "TrendingUp" },
    { name: "Recognition", description: "Acknowledgment and appreciation of employee contributions", icon: "Award" },
    { name: "Culture & Values", description: "Alignment between stated values and actual organizational culture", icon: "Heart" },
    { name: "Compensation & Benefits", description: "Fairness and competitiveness of pay and benefits", icon: "DollarSign" },
  ],
};

export function getClimateSurveyTypeLabel(type: string, locale = "es"): string {
  return CLIMATE_SURVEY_TYPE_LABELS_I18N[locale]?.[type] ?? CLIMATE_SURVEY_TYPE_LABELS[type] ?? type;
}

export function getClimateSurveyStatusLabel(status: string, locale = "es"): string {
  return CLIMATE_SURVEY_STATUS_LABELS_I18N[locale]?.[status] ?? CLIMATE_SURVEY_STATUS_LABELS[status] ?? status;
}

export function getSurveyQuestionTypeLabel(type: string, locale = "es"): string {
  return SURVEY_QUESTION_TYPE_LABELS_I18N[locale]?.[type] ?? SURVEY_QUESTION_TYPE_LABELS[type] ?? type;
}

export function getSurveyFrequencyLabel(frequency: string, locale = "es"): string {
  return SURVEY_FREQUENCY_LABELS_I18N[locale]?.[frequency] ?? SURVEY_FREQUENCY_LABELS[frequency] ?? frequency;
}

export function getLikertLabel(value: number, locale = "es"): string {
  return LIKERT_LABELS_I18N[locale]?.[value] ?? LIKERT_LABELS[value] ?? String(value);
}

export function getNPSCategoryData(category: string, locale = "es") {
  return NPS_CATEGORIES_I18N[locale]?.[category as keyof typeof NPS_CATEGORIES] ?? NPS_CATEGORIES[category as keyof typeof NPS_CATEGORIES];
}

export function getDefaultDimensions(locale = "es") {
  return DEFAULT_DIMENSIONS_I18N[locale] ?? DEFAULT_DIMENSIONS;
}

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
