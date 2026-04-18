import { PrismaClient, QuestionType, ReviewerType, CycleStatus } from "@prisma/client";
import { seedSystemTemplates } from "./seed-system-templates";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data
  console.log("Cleaning up existing data...");
  await prisma.reviewResponse.deleteMany();
  await prisma.reviewAssignment.deleteMany();
  await prisma.reviewToken.deleteMany();
  await prisma.nomination.deleteMany();
  await prisma.cycleParticipant.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.templateQuestion.deleteMany();
  await prisma.templateSection.deleteMany();
  await prisma.template.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.competency.deleteMany();
  await prisma.company.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create demo company
  console.log("Creating demo company...");
  const company = await prisma.company.create({
    data: {
      name: "Kultiva Demo",
      slug: "kultiva-demo",
    },
  });

  // Create departments
  console.log("Creating departments...");
  const departments = await Promise.all([
    prisma.department.create({
      data: { name: "Ingeniería", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Producto", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Diseño", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Mercadeo", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Ventas", companyId: company.id },
    }),
  ]);

  const [engineering, product, design, marketing, sales] = departments;

  // Helper: create User + Employee + CompanyUser for a person
  async function createPerson(opts: {
    email: string;
    name: string;
    title: string;
    companyRole: "ADMIN" | "MANAGER" | "MEMBER";
    departmentId: string;
    managerId?: string; // Employee.id of their manager
  }) {
    const user = await prisma.user.create({
      data: {
        email: opts.email,
        name: opts.name,
        emailVerified: new Date(),
      },
    });

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        email: opts.email,
        name: opts.name,
        title: opts.title,
        departmentId: opts.departmentId,
        managerId: opts.managerId,
      },
    });

    const companyUser = await prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: opts.companyRole,
        employeeId: employee.id,
      },
    });

    return { user, employee, companyUser };
  }

  // Create users and employees
  console.log("Creating users...");

  // Admin user
  const admin = await createPerson({
    email: "admin@acme.com",
    name: "Alejandro Restrepo",
    title: "Director de Talento Humano",
    companyRole: "ADMIN",
    departmentId: engineering.id,
  });

  // Engineering team
  const engManager = await createPerson({
    email: "sarah.eng@acme.com",
    name: "Sara Martínez",
    title: "Gerente de Ingeniería",
    companyRole: "MANAGER",
    departmentId: engineering.id,
  });

  const engineers = await Promise.all(
    [
      {
        email: "james.dev@acme.com",
        name: "Santiago Gómez",
        title: "Ingeniero de Software Senior",
      },
      {
        email: "maria.dev@acme.com",
        name: "María López",
        title: "Ingeniera de Software",
      },
      {
        email: "kevin.dev@acme.com",
        name: "Andrés Herrera",
        title: "Ingeniero de Software",
      },
      {
        email: "emily.dev@acme.com",
        name: "Valentina Díaz",
        title: "Ingeniera de Software Junior",
      },
    ].map((eng) =>
      createPerson({
        ...eng,
        companyRole: "MEMBER",
        departmentId: engineering.id,
        managerId: engManager.employee.id,
      })
    )
  );

  // Product team
  const productMgr = await createPerson({
    email: "mike.product@acme.com",
    name: "Miguel Rodríguez",
    title: "Gerente de Producto",
    companyRole: "MANAGER",
    departmentId: product.id,
  });

  const productTeam = await Promise.all(
    [
      {
        email: "lisa.pm@acme.com",
        name: "Luisa Moreno",
        title: "Analista de Producto",
      },
      {
        email: "david.pm@acme.com",
        name: "David Castaño",
        title: "Analista de Producto",
      },
    ].map((pm) =>
      createPerson({
        ...pm,
        companyRole: "MEMBER",
        departmentId: product.id,
        managerId: productMgr.employee.id,
      })
    )
  );

  // Design team
  const designMgr = await createPerson({
    email: "anna.design@acme.com",
    name: "Ana Ruiz",
    title: "Líder de Diseño",
    companyRole: "MANAGER",
    departmentId: design.id,
  });

  const designTeam = await Promise.all(
    [
      {
        email: "tom.design@acme.com",
        name: "Tomás Vargas",
        title: "Diseñador UX Senior",
      },
      {
        email: "rachel.design@acme.com",
        name: "Raquel Arias",
        title: "Diseñadora UI",
      },
    ].map((designer) =>
      createPerson({
        ...designer,
        companyRole: "MEMBER",
        departmentId: design.id,
        managerId: designMgr.employee.id,
      })
    )
  );

  // Create competencies
  console.log("Creating competencies...");
  const competencies = await Promise.all([
    prisma.competency.create({
      data: {
        name: "Comunicación",
        description: "Capacidad de comunicarse eficazmente con el equipo y las partes interesadas",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Resolución de Problemas",
        description: "Capacidad de analizar problemas y desarrollar soluciones efectivas",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Trabajo en Equipo",
        description: "Capacidad de trabajar eficazmente con otros para alcanzar objetivos comunes",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Habilidades Técnicas",
        description: "Dominio de competencias técnicas específicas del rol",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Liderazgo",
        description: "Capacidad de guiar e inspirar a otros",
        companyId: company.id,
      },
    }),
  ]);

  // Create templates
  console.log("Creating templates...");

  // Standard 360 Review Template
  const standardTemplate = await prisma.template.create({
    data: {
      name: "Evaluación 360° Estándar",
      description: "Plantilla integral de retroalimentación 360° que cubre las principales áreas de desempeño",
      companyId: company.id,
      isDefault: true,
      sections: {
        create: [
          {
            title: "Desempeño Laboral",
            description: "Evaluar el desempeño general y la calidad del trabajo",
            order: 0,
            reviewerTypes: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "¿Cómo calificarías la calidad de su trabajo?",
                  description: "Considera la precisión, la rigurosidad y la atención al detalle",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "¿Qué tan efectivamente cumple con los plazos y gestiona su tiempo?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "¿Cuáles son sus principales fortalezas en su rol?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
                {
                  text: "¿En qué áreas podría mejorar?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 3,
                },
              ],
            },
          },
          {
            title: "Comunicación y Colaboración",
            description: "Evaluar habilidades de comunicación y trabajo en equipo",
            order: 1,
            reviewerTypes: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "¿Qué tan efectivamente se comunica con los miembros del equipo?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "¿Qué tan bien colabora con otros en los proyectos?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "¿Qué tan receptivo/a es a la retroalimentación?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
                {
                  text: "Describe su estilo de comunicación y su impacto en el equipo",
                  type: "TEXT" as QuestionType,
                  isRequired: false,
                  order: 3,
                },
              ],
            },
          },
          {
            title: "Liderazgo e Iniciativa",
            description: "Evaluar cualidades de liderazgo y comportamiento proactivo",
            order: 2,
            reviewerTypes: ["MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "¿Qué tan bien toma la iniciativa en los proyectos?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "¿Qué tan efectivamente orienta o apoya a otros?",
                  type: "RATING" as QuestionType,
                  isRequired: false,
                  order: 1,
                },
                {
                  text: "Describe una ocasión en la que demostró liderazgo",
                  type: "TEXT" as QuestionType,
                  isRequired: false,
                  order: 2,
                },
              ],
            },
          },
          {
            title: "Autorreflexión",
            description: "Reflexión personal sobre el desempeño y el crecimiento",
            order: 3,
            reviewerTypes: ["SELF"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "¿De qué logros te sientes más orgulloso/a en este período?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "¿Qué desafíos enfrentaste y cómo los abordaste?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "¿Cuáles son tus metas para el próximo período de evaluación?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Quick Check-in Template
  const quickTemplate = await prisma.template.create({
    data: {
      name: "Revisión Rápida",
      description: "Plantilla corta de retroalimentación para seguimientos regulares",
      companyId: company.id,
      sections: {
        create: [
          {
            title: "Resumen de Desempeño",
            order: 0,
            reviewerTypes: ["SELF", "MANAGER"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "Calificación general de desempeño",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "¿Qué salió bien en este período?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "¿Qué se podría mejorar?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Create a sample review cycle
  console.log("Creating review cycle...");
  const cycle = await prisma.cycle.create({
    data: {
      name: "Evaluación de Desempeño T1 2025",
      description: "Evaluación de desempeño del primer trimestre para todos los miembros del equipo",
      companyId: company.id,
      templateId: standardTemplate.id,
      status: "IN_PROGRESS" as CycleStatus,
      reviewStartDate: new Date("2025-01-15"),
      reviewEndDate: new Date("2025-02-15"),
      selfReviewEnabled: true,
      managerReviewEnabled: true,
      peerReviewEnabled: true,
      directReportEnabled: true,
      minPeers: 2,
      maxPeers: 5,
      anonymityThreshold: 3,
    },
  });

  // Add participants (all employees — using Employee.id)
  const allEmployees = [
    engManager,
    ...engineers,
    productMgr,
    ...productTeam,
    designMgr,
    ...designTeam,
  ];

  console.log("Adding participants...");
  await prisma.cycleParticipant.createMany({
    data: allEmployees.map((person) => ({
      cycleId: cycle.id,
      employeeId: person.employee.id,
    })),
  });

  // Create some review assignments (using Employee.id)
  console.log("Creating review assignments...");
  for (const participant of allEmployees.slice(0, 4)) {
    // Self review
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: participant.employee.id,
        revieweeId: participant.employee.id,
        reviewerType: "SELF",
        status: "PENDING",
      },
    });
  }

  // Manager reviews for engineering team
  for (const eng of engineers) {
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engManager.employee.id,
        revieweeId: eng.employee.id,
        reviewerType: "MANAGER",
        status: "PENDING",
      },
    });
  }

  // Some peer reviews
  if (engineers.length >= 2) {
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engineers[0].employee.id,
        revieweeId: engineers[1].employee.id,
        reviewerType: "PEER",
        status: "PENDING",
      },
    });
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engineers[1].employee.id,
        revieweeId: engineers[0].employee.id,
        reviewerType: "PEER",
        status: "PENDING",
      },
    });
  }

  // Seed system templates (360 + climate)
  await seedSystemTemplates();

  console.log("✅ Seed completed successfully!");
  console.log("");
  console.log("Demo accounts created:");
  console.log("  Admin: admin@acme.com");
  console.log("  Gerente: sarah.eng@acme.com");
  console.log("  Empleado: james.dev@acme.com");
  console.log("");
  console.log("Use magic link authentication to log in.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
