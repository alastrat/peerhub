/**
 * Kultiva's standard climate survey: the whole validated instrument (see
 * src/lib/constants/climate-instrument.ts) plus three open questions, from
 * Kultiva's question list (preguntas-encuesta-clima-organizacional.csv).
 */

export const KULTIVA_CLIMATE_TEMPLATE = {
  name: "Encuesta de Clima Organizacional Kultiva",
  description:
    "Instrumento validado de Kultiva (12 dimensiones × 5 ítems, escala Nunca–Siempre) más 3 preguntas abiertas. " +
    "Los ítems del instrumento no se pueden editar; puedes quitar dimensiones completas.",
  // The survey wizard needs every question in a dimension, open ones included
  openQuestionsDimension: {
    name: "Preguntas abiertas",
    description: "Preguntas de respuesta libre",
  },
  openQuestions: [
    "¿Qué aspectos de tu ambiente de trabajo actual crees que más afectan tu motivación y productividad diaria?",
    "¿Cómo describirías la efectividad de la comunicación dentro de tu equipo y qué sugerencias tienes para mejorarla?",
    "¿Qué cambios o mejoras consideras más necesarios para promover un ambiente laboral positivo y colaborativo?",
  ],
} as const;
