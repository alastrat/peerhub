/**
 * DEV ONLY — demo data for climate scoring and action plans.
 *
 * In the seeded "Kultiva Demo" company: tops up Sarah's (6) and Mike's (5)
 * teams so they clear the minimum group size, leaves Anna's team at 2
 * (suppressed), and creates an ACTIVE instrument survey (all 12 dimensions)
 * with deterministic answers. Release results and create plans from the UI.
 *
 * Run: npx tsx scripts/seed-climate-demo.ts   (after `prisma db seed`)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { buildSegmentSnapshot } from "../src/lib/utils/climate-segments";
import { INSTRUMENT_VERSION } from "../src/lib/constants/climate-instrument";

const prisma = new PrismaClient();
const SURVEY_NAME = "Clima organizacional 2026 (demo)";

// Mean per dimension for each team; answers scatter ±1 around it.
const PROFILES: Record<string, Record<string, number>> = {
  eng: { LID: 3.6, CVI: 2.2, CMP: 3.2, SPS: 2.8, COM: 3.3, DEI: 3.0, ETI: 3.5, SYE: 2.7, GCA: 2.5, CUL: 3.3, FYA: 3.4, SME: 2.3 },
  product: { LID: 3.0, CVI: 3.4, CMP: 3.6, SPS: 3.5, COM: 3.1, DEI: 3.4, ETI: 3.6, SYE: 3.3, GCA: 2.8, CUL: 3.5, FYA: 3.6, SME: 3.2 },
  other: { LID: 2.6, CVI: 2.6, CMP: 2.8, SPS: 2.5, COM: 2.7, DEI: 2.9, ETI: 3.0, SYE: 2.6, GCA: 2.4, CUL: 2.9, FYA: 2.8, SME: 2.4 },
};

let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function answer(target: number) {
  const v = Math.round(target + (rand() - 0.5) * 1.6);
  return Math.min(4, Math.max(1, v));
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  const company = await prisma.company.findUnique({ where: { slug: "kultiva-demo" } });
  if (!company) throw new Error("Run `prisma db seed` first");
  const template = await prisma.climateSurveyTemplate.findFirst({
    where: { instrumentVersion: INSTRUMENT_VERSION },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!template) throw new Error("Instrument template missing — run prisma/seed-system-templates.ts");

  const byEmail = async (email: string) => prisma.employee.findFirstOrThrow({ where: { companyId: company.id, email } });
  const sarah = await byEmail("sarah.eng@acme.com");
  const mike = await byEmail("mike.product@acme.com");
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@acme.com" } });

  const extra: [string, string, string][] = [
    ["Laura Gómez", "laura.dev@acme.com", sarah.id],
    ["Andrés Ruiz", "andres.dev@acme.com", sarah.id],
    ["Camila Torres", "camila.pm@acme.com", mike.id],
    ["Diego Pardo", "diego.pm@acme.com", mike.id],
    ["Sofía Herrera", "sofia.pm@acme.com", mike.id],
  ];
  for (const [name, email, managerId] of extra) {
    const manager = await prisma.employee.findUniqueOrThrow({ where: { id: managerId } });
    const reportDept = await prisma.employee.findFirst({ where: { managerId, departmentId: { not: null } } });
    await prisma.employee.upsert({
      where: { companyId_email: { companyId: company.id, email } },
      create: { companyId: company.id, name, email, managerId, departmentId: reportDept?.departmentId ?? manager.departmentId },
      update: { managerId },
    });
  }

  // Replace any previous demo survey
  const old = await prisma.climateSurvey.findMany({ where: { companyId: company.id, name: SURVEY_NAME }, select: { id: true } });
  if (old.length) {
    await prisma.actionPlan.deleteMany({ where: { surveyId: { in: old.map((o) => o.id) } } });
    await prisma.climateSurvey.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  const survey = await prisma.climateSurvey.create({
    data: {
      companyId: company.id,
      name: SURVEY_NAME,
      description: "Encuesta de demostración con el instrumento validado (12 dimensiones).",
      type: "CLIMATE",
      status: "ACTIVE",
      templateId: template.id,
      instrumentVersion: INSTRUMENT_VERSION,
      anonymityThreshold: 5,
      goalBand: "FAVORABLE",
      planMinPerLeader: 2,
      followUpUserIds: [admin.id],
      questions: {
        create: [
          ...template.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config as Prisma.InputJsonValue,
          })),
          { text: "¿Qué cambiarías para que este fuera un mejor lugar para trabajar?", type: "TEXT", order: 100, isRequired: false },
          { text: "¿Qué tan probable es que recomiendes la empresa como lugar de trabajo? (0-10)", type: "NPS", order: 101, isRequired: false },
        ],
      },
    },
    include: { questions: true },
  });

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, isActive: true },
    include: { teamMemberships: { select: { teamId: true } }, companyUser: { select: { role: true } } },
  });
  const distribution = await prisma.surveyDistribution.create({
    data: { surveyId: survey.id, targetType: "ALL", dueDate: new Date(Date.now() + 14 * 86400000), sentAt: new Date() },
  });

  let answered = 0;
  for (const e of employees) {
    const respond = e.companyUser?.role !== "ADMIN";
    const profile = e.managerId === sarah.id ? PROFILES.eng : e.managerId === mike.id ? PROFILES.product : PROFILES.other;
    await prisma.surveyResponse.create({
      data: {
        distributionId: distribution.id,
        employeeId: e.id,
        isComplete: respond,
        submittedAt: respond ? new Date() : null,
        segmentSnapshot: respond ? (buildSegmentSnapshot(e) as unknown as Prisma.InputJsonValue) : undefined,
        answers: respond
          ? {
              create: survey.questions.flatMap((q): { questionId: string; ratingValue?: number; textValue?: string }[] => {
                const code = (q.config as { itemCode?: string } | null)?.itemCode;
                if (code) return [{ questionId: q.id, ratingValue: answer(profile[code.split("-")[0]]) }];
                if (q.type === "NPS") return [{ questionId: q.id, ratingValue: Math.round(rand() * 10) }];
                const texts = ["Más flexibilidad horaria", "Mejor comunicación entre áreas", "Reconocer más los logros", ""];
                const text = texts[Math.floor(rand() * texts.length)];
                return text ? [{ questionId: q.id, textValue: text }] : [];
              }),
            }
          : undefined,
      },
    });
    if (respond) answered++;
  }

  console.log(`✅ "${SURVEY_NAME}" (${survey.id}): ${answered}/${employees.length} responses`);
  console.log("Admin:  http://localhost:4999/api/dev/token?email=admin@acme.com&redirect=/surveys/climate/" + survey.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
