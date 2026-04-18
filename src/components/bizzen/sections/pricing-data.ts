export type FixedPrice = string;
export interface VariablePrice { monthly: string; annually: string }

export interface Plan {
  name: string;
  price: FixedPrice | VariablePrice;
  description: string;
  capacity: string[];
  features: string[];
  isStarter: boolean;
  isRecommended: boolean;
  buttonText: string;
  buttonLink: string;
}

export interface PricingFeature {
  name: string;
  plans: Record<string, boolean | string>;
}

export interface PricingSection {
  name: string;
  features: PricingFeature[];
}

export const plans: Plan[] = [
  {
    name: "Starter",
    price: "$3",
    description:
      "Para equipos pequeños que quieren profesionalizar su proceso de feedback.",
    capacity: ["Hasta 50 usuarios, 1 admin", "1 empresa"],
    features: [
      "Feedback 360° completo",
      "Gestión de Personas",
      "Estructura Organizacional",
      "Exportación CSV",
      "Soporte por email",
    ],
    isStarter: true,
    isRecommended: false,
    buttonText: "Comenzar",
    buttonLink: "/demo?plan=starter",
  },
  {
    name: "Business",
    price: { monthly: "$6", annually: "$5" },
    description:
      "Para empresas en crecimiento que necesitan medir clima y dar feedback de forma continua.",
    capacity: ["Hasta 200 usuarios, 3 admins", "1 empresa"],
    features: [
      "Todo lo de Starter",
      "Encuestas de Clima (CLIMATE, PULSE, eNPS)",
      "Plantillas de clima incluidas",
      "Onboarding guiado",
      "Soporte prioritario",
    ],
    isStarter: false,
    isRecommended: true,
    buttonText: "Solicitar Demo",
    buttonLink: "/demo?plan=business",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "Para organizaciones con múltiples sedes que requieren integraciones y soporte dedicado.",
    capacity: ["Usuarios ilimitados", "Multi-empresa"],
    features: [
      "Todo lo de Business",
      "SSO / SAML",
      "API de integración",
      "SLA garantizado",
      "Account manager dedicado",
    ],
    isStarter: false,
    isRecommended: false,
    buttonText: "Contactar Ventas",
    buttonLink: "/demo?plan=enterprise",
  },
];

export const pricingSections: PricingSection[] = [
  {
    name: "Módulos",
    features: [
      { name: "Feedback 360°", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Encuestas de Clima", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "Gestión de Personas", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Estructura Organizacional", plans: { Starter: true, Business: true, Enterprise: true } },
    ],
  },
  {
    name: "Capacidad",
    features: [
      { name: "Usuarios", plans: { Starter: "Hasta 50", Business: "Hasta 200", Enterprise: "Ilimitados" } },
      { name: "Administradores", plans: { Starter: "1", Business: "3", Enterprise: "Ilimitados" } },
      { name: "Sedes (Hubs)", plans: { Starter: "Hasta 3", Business: "Hasta 10", Enterprise: "Ilimitadas" } },
      { name: "Departamentos", plans: { Starter: "Hasta 10", Business: "Hasta 30", Enterprise: "Ilimitados" } },
    ],
  },
  {
    name: "Feedback 360°",
    features: [
      { name: "Ciclos simultáneos", plans: { Starter: "1", Business: "3", Enterprise: "Ilimitados" } },
      { name: "Tipos de evaluador", plans: { Starter: "Self, Jefe, Par", Business: "Todos (5 tipos)", Enterprise: "Todos + Externo" } },
      { name: "Competencias personalizadas", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Umbral de anonimato", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Control de liberación de reportes", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Exportación CSV/PDF", plans: { Starter: "CSV", Business: "CSV", Enterprise: "CSV + PDF" } },
    ],
  },
  {
    name: "Encuestas de Clima",
    features: [
      { name: "Tipos de encuesta", plans: { Starter: false, Business: "CLIMATE, PULSE, eNPS", Enterprise: "CLIMATE, PULSE, eNPS" } },
      { name: "Plantillas incluidas", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "Dimensiones personalizadas", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "Segmentación (Hub/Dept/Equipo)", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "Heatmaps por departamento", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "Tendencias eNPS", plans: { Starter: false, Business: true, Enterprise: true } },
    ],
  },
  {
    name: "Seguridad e Integraciones",
    features: [
      { name: "Multi-tenant aislado", plans: { Starter: true, Business: true, Enterprise: true } },
      { name: "Roles personalizados", plans: { Starter: false, Business: true, Enterprise: true } },
      { name: "SSO / SAML", plans: { Starter: false, Business: false, Enterprise: true } },
      { name: "API de integración", plans: { Starter: false, Business: false, Enterprise: true } },
      { name: "SLA garantizado", plans: { Starter: false, Business: false, Enterprise: true } },
    ],
  },
  {
    name: "Soporte",
    features: [
      { name: "Canal de soporte", plans: { Starter: "Email", Business: "Email prioritario", Enterprise: "Dedicado" } },
      { name: "Tiempo de respuesta", plans: { Starter: "2-4 días", Business: "24h", Enterprise: "4h" } },
      { name: "Onboarding guiado", plans: { Starter: false, Business: true, Enterprise: true } },
    ],
  },
];

export const isVariablePrice = (price: FixedPrice | VariablePrice): price is VariablePrice => {
  return (price as VariablePrice).monthly !== undefined;
};
