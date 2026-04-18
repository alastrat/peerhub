/**
 * Seeds sample climate survey responses + 360 review responses
 * for marketing screenshot capture. Run with:
 *   ./node_modules/.bin/tsx prisma/scripts/seed-sample-data.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function randomRating(min = 1, max = 5): number {
  // Weighted toward 3-4 to look realistic
  const weights = [0.05, 0.1, 0.25, 0.35, 0.25]; // 1-5
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return i + 1;
  }
  return 4;
}

function randomNPS(): number {
  // NPS: 0-10, weighted toward 7-9
  const weights = [0.02, 0.02, 0.03, 0.05, 0.05, 0.08, 0.1, 0.2, 0.2, 0.15, 0.1];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return i;
  }
  return 7;
}

async function main() {
  console.log("Seeding sample survey + review response data...\n");

  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found. Run base seed first.");

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, isActive: true },
    include: { department: true },
  });
  console.log(`Found ${employees.length} employees in ${company.name}`);

  // --- CLIMATE SURVEY ---
  const dimensions = await prisma.climateDimension.findMany({
    where: { companyId: null }, // system dimensions
  });
  console.log(`Found ${dimensions.length} dimensions`);

  // Create a survey
  const survey = await prisma.climateSurvey.create({
    data: {
      name: "Encuesta de Clima Q1 2026",
      description: "Evaluación trimestral del clima organizacional",
      companyId: company.id,
      type: "CLIMATE",
      frequency: "QUARTERLY",
      isAnonymous: true,
      status: "CLOSED",
      questions: {
        create: [
          ...dimensions.slice(0, 5).flatMap((dim, di) => [
            {
              text: `¿Cómo evalúas ${dim.name.toLowerCase()} en tu equipo?`,
              type: "LIKERT",
              dimensionId: dim.id,
              order: di * 3 + 1,
              isRequired: true,
            },
            {
              text: `¿Tu líder demuestra ${dim.name.toLowerCase()} en el día a día?`,
              type: "LIKERT",
              dimensionId: dim.id,
              order: di * 3 + 2,
              isRequired: true,
            },
          ]),
          {
            text: "¿Qué tan probable es que recomiendes esta empresa como lugar de trabajo?",
            type: "NPS",
            order: 20,
            isRequired: true,
          },
          {
            text: "¿Qué podríamos mejorar?",
            type: "TEXT",
            order: 21,
            isRequired: false,
          },
        ],
      },
    },
    include: { questions: true },
  });
  console.log(`Created survey: ${survey.name} (${survey.questions.length} questions)`);

  // Create distribution + responses
  const distribution = await prisma.surveyDistribution.create({
    data: {
      surveyId: survey.id,
      targetType: "ALL",
      targetIds: [],
      dueDate: new Date("2026-03-31"),
      sentAt: new Date("2026-03-01"),
    },
  });

  const textResponses = [
    "Más espacios para feedback informal entre pares",
    "Mejorar la comunicación entre departamentos",
    "Necesitamos más flexibilidad de horarios",
    "El liderazgo ha mejorado pero falta consistencia",
    "Reconocimiento más frecuente y específico",
    "Oportunidades de crecimiento más claras",
    "Mejor onboarding para nuevos miembros",
    "Celebrar más los logros del equipo",
  ];

  for (const emp of employees) {
    const response = await prisma.surveyResponse.create({
      data: {
        distributionId: distribution.id,
        employeeId: emp.id,
        isComplete: true,
        submittedAt: new Date("2026-03-15"),
      },
    });

    const answers = survey.questions.map((q) => {
      if (q.type === "LIKERT") {
        return {
          responseId: response.id,
          questionId: q.id,
          ratingValue: randomRating(),
        };
      } else if (q.type === "NPS") {
        return {
          responseId: response.id,
          questionId: q.id,
          ratingValue: randomNPS(),
        };
      } else {
        return {
          responseId: response.id,
          questionId: q.id,
          textValue: textResponses[Math.floor(Math.random() * textResponses.length)],
        };
      }
    });

    await prisma.surveyAnswer.createMany({ data: answers });
  }
  console.log(`Created ${employees.length} survey responses with answers`);

  // Create a second (older) survey for trend data
  const survey2 = await prisma.climateSurvey.create({
    data: {
      name: "Encuesta de Clima Q4 2025",
      companyId: company.id,
      type: "CLIMATE",
      frequency: "QUARTERLY",
      isAnonymous: true,
      status: "CLOSED",
      questions: {
        create: survey.questions.slice(0, 6).map((q, i) => ({
          text: q.text,
          type: q.type,
          dimensionId: q.dimensionId,
          order: i + 1,
          isRequired: true,
        })),
      },
    },
    include: { questions: true },
  });

  const dist2 = await prisma.surveyDistribution.create({
    data: {
      surveyId: survey2.id,
      targetType: "ALL",
      targetIds: [],
      dueDate: new Date("2025-12-31"),
      sentAt: new Date("2025-12-01"),
    },
  });

  for (const emp of employees.slice(0, 8)) {
    const resp = await prisma.surveyResponse.create({
      data: {
        distributionId: dist2.id,
        employeeId: emp.id,
        isComplete: true,
        submittedAt: new Date("2025-12-20"),
      },
    });
    await prisma.surveyAnswer.createMany({
      data: survey2.questions.map((q) => ({
        responseId: resp.id,
        questionId: q.id,
        ratingValue: q.type === "NPS" ? randomNPS() : randomRating(),
      })),
    });
  }
  console.log("Created Q4 2025 survey with 8 responses (for trend data)");

  // --- 360 REVIEW RESPONSES ---
  const cycle = await prisma.cycle.findFirst({
    where: { companyId: company.id },
    include: {
      participants: { include: { employee: true } },
      template: { include: { sections: { include: { questions: true } } } },
    },
  });

  if (cycle) {
    const assignments = await prisma.reviewAssignment.findMany({
      where: { cycleId: cycle.id },
    });

    console.log(`Found cycle "${cycle.name}" with ${assignments.length} assignments`);

    const sections = cycle.template?.sections || [];
    const allQuestions = sections.flatMap((s) => s.questions);

    for (const assignment of assignments) {
      // Create one ReviewResponse per question
      for (const q of allQuestions) {
        const isRating = q.type === "RATING" || q.type === "COMPETENCY_RATING";
        await prisma.reviewResponse.create({
          data: {
            assignmentId: assignment.id,
            questionId: q.id,
            ...(isRating
              ? { ratingValue: randomRating() }
              : { textValue: "Buen desempeño, sigue así. Oportunidad de mejora en comunicación." }),
          },
        });
      }

      // Mark assignment as completed
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "COMPLETED",
          startedAt: new Date("2026-03-10"),
          completedAt: new Date("2026-03-14"),
        },
      });
    }

    // Transition cycle to IN_PROGRESS so dashboard shows it active
    await prisma.cycle.update({
      where: { id: cycle.id },
      data: { status: "IN_PROGRESS" },
    });

    console.log(`Created review responses for ${assignments.length} assignments in "${cycle.name}"`);
  }

  // --- EEPS SURVEY (for eNPS trend) ---
  const enpsSurvey = await prisma.climateSurvey.create({
    data: {
      name: "eNPS Febrero 2026",
      companyId: company.id,
      type: "ENPS",
      frequency: "MONTHLY",
      isAnonymous: true,
      status: "CLOSED",
      questions: {
        create: [{
          text: "¿Qué tan probable es que recomiendes esta empresa como lugar de trabajo?",
          type: "NPS",
          order: 1,
          isRequired: true,
        }],
      },
    },
    include: { questions: true },
  });

  const enpsDist = await prisma.surveyDistribution.create({
    data: {
      surveyId: enpsSurvey.id,
      targetType: "ALL",
      targetIds: [],
      dueDate: new Date("2026-02-28"),
      sentAt: new Date("2026-02-01"),
    },
  });

  for (const emp of employees.slice(0, 10)) {
    const resp = await prisma.surveyResponse.create({
      data: {
        distributionId: enpsDist.id,
        employeeId: emp.id,
        isComplete: true,
        submittedAt: new Date("2026-02-15"),
      },
    });
    await prisma.surveyAnswer.createMany({
      data: enpsSurvey.questions.map((q) => ({
        responseId: resp.id,
        questionId: q.id,
        ratingValue: randomNPS(),
      })),
    });
  }
  console.log("Created eNPS survey with 10 responses");

  console.log("\n✅ Sample data seeded successfully!");
  console.log("Admin login: admin@acme.com (use /api/dev/token?email=admin@acme.com)");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
