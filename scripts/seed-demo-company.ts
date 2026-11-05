/**
 * Demo data for ONE company, to show the platform: departments, teams and
 * people (with cédula, job level and demographics), two years of climate
 * surveys with the validated instrument (closed, results released, leader
 * action plans and their impact) and an active pulse survey.
 *
 * Run:   npx tsx scripts/seed-demo-company.ts --company <slug>
 * A non-local database also needs:  --confirm <slug>   (the same slug)
 *
 * - Only touches the company it's given. Re-running replaces its demo surveys
 *   (and their plans) and updates the demo people; nothing else is deleted.
 * - Sends no email. Demo people use Resend's test inbox (delivered+…@resend.dev)
 *   and every date is set so the daily jobs have nothing to send.
 * - Needs the global instrument template (prisma/seed-system-templates.ts).
 */
import { randomBytes } from "crypto";
import { PrismaClient, Prisma, type ClimateBand, type Gender, type JobLevel } from "@prisma/client";
import { buildSegmentSnapshot } from "../src/lib/utils/climate-segments";
import { INSTRUMENT_VERSION } from "../src/lib/constants/climate-instrument";
import { loadSurveyForScoring, scoreScope } from "../src/lib/queries/climate-reports";
import { evaluatePlanOutcomes } from "../src/lib/queries/action-plans";

const prisma = new PrismaClient();
const DAY = 86_400_000;

const SURVEY_2025 = "Clima organizacional 2025 (demo)";
const SURVEY_2026 = "Clima organizacional 2026 (demo)";
const PULSE = "Pulso de bienestar (demo)";
const DEMO_SURVEYS = [SURVEY_2025, SURVEY_2026, PULSE];

// ---------------------------------------------------------------------------
// Arguments and safety
// ---------------------------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function databaseHost() {
  return (process.env.DATABASE_URL ?? "").match(/@([^:/?]+)/)?.[1] ?? "";
}

function isLocalDatabase() {
  return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(databaseHost());
}

// ---------------------------------------------------------------------------
// Deterministic randomness: the same run always writes the same answers
// ---------------------------------------------------------------------------

let seed = 20261105;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}
/** A 1–4 answer scattered around a team's mean for the dimension. */
function answer(target: number) {
  return Math.min(4, Math.max(1, Math.round(target + (rand() - 0.5) * 1.6)));
}

// ---------------------------------------------------------------------------
// The organization
// ---------------------------------------------------------------------------

const DEPARTMENTS = ["Dirección General", "Comercial", "Operaciones", "Tecnología", "Talento Humano", "Finanzas"] as const;
type Dept = (typeof DEPARTMENTS)[number];

interface Person {
  name: string;
  title: string;
  level: JobLevel;
  gender: Gender;
  dept: Dept;
  /** Key of the person's manager in PEOPLE (none for the CEO). */
  manager?: string;
}

const PEOPLE: Record<string, Person> = {
  ceo: { name: "Valentina Ríos", title: "Gerente General", level: "DIRECTOR", gender: "FEMALE", dept: "Dirección General" },
  comercial: { name: "Camilo Herrera", title: "Director Comercial", level: "DIRECTOR", gender: "MALE", dept: "Comercial", manager: "ceo" },
  operaciones: { name: "Paula Andrea Mejía", title: "Gerente de Operaciones", level: "MANAGER", gender: "FEMALE", dept: "Operaciones", manager: "ceo" },
  tecnologia: { name: "Santiago Cárdenas", title: "Líder de Tecnología", level: "LEADER", gender: "MALE", dept: "Tecnología", manager: "ceo" },
  talento: { name: "Natalia Ospina", title: "Jefe de Talento Humano", level: "MANAGER", gender: "FEMALE", dept: "Talento Humano", manager: "ceo" },
  finanzas: { name: "Jorge Iván Salazar", title: "Coordinador Financiero", level: "COORDINATOR", gender: "MALE", dept: "Finanzas", manager: "ceo" },
};

