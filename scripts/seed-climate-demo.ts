/**
 * DEV ONLY — demo data for climate scoring and action plans.
 *
 * In the seeded "Kultiva Demo" company: tops up Sarah's (6) and Mike's (5)
 * teams so they clear the minimum group size, leaves Anna's team at 2
 * (suppressed), and gives everyone demographics. Creates two instrument
 * surveys (all 12 dimensions) with deterministic answers:
 * - "2025": closed and released, with three leader plans in motion;
 * - "2026": active and not released — release it, plan, then close it to
 *   see the 2025 plans' impact evaluated.
 *
 * Run: npx tsx scripts/seed-climate-demo.ts   (after `prisma db seed`)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { buildSegmentSnapshot } from "../src/lib/utils/climate-segments";
import { INSTRUMENT_VERSION } from "../src/lib/constants/climate-instrument";
import { loadSurveyForScoring, scoreScope } from "../src/lib/queries/climate-reports";

const prisma = new PrismaClient();
const SURVEY_NAME = "Clima organizacional 2026 (demo)";
const PREVIOUS_SURVEY_NAME = "Clima organizacional 2025 (demo)";

// Mean per dimension for each team; answers scatter ±1 around it.
const PROFILES: Record<string, Record<string, number>> = {
  eng: { LID: 3.6, CVI: 2.8, CMP: 3.2, SPS: 2.8, COM: 3.3, DEI: 3.0, ETI: 3.5, SYE: 2.7, GCA: 2.5, CUL: 3.3, FYA: 3.4, SME: 2.3 },
  product: { LID: 3.0, CVI: 3.4, CMP: 3.6, SPS: 3.5, COM: 3.1, DEI: 3.4, ETI: 3.6, SYE: 3.3, GCA: 2.8, CUL: 3.5, FYA: 3.6, SME: 3.2 },
  other: { LID: 2.6, CVI: 2.6, CMP: 2.8, SPS: 2.5, COM: 2.7, DEI: 2.9, ETI: 3.0, SYE: 2.6, GCA: 2.4, CUL: 2.9, FYA: 2.8, SME: 2.4 },
};

// A year earlier: Calidad de vida and Gestión de cambio were lower, Salud mental higher
const PROFILES_2025: Record<string, Record<string, number>> = {
  eng: { ...PROFILES.eng, CVI: 1.8, SME: 2.6, GCA: 2.3 },
  product: { ...PROFILES.product, GCA: 2.3 },
  other: PROFILES.other,
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

/** Demo data must never touch a shared database. */
function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.match(/@([^:/?]+)/)?.[1] ?? "";
  if (!["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host)) {
    throw new Error(`Refusing to run against a non-local database (${host || "unknown host"})`);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production");
  assertLocalDatabase();
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

  // Demographics so the gender / generation / tenure heatmaps have data.
  // Deterministic: the n-th employee (by email) always gets the same values.
  const genders = ["FEMALE", "MALE", "FEMALE", "MALE", "FEMALE", "NON_BINARY", "MALE", "FEMALE"] as const;
  const birthYears = [1999, 1992, 1988, 1995, 1978, 2000, 1985, 1972, 1994, 1990, 1983, 1998, 1969, 1991, 1987, 2001, 1993];
  const startYears = [2025, 2021, 2018, 2024, 2016, 2025, 2020, 2012, 2023, 2022, 2019, 2026, 2010, 2021, 2017, 2025, 2022];
  const everyone = await prisma.employee.findMany({ where: { companyId: company.id }, orderBy: { email: "asc" } });
  for (const [i, e] of everyone.entries()) {
    await prisma.employee.update({
      where: { id: e.id },
      data: {
        gender: genders[i % genders.length],
        birthDate: new Date(`${birthYears[i % birthYears.length]}-0${(i % 9) + 1}-15`),
        startDate: new Date(`${startYears[i % startYears.length]}-0${((i + 4) % 9) + 1}-01`),
      },
    });
  }

  // Replace previous demo surveys (plans first: they reference employees)
  const old = await prisma.climateSurvey.findMany({
    where: { companyId: company.id, name: { in: [SURVEY_NAME, PREVIOUS_SURVEY_NAME] } },
    select: { id: true },
  });
  if (old.length) {
    await prisma.actionPlan.deleteMany({ where: { surveyId: { in: old.map((o) => o.id) } } });
    await prisma.climateSurvey.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, isActive: true },
    include: { teamMemberships: { select: { teamId: true } }, companyUser: { select: { role: true } } },
  });

  async function createSurvey(opts: {
    name: string;
    profiles: Record<string, Record<string, number>>;
    createdAt: Date;
    status: "ACTIVE" | "CLOSED";
    releasedAt?: Date;
  }) {
    const survey = await prisma.climateSurvey.create({
      data: {
        companyId: company!.id,
        name: opts.name,
        description: "Encuesta de demostración con el instrumento validado (12 dimensiones).",
        type: "CLIMATE",
        status: opts.status,
        templateId: template!.id,
        instrumentVersion: INSTRUMENT_VERSION,
        anonymityThreshold: 5,
        goalBand: "FAVORABLE",
        planMinPerLeader: 2,
        followUpUserIds: [admin.id],
        createdAt: opts.createdAt,
        resultsReleasedAt: opts.releasedAt ?? null,
        planDueDate: opts.releasedAt ? new Date(opts.releasedAt.getTime() + 15 * 86400000) : null,
        questions: {
          create: [
            ...template!.questions.map((q) => ({
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

    const distribution = await prisma.surveyDistribution.create({
      data: { surveyId: survey.id, targetType: "ALL", dueDate: new Date(opts.createdAt.getTime() + 14 * 86400000), sentAt: opts.createdAt },
    });

    let answered = 0;
    for (const e of employees) {
      const respond = e.companyUser?.role !== "ADMIN";
      const profile =
        e.managerId === sarah.id ? opts.profiles.eng : e.managerId === mike.id ? opts.profiles.product : opts.profiles.other;
      await prisma.surveyResponse.create({
        data: {
          distributionId: distribution.id,
          employeeId: e.id,
          isComplete: respond,
          submittedAt: respond ? opts.createdAt : null,
          segmentSnapshot: respond ? (buildSegmentSnapshot(e, opts.createdAt) as unknown as Prisma.InputJsonValue) : undefined,
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
    return { survey, answered };
  }

  // --- Last year's survey: closed, released, with plans already in motion ---
  const prevDate = new Date("2025-11-03T14:00:00Z");
  const prev = await createSurvey({
    name: PREVIOUS_SURVEY_NAME,
    profiles: PROFILES_2025,
    createdAt: prevDate,
    status: "CLOSED",
    releasedAt: new Date("2025-11-20T14:00:00Z"),
  });
  const scoring = await loadSurveyForScoring(prev.survey.id, company.id);
  const dimByCode = new Map(
    (await prisma.climateDimension.findMany({ where: { code: { not: null } } })).map((d) => [d.code!, d.id]),
  );
  const reports = await prisma.employee.findMany({ where: { managerId: sarah.id }, orderBy: { email: "asc" } });

  async function seedPlan(opts: {
    leaderId: string;
    code: string;
    title: string;
    objective: string;
    status: "ACTIVE" | "COMPLETED";
    tasks: { title: string; ownerId: string | null; due: string; status: "PENDING" | "IN_PROGRESS" | "DONE" }[];
    closingNote?: string;
  }) {
    const { score, dimensions } = scoreScope(scoring!, "LEADER", opts.leaderId);
    const dim = dimensions.find((d) => d.dimensionCode === opts.code);
    if (!dim?.mean || !dim.band) return;
    const order = ["MUY_DESFAVORABLE", "DESFAVORABLE", "FAVORABLE", "MUY_FAVORABLE"] as const;
    const target = order[Math.min(order.indexOf(dim.band) + 1, 3)];
    await prisma.actionPlan.create({
      data: {
        companyId: company!.id,
        surveyId: prev.survey.id,
        dimensionId: dimByCode.get(opts.code)!,
        scope: "LEADER",
        scopeRefId: opts.leaderId,
        ownerEmployeeId: opts.leaderId,
        title: opts.title,
        objective: opts.objective,
        baselineMean: dim.mean,
        baselineFavorability: dim.favorability,
        baselineBand: dim.band,
        baselineN: score.respondents,
        targetBand: target,
        startDate: new Date("2025-12-01"),
        endDate: new Date("2026-06-30"),
        status: opts.status,
        submittedAt: new Date("2025-11-28"),
        completedAt: opts.status === "COMPLETED" ? new Date("2026-06-20") : null,
        closingNote: opts.closingNote ?? null,
        createdByEmployeeId: opts.leaderId,
        tasks: {
          create: opts.tasks.map((t, i) => ({
            title: t.title,
            ownerEmployeeId: t.ownerId,
            dueDate: new Date(t.due),
            status: t.status,
            completedAt: t.status === "DONE" ? new Date(t.due) : null,
            order: i,
          })),
        },
        measures: { create: [{ kind: "OUTCOME", name: dim.dimensionName, baselineValue: dim.mean }] },
      },
    });
  }

  await seedPlan({
    leaderId: sarah.id,
    code: "CVI",
    title: "Cargas de trabajo sostenibles",
    objective: "Subir Calidad de vida al menos un nivel en la medición 2026",
    status: "COMPLETED",
    closingNote: "Se redistribuyeron proyectos y se eliminaron reuniones recurrentes innecesarias.",
    tasks: [
      { title: "Revisar la carga de cada persona en 1:1", ownerId: sarah.id, due: "2026-01-31", status: "DONE" },
      { title: "Bloquear viernes sin reuniones", ownerId: reports[0]?.id ?? null, due: "2026-03-31", status: "DONE" },
    ],
  });
  await seedPlan({
    leaderId: sarah.id,
    code: "SME",
    title: "Espacios de bienestar y salud mental",
    objective: "Llevar Salud mental a Favorable",
    status: "ACTIVE",
    tasks: [
      { title: "Charla con el programa de apoyo emocional", ownerId: sarah.id, due: "2026-02-28", status: "DONE" },
      { title: "Pausas activas dos veces por semana", ownerId: reports[1]?.id ?? null, due: "2026-12-15", status: "IN_PROGRESS" },
    ],
  });
  await seedPlan({
    leaderId: mike.id,
    code: "GCA",
    title: "Participación en los cambios del producto",
    objective: "Subir Gestión de cambio a Favorable",
    status: "ACTIVE",
    tasks: [{ title: "Retro mensual de cambios con el equipo", ownerId: mike.id, due: "2026-11-30", status: "IN_PROGRESS" }],
  });

  // --- This year's survey: active, not released yet (release it in the demo) ---
  const current = await createSurvey({ name: SURVEY_NAME, profiles: PROFILES, createdAt: new Date(), status: "ACTIVE" });

  console.log(`✅ "${PREVIOUS_SURVEY_NAME}" (${prev.survey.id}): ${prev.answered} responses, closed, with 3 leader plans`);
  console.log(`✅ "${SURVEY_NAME}" (${current.survey.id}): ${current.answered}/${employees.length} responses, active`);
  console.log("Sign-in links: npx tsx scripts/demo-links.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
