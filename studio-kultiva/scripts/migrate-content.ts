/**
 * Migration script to import hardcoded content from the website into Sanity
 * Run with: npx tsx scripts/migrate-content.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "i5j616sy",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN, // Need write token
  useCdn: false,
});

// ============ TESTIMONIALS ============
const testimonials = [
  {
    _type: "testimonial",
    name: {
      es: "Maria Claudia Buendia",
      en: "Maria Claudia Buendia",
    },
    role: {
      es: "Gerente de Recursos Humanos",
      en: "HR Manager",
    },
    company: "Business Integrity Services (BIS)",
    quote: {
      es: "Recomiendo con total confianza a Iskya y a su empresa. Los resultados han generado beneficios significativos para nuestra organizacion.",
      en: "I fully recommend Iskya and her company. The results have generated significant benefits for our organization.",
    },
    rating: 5,
    order: 1,
  },
  {
    _type: "testimonial",
    name: {
      es: "Narly Herrera",
      en: "Narly Herrera",
    },
    role: {
      es: "Jefe de Gestion Humana",
      en: "Human Management Chief",
    },
    company: "Constructora Habitat De Los Andes",
    quote: {
      es: "La energia de Iskya es verdaderamente inspiradora. Nos ayudo a reconectar con un liderazgo basado en la confianza.",
      en: "Iskya's energy is truly inspiring. She helped us reconnect with trust-based leadership.",
    },
    rating: 5,
    order: 2,
  },
  {
    _type: "testimonial",
    name: {
      es: "Denesi Becerra",
      en: "Denesi Becerra",
    },
    role: {
      es: "Director de Talento Humano",
      en: "Human Talent Director",
    },
    company: "Fintra SAS",
    quote: {
      es: "El enfoque excepcional de Iskya en formacion y hunting ha sido fundamental para nuestro crecimiento.",
      en: "Iskya's exceptional approach in training and hunting has been fundamental to our growth.",
    },
    rating: 5,
    order: 3,
  },
];

// ============ TEAM MEMBERS ============
const teamMembers = [
  {
    _type: "teamMember",
    name: {
      es: "Iskya Boom",
      en: "Iskya Boom",
    },
    role: {
      es: "CEO & Fundadora",
      en: "CEO & Founder",
    },
    bio: {
      es: "Con mas de 15 anos de experiencia en desarrollo organizacional, Iskya se especializa en liderazgo, cultura organizacional, gestion del cambio y desarrollo de talento. Ha liderado transformaciones culturales en empresas de diversos sectores en Colombia y Latinoamerica.",
      en: "With over 15 years of experience in organizational development, Iskya specializes in leadership, organizational culture, change management, and talent development. She has led cultural transformations in companies across various sectors in Colombia and Latin America.",
    },
    socialLinks: {
      linkedin: "https://www.linkedin.com/in/iskyaboom/",
    },
    order: 1,
  },
];

// ============ CLIENTS ============
const clients = [
  { name: { es: "Business Integrity Services", en: "Business Integrity Services" }, order: 1 },
  { name: { es: "Constructora Habitat De Los Andes", en: "Constructora Habitat De Los Andes" }, order: 2 },
  { name: { es: "Fintra SAS", en: "Fintra SAS" }, order: 3 },
  { name: { es: "Marymount", en: "Marymount" }, order: 4 },
  { name: { es: "AMCHAM Colombia", en: "AMCHAM Colombia" }, order: 5 },
].map((c) => ({ _type: "client", ...c }));

// ============ SERVICES ============
const services = [
  {
    _type: "service",
    title: { es: "Cultura Organizacional", en: "Organizational Culture" },
    slug: { _type: "slug", current: "cultura" },
    icon: "flaticon-recommend",
    shortDescription: {
      es: "Disenamos e implementamos estrategias para construir culturas organizacionales solidas que impulsen el compromiso, la innovacion y los resultados del negocio.",
      en: "We design and implement strategies to build solid organizational cultures that drive engagement, innovation, and business results.",
    },
    benefits: [
      { _key: "b1", title: { es: "Diagnostico de cultura actual", en: "Current culture diagnosis" } },
      { _key: "b2", title: { es: "Definicion de cultura deseada", en: "Desired culture definition" } },
      { _key: "b3", title: { es: "Plan de transformacion cultural", en: "Cultural transformation plan" } },
      { _key: "b4", title: { es: "Formacion de lideres como agentes de cambio", en: "Training leaders as change agents" } },
      { _key: "b5", title: { es: "Medicion de avances y ajustes", en: "Progress measurement and adjustments" } },
    ],
    faqs: [
      {
        _key: "f1",
        question: { es: "Cuanto tiempo toma una transformacion cultural?", en: "How long does a cultural transformation take?" },
        answer: {
          es: "Una transformacion cultural tipica toma entre 6 y 12 meses, dependiendo del tamano de la organizacion y la profundidad del cambio deseado. Trabajamos en fases para asegurar resultados sostenibles.",
          en: "A typical cultural transformation takes between 6 and 12 months, depending on the organization's size and the depth of desired change. We work in phases to ensure sustainable results.",
        },
      },
      {
        _key: "f2",
        question: { es: "Como se involucra a los lideres en el proceso?", en: "How are leaders involved in the process?" },
        answer: {
          es: "Los lideres son fundamentales en cualquier transformacion cultural. Comenzamos con sesiones de alineacion ejecutiva y luego los capacitamos como embajadores del cambio para que modelen los comportamientos deseados.",
          en: "Leaders are fundamental in any cultural transformation. We start with executive alignment sessions and then train them as change ambassadors to model the desired behaviors.",
        },
      },
      {
        _key: "f3",
        question: { es: "Como se mide el impacto de la transformacion?", en: "How do you measure transformation impact?" },
        answer: {
          es: "Utilizamos encuestas de clima, indicadores de engagement, rotacion de personal y metricas de negocio para medir el impacto. Establecemos una linea base al inicio y medimos el progreso periodicamente.",
          en: "We use climate surveys, engagement indicators, staff turnover, and business metrics to measure impact. We establish a baseline at the start and measure progress periodically.",
        },
      },
    ],
    order: 1,
  },
  {
    _type: "service",
    title: { es: "Seleccion Especializada", en: "Specialized Recruitment" },
    slug: { _type: "slug", current: "seleccion-especializada" },
    icon: "flaticon-team",
    shortDescription: {
      es: "Encontramos el talento ideal para tu organizacion a traves de procesos de seleccion rigurosos que evaluan competencias tecnicas, culturales y de liderazgo.",
      en: "We find the ideal talent for your organization through rigorous selection processes that evaluate technical, cultural, and leadership competencies.",
    },
    benefits: [
      { _key: "b1", title: { es: "Levantamiento de perfil integral", en: "Comprehensive profile assessment" } },
      { _key: "b2", title: { es: "Busqueda activa de candidatos", en: "Active candidate search" } },
      { _key: "b3", title: { es: "Evaluacion por competencias", en: "Competency-based evaluation" } },
      { _key: "b4", title: { es: "Assessment center", en: "Assessment center" } },
      { _key: "b5", title: { es: "Acompanamiento en onboarding", en: "Onboarding support" } },
    ],
    faqs: [
      {
        _key: "f1",
        question: { es: "Cual es el tiempo promedio para llenar una vacante?", en: "What is the average time to fill a vacancy?" },
        answer: {
          es: "El tiempo varia segun la complejidad del perfil. Para posiciones operativas, el proceso toma entre 2-4 semanas. Para posiciones gerenciales o ejecutivas, puede extenderse de 4 a 8 semanas.",
          en: "Time varies depending on profile complexity. For operational positions, the process takes 2-4 weeks. For managerial or executive positions, it can extend from 4 to 8 weeks.",
        },
      },
      {
        _key: "f2",
        question: { es: "Que garantia ofrecen en sus procesos de seleccion?", en: "What guarantee do you offer on your selection processes?" },
        answer: {
          es: "Ofrecemos una garantia de reposicion de 90 dias. Si el candidato seleccionado no cumple las expectativas durante este periodo, realizamos un nuevo proceso sin costo adicional.",
          en: "We offer a 90-day replacement guarantee. If the selected candidate doesn't meet expectations during this period, we conduct a new process at no additional cost.",
        },
      },
      {
        _key: "f3",
        question: { es: "Como evaluan el fit cultural de los candidatos?", en: "How do you evaluate candidates' cultural fit?" },
        answer: {
          es: "Utilizamos entrevistas conductuales estructuradas, assessments de valores y dinamicas grupales disenadas especificamente para evaluar la alineacion con la cultura de tu organizacion.",
          en: "We use structured behavioral interviews, values assessments, and group dynamics specifically designed to evaluate alignment with your organization's culture.",
        },
      },
    ],
    order: 2,
  },
  {
    _type: "service",
    title: { es: "Gestion del Cambio", en: "Change Management" },
    slug: { _type: "slug", current: "cambio" },
    icon: "flaticon-growth",
    shortDescription: {
      es: "Facilitamos procesos de cambio organizacional minimizando la resistencia y maximizando la adopcion, asegurando transiciones exitosas.",
      en: "We facilitate organizational change processes by minimizing resistance and maximizing adoption, ensuring successful transitions.",
    },
    benefits: [
      { _key: "b1", title: { es: "Evaluacion de impacto del cambio", en: "Change impact assessment" } },
      { _key: "b2", title: { es: "Estrategia de comunicacion", en: "Communication strategy" } },
      { _key: "b3", title: { es: "Formacion y capacitacion", en: "Training and development" } },
      { _key: "b4", title: { es: "Gestion de stakeholders", en: "Stakeholder management" } },
      { _key: "b5", title: { es: "Medicion de adopcion", en: "Adoption measurement" } },
    ],
    faqs: [
      {
        _key: "f1",
        question: { es: "En que tipo de cambios pueden ayudarnos?", en: "What types of changes can you help us with?" },
        answer: {
          es: "Apoyamos todo tipo de cambios organizacionales: transformaciones digitales, reestructuraciones, fusiones y adquisiciones, cambios de liderazgo, implementacion de nuevos sistemas, y cambios culturales.",
          en: "We support all types of organizational changes: digital transformations, restructurings, mergers and acquisitions, leadership changes, new system implementations, and cultural changes.",
        },
      },
      {
        _key: "f2",
        question: { es: "Como manejan la resistencia al cambio?", en: "How do you handle resistance to change?" },
        answer: {
          es: "La resistencia es natural y la abordamos de manera proactiva. Identificamos los grupos de interes, entendemos sus preocupaciones, y disenamos estrategias especificas de comunicacion y participacion para cada grupo.",
          en: "Resistance is natural and we address it proactively. We identify stakeholder groups, understand their concerns, and design specific communication and participation strategies for each group.",
        },
      },
      {
        _key: "f3",
        question: { es: "Cuando debemos iniciar el proceso de gestion del cambio?", en: "When should we start the change management process?" },
        answer: {
          es: "Lo ideal es comenzar antes de que el cambio se anuncie oficialmente. Esto nos permite planificar la comunicacion, preparar a los lideres y establecer los mecanismos de soporte necesarios desde el inicio.",
          en: "Ideally, we should start before the change is officially announced. This allows us to plan communication, prepare leaders, and establish necessary support mechanisms from the beginning.",
        },
      },
    ],
    order: 3,
  },
  {
    _type: "service",
    title: { es: "Comunicacion Interna", en: "Internal Communication" },
    slug: { _type: "slug", current: "comunicacion-interna" },
    icon: "flaticon-chat",
    shortDescription: {
      es: "Desarrollamos estrategias de comunicacion interna que fortalecen la conexion entre colaboradores, alinean equipos y refuerzan la cultura organizacional.",
      en: "We develop internal communication strategies that strengthen connection between employees, align teams, and reinforce organizational culture.",
    },
    benefits: [
      { _key: "b1", title: { es: "Diagnostico de comunicacion", en: "Communication diagnosis" } },
      { _key: "b2", title: { es: "Estrategia de canales", en: "Channel strategy" } },
      { _key: "b3", title: { es: "Plan de contenidos", en: "Content plan" } },
      { _key: "b4", title: { es: "Campanas internas", en: "Internal campaigns" } },
      { _key: "b5", title: { es: "Medicion de efectividad", en: "Effectiveness measurement" } },
    ],
    faqs: [
      {
        _key: "f1",
        question: { es: "Que canales de comunicacion recomiendan?", en: "What communication channels do you recommend?" },
        answer: {
          es: "La seleccion de canales depende de tu organizacion. Evaluamos la cultura, las herramientas disponibles y las preferencias de los colaboradores para recomendar una mezcla optima de canales digitales y presenciales.",
          en: "Channel selection depends on your organization. We evaluate culture, available tools, and employee preferences to recommend an optimal mix of digital and in-person channels.",
        },
      },
      {
        _key: "f2",
        question: { es: "Como medimos la efectividad de la comunicacion interna?", en: "How do we measure internal communication effectiveness?" },
        answer: {
          es: "Utilizamos metricas cuantitativas (tasas de apertura, engagement) y cualitativas (encuestas de comprension, focus groups) para evaluar si los mensajes llegan y generan el impacto deseado.",
          en: "We use quantitative metrics (open rates, engagement) and qualitative measures (comprehension surveys, focus groups) to evaluate if messages are reaching and generating the desired impact.",
        },
      },
      {
        _key: "f3",
        question: { es: "Pueden ayudarnos con comunicacion de crisis?", en: "Can you help us with crisis communication?" },
        answer: {
          es: "Si, desarrollamos planes de comunicacion de crisis y acompanamos a las organizaciones durante situaciones dificiles, asegurando mensajes claros, oportunos y empaticos.",
          en: "Yes, we develop crisis communication plans and accompany organizations during difficult situations, ensuring clear, timely, and empathetic messages.",
        },
      },
    ],
    order: 4,
  },
];

// ============ GENERAL FAQs ============
const faqs = [
  {
    _type: "faq",
    question: {
      es: "Que tipo de empresas pueden beneficiarse de sus servicios?",
      en: "What type of companies can benefit from your services?",
    },
    answer: {
      es: "Trabajamos principalmente con pequenas y medianas empresas (PYMES) en Colombia y Latinoamerica, aunque tambien hemos apoyado a organizaciones mas grandes. Nuestros servicios se adaptan a las necesidades especificas de cada cliente.",
      en: "We primarily work with small and medium-sized businesses (SMBs) in Colombia and Latin America, although we have also supported larger organizations. Our services adapt to each client's specific needs.",
    },
    category: "general",
    order: 1,
  },
  {
    _type: "faq",
    question: {
      es: "Como determinan el precio de sus servicios?",
      en: "How do you determine the price of your services?",
    },
    answer: {
      es: "El precio depende del alcance del proyecto, la duracion y los recursos necesarios. Ofrecemos propuestas personalizadas despues de una consulta inicial para entender tus necesidades especificas.",
      en: "The price depends on project scope, duration, and required resources. We offer customized proposals after an initial consultation to understand your specific needs.",
    },
    category: "pricing",
    order: 2,
  },
  {
    _type: "faq",
    question: {
      es: "Cuanto tiempo dura un proyecto tipico de consultoria?",
      en: "How long does a typical consulting project last?",
    },
    answer: {
      es: "La duracion varia segun el alcance y la complejidad. Un diagnostico de clima puede tomar 4-6 semanas, mientras que una transformacion cultural puede extenderse de 6 a 12 meses.",
      en: "Duration varies depending on scope and complexity. A climate diagnostic can take 4-6 weeks, while a cultural transformation can extend from 6 to 12 months.",
    },
    category: "process",
    order: 3,
  },
  {
    _type: "faq",
    question: {
      es: "Como se mide el exito de un proyecto?",
      en: "How do you measure project success?",
    },
    answer: {
      es: "Definimos indicadores de exito (KPIs) al inicio de cada proyecto en colaboracion con el cliente. Estos pueden incluir mejoras en encuestas de clima, indices de rotacion, niveles de engagement, entre otros.",
      en: "We define success indicators (KPIs) at the beginning of each project in collaboration with the client. These may include improvements in climate surveys, turnover rates, engagement levels, among others.",
    },
    category: "process",
    order: 4,
  },
  {
    _type: "faq",
    question: {
      es: "Trabajan de forma presencial o remota?",
      en: "Do you work in-person or remotely?",
    },
    answer: {
      es: "Ofrecemos ambas modalidades. Muchos de nuestros servicios pueden realizarse de forma remota, aunque para ciertos talleres y sesiones de trabajo preferimos la interaccion presencial cuando es posible.",
      en: "We offer both modalities. Many of our services can be delivered remotely, although for certain workshops and work sessions we prefer in-person interaction when possible.",
    },
    category: "general",
    order: 5,
  },
  {
    _type: "faq",
    question: {
      es: "Como puedo agendar una consulta inicial?",
      en: "How can I schedule an initial consultation?",
    },
    answer: {
      es: "Puedes contactarnos a traves del formulario en nuestra pagina de contacto, llamarnos directamente, o enviarnos un correo electronico. Te responderemos en menos de 24 horas habiles.",
      en: "You can contact us through the form on our contact page, call us directly, or send us an email. We'll respond within 24 business hours.",
    },
    category: "support",
    order: 6,
  },
];

// ============ SITE SETTINGS ============
const siteSettings = {
  _type: "siteSettings",
  _id: "siteSettings",
  siteName: {
    es: "Kultiva | Consultoria Organizacional",
    en: "Kultiva | Organizational Consulting",
  },
  siteDescription: {
    es: "Agencia de consultoria organizacional. Sembrando ideas para recoger grandes resultados.",
    en: "Organizational consulting agency. Planting ideas to harvest great results.",
  },
  contactInfo: {
    address: "Barranquilla, Atlantico, Colombia",
    phone: "+57 300 645 5082",
    email: "contacto@kultiva.com.co",
    hours: {
      es: "Lunes - Viernes: 8:00 - 18:00",
      en: "Monday - Friday: 8:00 AM - 6:00 PM",
    },
  },
  socialLinks: {
    linkedin: "https://www.linkedin.com/company/kultiva-co/",
    instagram: "https://www.instagram.com/kultiva.co",
  },
  footerText: {
    es: "Agencia de consultoria organizacional. Sembrando ideas para recoger grandes resultados.",
    en: "Organizational consulting agency. Planting ideas to harvest great results.",
  },
};

// ============ AUTHOR ============
const author = {
  _type: "author",
  _id: "author-iskya",
  name: { es: "Iskya Boom", en: "Iskya Boom" },
  slug: { _type: "slug", current: "iskya-boom" },
  bio: {
    es: "CEO & Fundadora de Kultiva. Top 15 HR Influencer en Colombia.",
    en: "CEO & Founder of Kultiva. Top 15 HR Influencer in Colombia.",
  },
};

// ============ BLOG POSTS ============
const blogPosts = [
  {
    _type: "post",
    title: {
      es: "5 claves para construir una cultura organizacional solida",
      en: "5 keys to building a solid organizational culture",
    },
    slug: { _type: "slug", current: "5-claves-cultura-organizacional" },
    excerpt: {
      es: "Descubre las estrategias fundamentales para desarrollar una cultura que impulse el compromiso.",
      en: "Discover the fundamental strategies for developing a culture that drives engagement.",
    },
    publishedAt: "2025-01-15T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
  {
    _type: "post",
    title: {
      es: "El rol del lider en la transformacion digital",
      en: "The leader's role in digital transformation",
    },
    slug: { _type: "slug", current: "lider-transformacion-digital" },
    excerpt: {
      es: "Como los lideres pueden guiar a sus equipos a traves del cambio tecnologico.",
      en: "How leaders can guide their teams through technological change.",
    },
    publishedAt: "2025-01-10T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
  {
    _type: "post",
    title: {
      es: "Comunicacion interna efectiva en equipos remotos",
      en: "Effective internal communication in remote teams",
    },
    slug: { _type: "slug", current: "comunicacion-equipos-remotos" },
    excerpt: {
      es: "Estrategias practicas para mantener conectados a los equipos que trabajan de forma remota.",
      en: "Practical strategies to keep remote teams connected.",
    },
    publishedAt: "2025-01-05T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
  {
    _type: "post",
    title: {
      es: "Gestion del cambio: preparando a tu equipo para el futuro",
      en: "Change management: preparing your team for the future",
    },
    slug: { _type: "slug", current: "gestion-cambio-equipo" },
    excerpt: {
      es: "Aprende como implementar cambios organizacionales de manera efectiva.",
      en: "Learn how to implement organizational changes effectively.",
    },
    publishedAt: "2024-12-28T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
  {
    _type: "post",
    title: {
      es: "Diagnostico de clima laboral: por que es importante",
      en: "Workplace climate diagnosis: why it matters",
    },
    slug: { _type: "slug", current: "diagnostico-clima-laboral" },
    excerpt: {
      es: "Entiende la importancia de medir y mejorar el clima organizacional.",
      en: "Understand the importance of measuring and improving organizational climate.",
    },
    publishedAt: "2024-12-20T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
  {
    _type: "post",
    title: {
      es: "Seleccion especializada: encontrando el talento adecuado",
      en: "Specialized recruitment: finding the right talent",
    },
    slug: { _type: "slug", current: "seleccion-especializada-talento" },
    excerpt: {
      es: "Mejores practicas para reclutar y seleccionar el talento que tu empresa necesita.",
      en: "Best practices for recruiting and selecting the talent your company needs.",
    },
    publishedAt: "2024-12-15T10:00:00Z",
    author: { _type: "reference", _ref: "author-iskya" },
  },
];

async function migrate() {
  console.log("🚀 Starting content migration to Sanity...\n");

  try {
    // Create author first (needed for blog posts)
    console.log("📝 Creating author...");
    await client.createOrReplace(author);
    console.log("✅ Author created\n");

    // Create site settings
    console.log("⚙️ Creating site settings...");
    await client.createOrReplace(siteSettings);
    console.log("✅ Site settings created\n");

    // Create testimonials
    console.log("💬 Creating testimonials...");
    for (const testimonial of testimonials) {
      await client.create(testimonial);
    }
    console.log(`✅ ${testimonials.length} testimonials created\n`);

    // Create team members
    console.log("👥 Creating team members...");
    for (const member of teamMembers) {
      await client.create(member);
    }
    console.log(`✅ ${teamMembers.length} team members created\n`);

    // Create clients
    console.log("🏢 Creating clients...");
    for (const clientDoc of clients) {
      await client.create(clientDoc);
    }
    console.log(`✅ ${clients.length} clients created\n`);

    // Create services
    console.log("🛠️ Creating services...");
    for (const service of services) {
      await client.create(service);
    }
    console.log(`✅ ${services.length} services created\n`);

    // Create FAQs
    console.log("❓ Creating FAQs...");
    for (const faq of faqs) {
      await client.create(faq);
    }
    console.log(`✅ ${faqs.length} FAQs created\n`);

    // Create blog posts
    console.log("📰 Creating blog posts...");
    for (const post of blogPosts) {
      await client.create(post);
    }
    console.log(`✅ ${blogPosts.length} blog posts created\n`);

    console.log("🎉 Migration completed successfully!");
    console.log("\nContent created:");
    console.log(`  - 1 Author`);
    console.log(`  - 1 Site Settings`);
    console.log(`  - ${testimonials.length} Testimonials`);
    console.log(`  - ${teamMembers.length} Team Members`);
    console.log(`  - ${clients.length} Clients`);
    console.log(`  - ${services.length} Services`);
    console.log(`  - ${faqs.length} FAQs`);
    console.log(`  - ${blogPosts.length} Blog Posts`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