const TEAMS: { key: string; leader: string; name: string; members: [string, string, Gender][] }[] = [
  {
    key: "comercial",
    leader: "comercial",
    name: "Equipo Comercial",
    members: [
      ["Laura Gómez", "Ejecutiva de Cuenta", "FEMALE"],
      ["Andrés Felipe Ruiz", "Ejecutivo de Cuenta", "MALE"],
      ["Mariana Castaño", "Ejecutiva de Cuenta", "FEMALE"],
      ["Julián Restrepo", "Asesor Comercial", "MALE"],
      ["Daniela Quintero", "Asesora Comercial", "FEMALE"],
      ["Felipe Arango", "Analista de Ventas", "MALE"],
      ["Sara Londoño", "Coordinadora de Cuentas Clave", "FEMALE"],
    ],
  },
  {
    key: "operaciones",
    leader: "operaciones",
    name: "Equipo de Operaciones",
    members: [
      ["Carlos Mario Vélez", "Supervisor de Planta", "MALE"],
      ["Diana Marcela Rojas", "Analista de Procesos", "FEMALE"],
      ["Esteban Zapata", "Técnico de Mantenimiento", "MALE"],
      ["Luisa Fernanda Gil", "Coordinadora de Logística", "FEMALE"],
      ["Mauricio Patiño", "Operario Líder", "MALE"],
      ["Catalina Henao", "Analista de Calidad", "FEMALE"],
      ["Hernán Duque", "Auxiliar de Bodega", "MALE"],
    ],
  },
  {
    key: "tecnologia",
    leader: "tecnologia",
    name: "Equipo de Tecnología",
    members: [
      ["Alejandro Montoya", "Desarrollador Senior", "MALE"],
      ["Valeria Sánchez", "Desarrolladora", "FEMALE"],
      ["Tomás Ochoa", "Desarrollador", "MALE"],
      ["Isabela Moreno", "Diseñadora UX", "FEMALE"],
      ["Nicolás Bedoya", "Ingeniero de Datos", "MALE"],
      ["Manuela Correa", "Analista QA", "FEMALE"],
    ],
  },
  {
    key: "talento",
    leader: "talento",
    name: "Equipo de Talento Humano",
    members: [
      ["Juliana Cardona", "Analista de Selección", "FEMALE"],
      ["Sebastián Marín", "Analista de Nómina", "MALE"],
      ["Ana María Toro", "Coordinadora de Bienestar", "FEMALE"],
      ["Daniel Echeverri", "Analista de Formación", "MALE"],
      ["Paola Agudelo", "Auxiliar de Talento Humano", "FEMALE"],
    ],
  },
  {
    // Three people: below the anonymity threshold, so its leader gets no report
    key: "finanzas",
    leader: "finanzas",
    name: "Equipo de Finanzas",
    members: [
      ["Gloria Inés Pineda", "Contadora", "FEMALE"],
      ["Ricardo Uribe", "Analista Financiero", "MALE"],
      ["Melissa Franco", "Auxiliar Contable", "FEMALE"],
    ],
  },
];

const SLUG_EMAIL = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

/** Resend's test inbox: emails "arrive" without reaching anyone. */
const demoEmail = (name: string) => `delivered+${SLUG_EMAIL(name)}@resend.dev`;

// Mean (1–4) per dimension for each leader's team; answers scatter ±1 around it
const D = ["LID", "CVI", "CMP", "SPS", "COM", "DEI", "ETI", "SYE", "GCA", "CUL", "FYA", "SME"] as const;
type Dim = (typeof D)[number];
const profile = (base: number, over: Partial<Record<Dim, number>> = {}) =>
  Object.fromEntries(D.map((d) => [d, over[d] ?? base])) as Record<Dim, number>;

const PROFILES_2026: Record<string, Record<Dim, number>> = {
  ceo: profile(3.4, { GCA: 3.0 }),
  comercial: profile(3.2, { CVI: 2.9, SME: 2.5, LID: 3.5 }),
  operaciones: profile(3.25, { SYE: 2.8, GCA: 2.3, COM: 2.6 }),
  tecnologia: profile(3.2, { FYA: 3.7, COM: 2.5, GCA: 2.6 }),
  talento: profile(3.5, { SME: 3.1 }),
  finanzas: profile(2.8),
};
// A year earlier: what the 2025 plans worked on was lower (and Tecnología's communication higher)
const PROFILES_2025: Record<string, Record<Dim, number>> = {
  ceo: profile(3.3, { GCA: 2.8 }),
  comercial: { ...PROFILES_2026.comercial, CVI: 1.9, SME: 2.4 },
  operaciones: { ...PROFILES_2026.operaciones, SYE: 1.8, COM: 2.5 },
  tecnologia: { ...PROFILES_2026.tecnologia, COM: 2.8, GCA: 2.0 },
  talento: { ...PROFILES_2026.talento, SME: 2.6 },
  finanzas: profile(2.7),
};

