// Kultiva's validated climate instrument (12 dimensions × 5 items, 4-point
// frequency scale). Item text is verbatim from the psychometric study
// (Navarro, Aug 2026), typos included — don't edit wording without the
// psychologist's sign-off. See docs/climate-scoring-and-action-plans-spec.md.

import { INSTRUMENT_SCALE } from "./climate-scales";

export const INSTRUMENT_VERSION = "KCO-2026.1";

export const INSTRUMENT_TEMPLATE_NAME = "Instrumento Kultiva de Clima Organizacional";

export interface InstrumentDimension {
  code: string;
  name: string;
  description: string;
  items: { code: string; text: string }[];
}

export const INSTRUMENT_DIMENSIONS: InstrumentDimension[] = [
  {
    code: "LID",
    name: "Liderazgo",
    description: "Apoyo, información, reconocimiento y ejemplo del líder directo",
    items: [
      { code: "LID-1", text: "¿Tu líder proporciona la información necesaria para realizar tu trabajo de manera efectiva?" },
      { code: "LID-2", text: "¿Recibes apoyo de tu líder para alcanzar tus metas de desarrollo en la organización?" },
      { code: "LID-3", text: "¿Tu líder reconoce de manera justa y regular tus logros y esfuerzos?" },
      { code: "LID-4", text: "¿Tu líder es un ejemplo positivo de los valores y principios de la organización?" },
      { code: "LID-5", text: "¿La retroalimentación que recibes de tu líder te ayuda a mejorar tu desempeño?" },
    ],
  },
  {
    code: "CVI",
    name: "Calidad de vida",
    description: "Equilibrio, carga de trabajo y bienestar promovido por la organización",
    items: [
      { code: "CVI-1", text: "¿Sientes que puedes mantener un equilibrio saludable entre tu trabajo y tu vida personal?" },
      { code: "CVI-2", text: "¿Sientes que la carga de trabajo es manejable y realista?" },
      { code: "CVI-3", text: "¿La empresa ofrece recursos específicos para tu bienestar mental, como programas de apoyo emocional?" },
      { code: "CVI-4", text: "¿La organización promueve un estilo de vida saludable entre los empleados?" },
      { code: "CVI-5", text: "¿Sientes que la organización y tus superiores se preocupan genuinamente por tu bienestar personal?" },
    ],
  },
  {
    code: "CMP",
    name: "Compromiso",
    description: "Identificación, satisfacción, motivación e intención de permanencia",
    items: [
      { code: "CMP-1", text: "¿Te sientes identificado/a con la misión y los valores de la organización en tu trabajo diario?" },
      { code: "CMP-2", text: "¿Estás satisfecho/a con tu trabajo en general?" },
      { code: "CMP-3", text: "¿Tienes la intención de permanecer en la organización a largo plazo?" },
      { code: "CMP-4", text: "¿Te sientes motivado/a para dar lo mejor de ti en tu trabajo?" },
      { code: "CMP-5", text: "¿Recomendarías la organización como un buen lugar para trabajar?" },
    ],
  },
  {
    code: "SPS",
    name: "Seguridad psicológica",
    description: "Libertad para opinar, equivocarse, proponer y resolver conflictos",
    items: [
      { code: "SPS-1", text: "¿Te sientes seguro/a para expresar tus opiniones y puntos de vista en el trabajo?" },
      { code: "SPS-2", text: "¿Sientes que puedes cometer errores sin temor a consecuencias severas?" },
      { code: "SPS-3", text: "¿Sientes que puedes proponer ideas y tomar riesgos sin preocuparte por repercusiones negativas?" },
      { code: "SPS-4", text: "¿Los conflictos en tu equipo se abordan de manera constructiva y respetuosa?" },
      { code: "SPS-5", text: "¿La organización fomenta una cultura de aprendizaje continuo y mejora constante?" },
    ],
  },
  {
    code: "COM",
    name: "Comunicación",
    description: "Apertura con superiores, retroalimentación y canales de comunicación",
    items: [
      { code: "COM-1", text: "¿Tienes la oportunidad de comunicarte abiertamente con tus superiores?" },
      { code: "COM-2", text: "¿Recibes retroalimentación regular sobre tu desempeño en el trabajo?" },
      { code: "COM-3", text: "¿La organización ofrece una variedad de canales de comunicación (reuniones, correos, mensajería, etc.) que facilita la colaboración?" },
      { code: "COM-4", text: "¿Consideras que la organización promueve una cultura de comunicación abierta y honesta?" },
      { code: "COM-5", text: "¿Sientes que la organización ofrece orientación y apoyo durante situaciones de crisis?" },
    ],
  },
  {
    code: "DEI",
    name: "Diversidad e inclusión",
    description: "Igualdad de oportunidades, respeto y prácticas inclusivas",
    items: [
      { code: "DEI-1", text: "¿Crees que todos los empleados tienen igualdad de oportunidades de desarrollo y avance profesional?" },
      { code: "DEI-2", text: "¿Te sientes bienvenido/a y respetado/a en un ambiente de trabajo inclusivo?" },
      { code: "DEI-3", text: "¿La organización tiene políticas y prácticas que promueven la inclusión y la equidad?" },
      { code: "DEI-4", text: "¿Tienes la oportunidad de participar en grupos o comités relacionados con la diversidad e inclusión?" },
      { code: "DEI-5", text: "¿La organización celebra y reconoce la diversidad a través de eventos y actividades?" },
    ],
  },
  {
    code: "ETI",
    name: "Ética e integridad",
    description: "Cumplimiento, denuncia segura y decisiones basadas en valores",
    items: [
      { code: "ETI-1", text: "¿Sientes que la organización cumple con todas las normas y regulaciones éticas y legales?" },
      { code: "ETI-2", text: "¿Te sientes seguro/a para denunciar comportamientos inapropiados o éticamente cuestionables?" },
      { code: "ETI-3", text: "¿La organización fomenta la responsabilidad individual en los asuntos éticos del negocio?" },
      { code: "ETI-4", text: "¿Te sientes informado/a sobre las políticas en relación a los conflictos de intereses?" },
      { code: "ETI-5", text: "¿Sientes que las decisiones de la organización se toman de manera ética y basada en valores?" },
    ],
  },
  {
    code: "SYE",
    name: "Seguridad y estabilidad",
    description: "Seguridad en el empleo, crecimiento y satisfacción salarial",
    items: [
      { code: "SYE-1", text: "¿Te sientes seguro/a en tu empleo actual?" },
      { code: "SYE-2", text: "¿Sientes que tienes oportunidades de crecimiento y desarrollo profesional en la organización?" },
      { code: "SYE-3", text: "¿Sientes que tu puesto actual te ofrece estabilidad para planificar tu futuro profesional?" },
      { code: "SYE-4", text: "¿Tienes la intención de permanecer a largo plazo en tu puesto actual?" },
      { code: "SYE-5", text: "¿Estás satisfecho/a con tu nivel salarial y beneficios?" },
    ],
  },
  {
    code: "GCA",
    name: "Gestión de cambio",
    description: "Participación, apoyo y comunicación durante los cambios",
    items: [
      { code: "GCA-1", text: "¿Tienes la oportunidad de participar en decisiones relacionadas con el cambio en la organización?" },
      { code: "GCA-2", text: "¿Recibes el apoyo necesario para adaptarte y tener éxito durante los cambios?" },
      { code: "GCA-3", text: "¿Sientes que se maneja adecuadamente las preocupaciones y la resistencia al cambio en la organización?" },
      { code: "GCA-4", text: "¿Sientes que puedes expresar tus temores o preocupaciones acerca del cambio sin temor?" },
      { code: "GCA-5", text: "¿La organización comunica claramente los beneficios que se esperan del cambio?" },
    ],
  },
  {
    code: "CUL",
    name: "Cultura",
    description: "Coherencia, promoción y reconocimiento de los valores organizacionales",
    items: [
      { code: "CUL-1", text: "¿La organización es coherente con los valores que promueve ?" },
      { code: "CUL-2", text: "¿Tu lider directo ejemplifica la cultura de la empresa ?" },
      { code: "CUL-3", text: "¿La cultura de la empresa esta alineada con la visión del negocio?" },
      { code: "CUL-4", text: "¿Se comunica y promueven los valores organizacionales ?" },
      { code: "CUL-5", text: "¿La organización premia a los que se comportan comforme a los valores?" },
    ],
  },
  {
    code: "FYA",
    name: "Flexibilidad y autonomía",
    description: "Flexibilidad horaria, trabajo remoto y autonomía en el día a día",
    items: [
      { code: "FYA-1", text: "¿Tengo la flexibilidad necesaria para equilibrar mi vida personal y profesional?" },
      { code: "FYA-2", text: "¿Estoy satisfecho con la posibilidad de ajustar mis horarios de trabajo según mis necesidades personales?" },
      { code: "FYA-3", text: "¿Tengo la autonomía suficiente para tomar decisiones relacionadas con mi trabajo diario?" },
      { code: "FYA-4", text: "¿Me siento apoyado por la organización en cuanto a opciones de trabajo remoto o híbrido?" },
      { code: "FYA-5", text: "¿La empresa respalda mi capacidad para gestionar mi propio tiempo y prioridades.?" },
    ],
  },
  {
    code: "SME",
    name: "Salud mental",
    description: "Manejo del estrés, recursos y apertura para hablar de salud mental",
    items: [
      { code: "SME-1", text: "¿Te sientes mentalmente descansado y capaz de manejar el estrés diario en tu trabajo?" },
      { code: "SME-2", text: "¿Consideras que tienes acceso a los recursos y apoyo necesarios para mantener una buena salud mental en el trabajo?" },
      { code: "SME-3", text: "¿Te sientes cómodo hablando de tus problemas de salud mental con tu supervisor o compañeros de trabajo?" },
      { code: "SME-4", text: "¿Crees que la empresa promueve un ambiente laboral que apoya la salud mental de los empleados?" },
      { code: "SME-5", text: "¿Sientes que puedes equilibrar adecuadamente tus responsabilidades laborales y tu bienestar personal?" },
    ],
  },
];

/** Question config for an instrument item. */
export function instrumentItemConfig(itemCode: string) {
  return { scale: INSTRUMENT_SCALE, itemCode, locked: true };
}

function readConfig(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

/** Item code of an instrument question (e.g. "LID-1"), or null for custom questions. */
export function getInstrumentItemCode(config: unknown): string | null {
  const code = readConfig(config).itemCode;
  return typeof code === "string" && code.length > 0 ? code : null;
}

/** Locked questions can't be edited, removed one by one, or made optional. */
export function isLockedQuestion(config: unknown): boolean {
  return readConfig(config).locked === true;
}

export function getInstrumentDimensionCode(itemCode: string): string {
  return itemCode.split("-")[0];
}