const OPEN_ANSWERS = [
  "Tener horarios más flexibles nos ayudaría a rendir mejor.",
  "La carga de trabajo al cierre de mes es muy alta.",
  "Me motiva el buen ambiente con mis compañeros.",
  "Falta más comunicación entre las áreas sobre los cambios.",
  "Las reuniones semanales con el líder han ayudado mucho.",
  "Sería bueno reconocer más los logros del equipo.",
  "Necesitamos herramientas más actualizadas para trabajar.",
  "Me gustaría tener más oportunidades de formación.",
  "Las pausas activas han mejorado el día a día.",
  "Que los cambios se anuncien con más anticipación.",
  "",
  "",
];

// ---------------------------------------------------------------------------

async function main() {
  const slug = arg("company");
  if (!slug) throw new Error("Usage: npx tsx scripts/seed-demo-company.ts --company <slug> [--confirm <slug>]");
  if (!isLocalDatabase() && arg("confirm") !== slug) {
    throw new Error(`This is a shared database (${databaseHost()}). Re-run with --confirm ${slug} to write to that company.`);
  }

  // Only what it needs, so it also runs against a database a migration behind
  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });
  if (!company) throw new Error(`No company with slug "${slug}"`);
  console.log(`Company: ${company.name} (${company.slug}) on ${databaseHost() || "?"}`);

  // The Kultiva survey (60 instrument items + 3 open questions), else the bare instrument
  const templates = await prisma.climateSurveyTemplate.findMany({
    where: { companyId: null, OR: [{ name: "Encuesta de Clima Organizacional Kultiva" }, { instrumentVersion: INSTRUMENT_VERSION }] },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const itemCode = (config: unknown) => (config as { itemCode?: string } | null)?.itemCode;
  const template =
    templates.find((t) => t.name === "Encuesta de Clima Organizacional Kultiva" && t.questions.some((q) => itemCode(q.config))) ??
    templates.find((t) => t.instrumentVersion === INSTRUMENT_VERSION);
  if (!template) throw new Error("The instrument template is missing: run prisma/seed-system-templates.ts");
  const dimensionIdByCode = new Map(
    (await prisma.climateDimension.findMany({ where: { code: { not: null } }, select: { id: true, code: true } })).map((d) => [d.code!, d.id]),
  );

  const admins = await prisma.companyUser.findMany({
    where: { companyId: company.id, role: "ADMIN", isActive: true },
    select: { userId: true },
  });

  // --- Departments, people and teams --------------------------------------
  const deptIds = new Map<Dept, string>();
  for (const name of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { companyId: company.id, name }, select: { id: true } });
    deptIds.set(name, existing?.id ?? (await prisma.department.create({ data: { companyId: company.id, name }, select: { id: true } })).id);
  }

  const birthYears = [1979, 1985, 1990, 1996, 1972, 1988, 1999, 1993, 1983, 2000, 1968, 1995, 1987, 1991, 2001];
  const startYears = [2012, 2018, 2021, 2024, 2016, 2019, 2025, 2022, 2015, 2023, 2010, 2020, 2017, 2026, 2014];
  let n = 0;
  const ids = new Map<string, string>(); // person key → employee id

  async function upsertPerson(key: string, p: Person, managerId: string | null) {
    const i = n++;
    const data = {
      name: p.name,
      title: p.title,
      jobLevel: p.level,
      gender: p.gender,
      departmentId: deptIds.get(p.dept)!,
      managerId,
      nationalId: String(1_017_200_000 + i * 7_919),
      birthDate: new Date(`${birthYears[i % birthYears.length]}-${String((i % 12) + 1).padStart(2, "0")}-14`),
      startDate: new Date(`${startYears[i % startYears.length]}-${String(((i + 5) % 12) + 1).padStart(2, "0")}-01`),
      isActive: true,
    };
    const email = demoEmail(p.name);
    const e = await prisma.employee.upsert({
      where: { companyId_email: { companyId: company!.id, email } },
      create: { companyId: company!.id, email, ...data },
      update: data,
      select: { id: true },
    });
    ids.set(key, e.id);
    return e.id;
  }

  await upsertPerson("ceo", PEOPLE.ceo, null);
  for (const key of ["comercial", "operaciones", "tecnologia", "talento", "finanzas"]) {
    await upsertPerson(key, PEOPLE[key], ids.get("ceo")!);
  }
  const leaderOf = new Map<string, string>(); // employee id → leader key (whose team profile they answer with)
  for (const key of ["comercial", "operaciones", "tecnologia", "talento", "finanzas"]) leaderOf.set(ids.get(key)!, "ceo");
  for (const team of TEAMS) {
    const leaderId = ids.get(team.leader)!;
    const leader = PEOPLE[team.leader];
    const t = await prisma.team.upsert({
      where: { companyId_name: { companyId: company.id, name: team.name } },
      create: { companyId: company.id, name: team.name, departmentId: deptIds.get(leader.dept)! },
      update: { departmentId: deptIds.get(leader.dept)!, isActive: true },
      select: { id: true },
    });
    await prisma.teamMember.upsert({
      where: { teamId_employeeId: { teamId: t.id, employeeId: leaderId } },
      create: { teamId: t.id, employeeId: leaderId, role: "LEAD" },
      update: { role: "LEAD" },
    });
    for (const [name, title, gender] of team.members) {
      const level: JobLevel = /Coordinador|Supervisor|Líder/.test(title) ? "COORDINATOR" : "STAFF";
      const id = await upsertPerson(`${team.key}:${name}`, { name, title, level, gender, dept: leader.dept }, leaderId);
      leaderOf.set(id, team.leader);
      await prisma.teamMember.upsert({
        where: { teamId_employeeId: { teamId: t.id, employeeId: id } },
        create: { teamId: t.id, employeeId: id },
        update: {},
      });
    }
  }
  console.log(`✓ ${DEPARTMENTS.length} departments, ${TEAMS.length} teams, ${ids.size} people`);

  // --- Replace earlier demo surveys (their plans first) ---------------------
  const old = await prisma.climateSurvey.findMany({
    where: { companyId: company.id, name: { in: DEMO_SURVEYS } },
    select: { id: true },
  });
  if (old.length) {
    await prisma.actionPlan.deleteMany({ where: { surveyId: { in: old.map((o) => o.id) } } });
    await prisma.climateSurvey.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  const demoIds = [...ids.values()];
  const people = await prisma.employee.findMany({
    where: { id: { in: demoIds } },
    include: { teamMemberships: { select: { teamId: true } } },
    orderBy: { name: "asc" },
  });

  // --- Climate surveys with the instrument ----------------------------------
  async function instrumentSurvey(opts: {
    name: string;
    year: number;
    profiles: Record<string, Record<Dim, number>>;
    sentAt: Date;
    dueDate: Date;
    closedAt: Date;
    releasedAt: Date;
    planDueDate: Date;
    planReminderDate: Date;
    /** People who didn't answer (on the larger teams, so every 5-person group keeps its report). */
    absent: string[];
  }) {
    const survey = await prisma.climateSurvey.create({
      data: {
        companyId: company!.id,
        name: opts.name,
        description: `Medición anual de clima organizacional ${opts.year} con el instrumento validado de Kultiva (12 dimensiones).`,
        type: "CLIMATE",
        status: "CLOSED",
        templateId: template!.id,
        instrumentVersion: INSTRUMENT_VERSION,
        isAnonymous: true,
        anonymityThreshold: 5,
        goalBand: "FAVORABLE",
        planMinPerLeader: 1,
        planDueDate: opts.planDueDate,
        planReminderDate: opts.planReminderDate,
        // Everything was already sent: the daily jobs leave these surveys alone
        planReminderSentAt: opts.planReminderDate,
        resultsReleasedAt: opts.releasedAt,
        resultsEmailedAt: opts.releasedAt,
        closingReportSentAt: opts.closedAt,
        closedAt: opts.closedAt,
        reportToken: randomBytes(24).toString("base64url"),
        followUpUserIds: admins.map((a) => a.userId),
        createdAt: opts.sentAt,
        questions: {
          create: template!.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: (q.config ?? undefined) as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { questions: true },
    });
    const distribution = await prisma.surveyDistribution.create({
      data: { surveyId: survey.id, targetType: "ALL", dueDate: opts.dueDate, sentAt: opts.sentAt },
    });

    let answered = 0;
    for (const e of people) {
      const leaderKey = leaderOf.get(e.id);
      // The CEO has no leader to report on
      const responds = !!leaderKey && !opts.absent.includes(e.name);
      const prof = opts.profiles[leaderKey ?? "ceo"];
      const submittedAt = new Date(opts.sentAt.getTime() + Math.floor(rand() * 10) * DAY + 15 * 3_600_000);
      await prisma.surveyResponse.create({
        data: {
          distributionId: distribution.id,
          employeeId: e.id,
          isComplete: responds,
          submittedAt: responds ? submittedAt : null,
          segmentSnapshot: responds ? (buildSegmentSnapshot(e, submittedAt) as unknown as Prisma.InputJsonValue) : undefined,
          answers: responds
            ? {
                create: survey.questions.flatMap((q): { questionId: string; ratingValue?: number; textValue?: string }[] => {
                  const code = itemCode(q.config);
                  if (code) return [{ questionId: q.id, ratingValue: answer(prof[code.split("-")[0] as Dim] ?? 3) }];
                  if (q.type === "TEXT") {
                    const text = pick(OPEN_ANSWERS);
                    return text ? [{ questionId: q.id, textValue: text }] : [];
                  }
                  return [];
                }),
              }
            : undefined,
        },
      });
      if (responds) answered++;
    }
    console.log(`✓ "${opts.name}": ${answered}/${people.length} answered, closed and released`);
    return survey;
  }

  // Leaders' action plans on a survey, from its real scores
  async function plan(
    surveyId: string,
    leaderKey: string,
    code: Dim,
    p: {
      action: string;
      objective?: string;
      status: "DRAFT" | "ACTIVE" | "COMPLETED";
      start: string;
      end: string;
      tasks?: { title: string; owner?: string; due: string; status: "PENDING" | "IN_PROGRESS" | "DONE" }[];
      closingNote?: string;
      submittedAt?: string;
    },
  ) {
    const scoring = await loadSurveyForScoring(surveyId, company!.id);
    const leaderId = ids.get(leaderKey)!;
    const { score, dimensions } = scoreScope(scoring!, "LEADER", leaderId);
    const dim = dimensions.find((d) => d.dimensionCode === code);
    if (!dim?.mean || !dim.band) return;
    const order: ClimateBand[] = ["MUY_DESFAVORABLE", "DESFAVORABLE", "FAVORABLE", "MUY_FAVORABLE"];
    const target = order[Math.min(order.indexOf(dim.band) + 1, 3)];
    // The one-action form writes the same text to title, objective and task
    const tasks = p.tasks ?? [{ title: p.action, due: p.end, status: p.status === "COMPLETED" ? "DONE" : "IN_PROGRESS" }];
    await prisma.actionPlan.create({
      data: {
        companyId: company!.id,
        surveyId,
        dimensionId: dimensionIdByCode.get(code)!,
        scope: "LEADER",
        scopeRefId: leaderId,
        ownerEmployeeId: leaderId,
        createdByEmployeeId: leaderId,
        title: p.action,
        objective: p.objective ?? p.action,
        baselineMean: dim.mean,
        baselineFavorability: dim.favorability,
        baselineBand: dim.band,
        baselineN: score.respondents,
        targetBand: target,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
        status: p.status,
        submittedAt: p.status === "DRAFT" ? null : new Date(p.submittedAt ?? p.start),
        completedAt: p.status === "COMPLETED" ? new Date(p.end) : null,
        closingNote: p.closingNote ?? null,
        tasks: {
          create: tasks.map((t, i) => ({
            title: t.title,
            ownerEmployeeId: t.owner ? ids.get(t.owner) ?? null : null,
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

  // --- 2025: closed, released, plans carried out during the year ------------
  const s2025 = await instrumentSurvey({
    name: SURVEY_2025,
    year: 2025,
    profiles: PROFILES_2025,
    sentAt: new Date("2025-10-06T13:00:00Z"),
    dueDate: new Date("2025-10-24T00:00:00Z"),
    closedAt: new Date("2025-10-25T13:00:00Z"),
    releasedAt: new Date("2025-10-27T14:00:00Z"),
    planDueDate: new Date("2025-11-14T00:00:00Z"),
    planReminderDate: new Date("2025-11-11T00:00:00Z"),
    absent: ["Hernán Duque", "Daniela Quintero", "Tomás Ochoa"],
  });
  await plan(s2025.id, "comercial", "CVI", {
    action: "Cargas de trabajo sostenibles en cierre de mes",
    objective: "Subir Calidad de vida al menos un nivel en la medición 2026",
    status: "COMPLETED",
    start: "2025-11-15",
    end: "2026-06-30",
    submittedAt: "2025-11-10",
    closingNote: "Se redistribuyeron cuentas en cierre de mes y se eliminaron reuniones que no eran necesarias.",
    tasks: [
      { title: "Revisar la carga de cada persona en los 1:1", owner: "comercial", due: "2026-01-31", status: "DONE" },
      { title: "Rotar las cuentas grandes en cierre de mes", owner: "comercial:Sara Londoño", due: "2026-03-31", status: "DONE" },
      { title: "Bloquear los viernes en la tarde sin reuniones", due: "2026-04-30", status: "DONE" },
    ],
  });
  await plan(s2025.id, "operaciones", "SYE", {
    action: "Comité de seguridad con turnos rotativos",
    status: "COMPLETED",
    start: "2025-11-20",
    end: "2026-05-31",
    submittedAt: "2025-11-12",
  });
  await plan(s2025.id, "tecnologia", "GCA", {
    action: "Retro mensual de cambios con el equipo",
    status: "COMPLETED",
    start: "2025-12-01",
    end: "2026-06-30",
    submittedAt: "2025-11-13",
  });
  await plan(s2025.id, "talento", "SME", {
    action: "Charlas de salud mental con el programa de apoyo emocional",
    status: "COMPLETED",
    start: "2025-11-18",
    end: "2026-04-30",
    submittedAt: "2025-11-14",
  });
  await plan(s2025.id, "ceo", "GCA", {
    action: "Explicar cada cambio de estrategia en una reunión general",
    status: "COMPLETED",
    start: "2025-12-01",
    end: "2026-09-30",
    submittedAt: "2025-11-14",
  });

  // --- 2026: closed last month, released, leaders registering plans ---------
  const s2026 = await instrumentSurvey({
    name: SURVEY_2026,
    year: 2026,
    profiles: PROFILES_2026,
    sentAt: new Date("2026-10-05T13:00:00Z"),
    dueDate: new Date("2026-10-23T00:00:00Z"),
    closedAt: new Date("2026-10-24T13:00:00Z"),
    releasedAt: new Date("2026-10-26T14:00:00Z"),
    planDueDate: new Date("2026-11-27T00:00:00Z"),
    planReminderDate: new Date("2026-11-24T00:00:00Z"),
    absent: ["Felipe Arango", "Esteban Zapata"],
  });
  // Open tasks are due from 2027 on, so the daily task reminder has nothing to send for months
  await plan(s2026.id, "comercial", "SME", {
    action: "Pausas activas de 10 minutos dos veces al día",
    status: "ACTIVE",
    start: "2026-11-03",
    end: "2027-03-31",
    submittedAt: "2026-11-02",
  });
  await plan(s2026.id, "operaciones", "GCA", {
    action: "Plan de comunicación de cambios en planta",
    objective: "Que cada cambio en planta se anuncie y se explique antes de aplicarlo",
    status: "ACTIVE",
    start: "2026-11-04",
    end: "2027-05-31",
    submittedAt: "2026-11-04",
    tasks: [
      { title: "Cartelera de cambios en cada turno", owner: "operaciones:Luisa Fernanda Gil", due: "2027-01-29", status: "IN_PROGRESS" },
      { title: "Reunión de 15 minutos al inicio de cada turno", owner: "operaciones:Carlos Mario Vélez", due: "2027-02-26", status: "PENDING" },
      { title: "Encuesta rápida sobre los cambios del trimestre", owner: "operaciones", due: "2027-05-28", status: "PENDING" },
    ],
  });
  await plan(s2026.id, "tecnologia", "COM", {
    action: "Demo quincenal de avances para todo el equipo",
    status: "DRAFT",
    start: "2026-11-10",
    end: "2027-04-30",
  });
  // Talento Humano hasn't registered its plan yet: it shows as pending

  // Closing 2026 evaluated the 2025 plans against the new results (no emails)
  const outcomes = await evaluatePlanOutcomes(s2026.id, company.id);
  console.log(`✓ Impact of ${outcomes.length} plans from 2025 evaluated against 2026`);

  // --- An active pulse survey, partly answered ------------------------------
  const now = Date.now();
  const pulse = await prisma.climateSurvey.create({
    data: {
      companyId: company.id,
      name: PULSE,
      description: "Pulso corto de seguimiento a los planes de bienestar.",
      type: "PULSE",
      status: "ACTIVE",
      isAnonymous: true,
      anonymityThreshold: 5,
      // Ends in six weeks; a survey without the instrument closes without emails
      accessStartDate: new Date(now - 3 * DAY),
      accessEndDate: new Date(now + 42 * DAY),
      createdAt: new Date(now - 3 * DAY),
      questions: {
        create: [
          ["Me siento con energía al terminar mi jornada laboral.", "LIKERT"],
          ["Puedo equilibrar mi trabajo con mi vida personal.", "LIKERT"],
          ["Mi líder se interesa por mi bienestar.", "LIKERT"],
          ["Las pausas activas me han servido.", "LIKERT"],
          ["¿Qué tan probable es que recomiendes la empresa como lugar de trabajo? (0-10)", "NPS"],
          ["¿Qué más podríamos hacer por tu bienestar?", "TEXT"],
        ].map(([text, type], i) => ({
          text,
          type: type as "LIKERT" | "NPS" | "TEXT",
          order: i + 1,
          isRequired: type === "LIKERT",
          config: type === "LIKERT" ? ({ scale: "AGREE_5" } as Prisma.InputJsonValue) : undefined,
        })),
      },
    },
    include: { questions: true },
  });
  const pulseDist = await prisma.surveyDistribution.create({
    data: { surveyId: pulse.id, targetType: "ALL", dueDate: new Date(now + 42 * DAY), sentAt: new Date(now - 3 * DAY) },
  });
  let pulseAnswered = 0;
  for (const e of people) {
    const responds = rand() < 0.6;
    const submittedAt = new Date(now - Math.floor(rand() * 3) * DAY);
    await prisma.surveyResponse.create({
      data: {
        distributionId: pulseDist.id,
        employeeId: e.id,
        isComplete: responds,
        submittedAt: responds ? submittedAt : null,
        segmentSnapshot: responds ? (buildSegmentSnapshot(e, submittedAt) as unknown as Prisma.InputJsonValue) : undefined,
        answers: responds
          ? {
              create: pulse.questions.flatMap((q): { questionId: string; ratingValue?: number; textValue?: string }[] => {
                if (q.type === "LIKERT") return [{ questionId: q.id, ratingValue: Math.min(5, Math.max(1, Math.round(3.6 + (rand() - 0.5) * 2.4))) }];
                if (q.type === "NPS") return [{ questionId: q.id, ratingValue: Math.min(10, Math.max(0, Math.round(7.5 + (rand() - 0.5) * 6))) }];
                const text = pick(OPEN_ANSWERS);
                return text ? [{ questionId: q.id, textValue: text }] : [];
              }),
            }
          : undefined,
      },
    });
    if (responds) pulseAnswered++;
  }
  console.log(`✓ "${PULSE}": active, ${pulseAnswered}/${people.length} answered so far`);
  console.log("Done. Nothing was emailed.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
