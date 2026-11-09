/**
 * Imports the demo company of Kultiva's POC (company "c1") into ONE company of
 * the platform: areas as departments, sedes as hubs, the 200 people with their
 * leaders, "Encuesta de Clima Organizacional 2026" with its 191 responses
 * (closed, results released) and the leaders' action plans, plus the POC's
 * draft climate survey.
 *
 * Run:   npx tsx scripts/import-kultiva-poc.ts --company <slug> --data <dir> [--create "<name>"]
 *        <dir> holds the POC's companies.json, surveys.json and responses.json
 *        (its Supabase tables, rows as { id, data, … })
 *        --create makes the company when no company has that slug yet
 * A non-local database also needs:  --confirm <slug>   (the same slug)
 *
 * - Only touches the company it's given. Re-running replaces the surveys it
 *   imported (and their plans) and updates the people; nothing else is deleted.
 *   It refuses when the company has worked on those surveys since (launched
 *   the draft, added plans or progress), so in-app work is never wiped.
 * - Sends no email itself. People get Resend's test inbox
 *   (delivered+<user>@resend.dev) and the survey is marked as already
 *   emailed. The plans keep the POC's dates, so while their tasks are open
 *   the daily task reminder emails those two leaders' test inboxes.
 * - Left out: the POC company's own profile (name, NIT, city, contact), and the
 *   "Pulso de bienestar" survey, whose choice and yes/no questions have no type
 *   here yet (it has no responses).
 * - Needs the Kultiva survey template (prisma/seed-system-templates.ts).
 */
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import {
  PrismaClient,
  Prisma,
  type ActionPlanStatus,
  type ActionTaskStatus,
  type ClimateBand,
  type Gender,
  type JobLevel,
} from "@prisma/client";
import { buildSegmentSnapshot } from "../src/lib/utils/climate-segments";
import { INSTRUMENT_VERSION } from "../src/lib/constants/climate-instrument";
import { parseJobLevel } from "../src/lib/constants/job-levels";
import { loadSurveyForScoring, scoreScope } from "../src/lib/queries/climate-reports";

const prisma = new PrismaClient();
const HOUR = 3_600_000;

const POC_COMPANY = "c1";
const RESULTS_SURVEY = "s2";
const DRAFT_SURVEY = "su7jjx4s";
const SKIPPED_SURVEY = "s1";

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
// The POC's data
// ---------------------------------------------------------------------------

interface PocUser {
  id: string;
  nombres: string;
  correo: string;
  cedula: string;
  cargo: string;
  area: string;
  sede: string;
  genero: string;
  nivelJerarquico: string;
  /** The leader's name ("" for the leaders themselves) */
  liderDirecto: string;
  fechaIngreso: string;
  fechaNacimiento: string;
}

interface PocQuestion {
  id: string;
  text: string;
  type: string;
}

interface PocPlan {
  id: string;
  accion: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  leaderId: string;
  createdAt: number;
  /** Dimension name, as in the survey */
  dimension: string;
  evidenciaNombre?: string;
}

interface PocSurvey {
  id: string;
  title: string;
  description?: string;
  enunciado?: string;
  createdAt: number;
  dimensions: { id: string; name: string; questions: PocQuestion[] }[];
  leaders?: { id: string; name: string; contexto?: Record<string, string> }[];
  portada?: { introTexto?: string; escalaRespuestas?: string; duracionAdicional?: string };
  aplicacion?: { fechaInicio: string; horaInicio: string; fechaFin: string; horaFin: string };
  actionPlans?: PocPlan[];
}

interface PocResponse {
  id: string;
  survey_id: string;
  leader_id: string | null;
  user_id: string;
  answers: Record<string, number | string>;
  submitted_at: string;
}

function readTable<T>(dir: string, table: string): T[] {
  const rows = JSON.parse(readFileSync(join(dir, `${table}.json`), "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${table}.json isn't a list of rows`);
  return rows as T[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const GENDER: Record<string, Gender> = {
  Femenino: "FEMALE",
  Masculino: "MALE",
  "No binario": "NON_BINARY",
  "Prefiero no decir": "PREFER_NOT_TO_SAY",
};

// The POC splits leaders by operativo / táctico / estratégico
const LEADER_LEVEL: Record<string, JobLevel> = {
  operativo: "LEADER",
  tactico: "MANAGER",
  estrategico: "DIRECTOR",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Resend's test inbox: emails "arrive" without reaching anyone. */
const testInbox = (correo: string) => `delivered+${correo.split("@")[0].toLowerCase()}@resend.dev`;

/** A POC day and time, in Colombia. */
const bogota = (day: string, time?: string) => new Date(`${day}T${time || "00:00"}:00-05:00`);

const BANDS: ClimateBand[] = ["MUY_DESFAVORABLE", "DESFAVORABLE", "FAVORABLE", "MUY_FAVORABLE"];

function planStatus(estado: string): { plan: ActionPlanStatus; task: ActionTaskStatus } {
  const e = norm(estado);
  if (/complet|cumpl|finaliz|hech/.test(e)) return { plan: "COMPLETED", task: "DONE" };
  if (/progreso|curso/.test(e)) return { plan: "ACTIVE", task: "IN_PROGRESS" };
  return { plan: "ACTIVE", task: "PENDING" };
}

// ---------------------------------------------------------------------------

async function main() {
  const slug = arg("company");
  const dir = arg("data");
  if (!slug || !dir) {
    throw new Error("Usage: npx tsx scripts/import-kultiva-poc.ts --company <slug> --data <dir> [--confirm <slug>]");
  }
  if (!isLocalDatabase() && arg("confirm") !== slug) {
    throw new Error(`This is a shared database (${databaseHost()}). Re-run with --confirm ${slug} to write to that company.`);
  }

  const pocCompany = readTable<{ id: string; data: { usuarios?: PocUser[]; identificacion?: string } }>(dir, "companies").find(
    (c) => c.id === POC_COMPANY,
  );
  const surveys = new Map(readTable<{ id: string; data: PocSurvey }>(dir, "surveys").map((s) => [s.id, s.data]));
  const pocUsers = pocCompany?.data.usuarios ?? [];
  const results = surveys.get(RESULTS_SURVEY);
  const draft = surveys.get(DRAFT_SURVEY);
  if (!pocUsers.length || !results?.aplicacion || !draft) throw new Error(`${dir} doesn't have the POC's company ${POC_COMPANY} and its surveys`);
  const pocResponses = readTable<PocResponse>(dir, "responses").filter((r) => r.survey_id === RESULTS_SURVEY);

  // Only what it needs, so it also runs against a database a migration behind
  const select = { id: true, name: true, slug: true } as const;
  let company = await prisma.company.findUnique({ where: { slug }, select });
  const createAs = arg("create");
  if (company && createAs && company.name !== createAs) {
    throw new Error(`"${slug}" is already "${company.name}"; --create only makes a new company`);
  }
  if (!company && createAs) {
    // A company of its own for the POC, with the POC company's NIT
    company = await prisma.company.create({ data: { name: createAs, slug, taxId: pocCompany!.data.identificacion || "PENDING" }, select });
    console.log(`Created company "${createAs}"`);
  }
  if (!company) throw new Error(`No company with slug "${slug}" (pass --create "<name>" to create it)`);
  console.log(`Company: ${company.name} (${company.slug}) on ${databaseHost() || "?"}`);

  const itemCode = (config: unknown) => (config as { itemCode?: string } | null)?.itemCode;
  const template = (
    await prisma.climateSurveyTemplate.findMany({
      where: { companyId: null, name: "Encuesta de Clima Organizacional Kultiva" },
      include: { questions: { orderBy: { order: "asc" } } },
    })
  ).find((t) => t.questions.some((q) => itemCode(q.config)));
  if (!template) throw new Error("The Kultiva survey template is missing: run prisma/seed-system-templates.ts");

  // The POC's questions are the template's: by text, else by position
  const pocQuestions = results.dimensions.flatMap((d) => d.questions.map((q) => ({ ...q, dimension: d.name })));
  if (pocQuestions.length !== template.questions.length) {
    throw new Error(`The POC survey has ${pocQuestions.length} questions and the template ${template.questions.length}`);
  }
  const unused = new Set(template.questions.map((_, i) => i));
  const templateIndexOf = new Map<string, number>(); // POC question id → template position
  pocQuestions.forEach((q, i) => {
    const byText = template.questions.findIndex((t, j) => unused.has(j) && norm(t.text) === norm(q.text));
    const j = byText >= 0 ? byText : i;
    const t = template.questions[j];
    if (!unused.has(j) || (q.type === "text") !== (t.type === "TEXT")) {
      throw new Error(`POC question "${q.text}" has no counterpart in the template`);
    }
    if (byText < 0) console.log(`  ! "${q.text}" is worded differently from the template's ${itemCode(t.config) ?? "question"}: "${t.text}"`);
    unused.delete(j);
    templateIndexOf.set(q.id, j);
  });
  const dimensionIdOf = new Map<string, string>(); // POC dimension name → dimension id
  for (const q of pocQuestions) {
    const id = template.questions[templateIndexOf.get(q.id)!].dimensionId;
    if (id && !dimensionIdOf.has(q.dimension)) dimensionIdOf.set(q.dimension, id);
  }

  // Surveys from an earlier run, checked before anything is written: worked on
  // in the app since (draft launched, plans or progress added) → stop
  const pocPlanTimes = new Set((results.actionPlans ?? []).map((p) => p.createdAt));
  const old = await prisma.climateSurvey.findMany({
    where: {
      companyId: company.id,
      OR: [results, draft].map((s) => ({ name: s.title, createdAt: new Date(s.createdAt) })),
    },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { distributions: true } },
      actionPlans: { select: { createdAt: true, _count: { select: { updates: true } } } },
    },
  });
  for (const o of old) {
    const touched =
      o.name === draft.title
        ? o.status !== "DRAFT" || o._count.distributions > 0
        : o.status !== "CLOSED" || o.actionPlans.some((p) => !pocPlanTimes.has(p.createdAt.getTime()) || p._count.updates > 0);
    if (touched) throw new Error(`"${o.name}" was worked on in the app after the import; not replacing it`);
  }

  const admins = await prisma.companyUser.findMany({
    where: { companyId: company.id, role: "ADMIN", isActive: true },
    select: { userId: true },
  });

  // --- Areas, sedes and people ---------------------------------------------
  const deptIds = new Map<string, string>();
  for (const name of [...new Set(pocUsers.map((u) => u.area.trim()))]) {
    const existing = await prisma.department.findFirst({ where: { companyId: company.id, name }, select: { id: true } });
    deptIds.set(name, existing?.id ?? (await prisma.department.create({ data: { companyId: company.id, name }, select: { id: true } })).id);
  }
  const hubIds = new Map<string, string>();
  for (const name of [...new Set(pocUsers.map((u) => u.sede.trim()))]) {
    const hub = await prisma.hub.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      create: { companyId: company.id, name },
      update: {},
      select: { id: true },
    });
    hubIds.set(name, hub.id);
  }

  const employeeIdOf = new Map<string, string>(); // POC user id → employee id
  const employeeIdByName = new Map<string, string>();
  for (const u of pocUsers) {
    const email = testInbox(u.correo);
    const nationalId = u.cedula.trim();
    const level = norm(u.nivelJerarquico);
    const data = {
      name: u.nombres.trim(),
      email,
      title: u.cargo.trim() || null,
      jobLevel: LEADER_LEVEL[level] ?? parseJobLevel(u.nivelJerarquico),
      gender: GENDER[u.genero] ?? null,
      departmentId: deptIds.get(u.area.trim())!,
      hubId: hubIds.get(u.sede.trim())!,
      nationalId,
      birthDate: u.fechaNacimiento ? new Date(`${u.fechaNacimiento}T00:00:00Z`) : null,
      startDate: u.fechaIngreso ? new Date(`${u.fechaIngreso}T00:00:00Z`) : null,
    };
    const existing = await prisma.employee.findFirst({
      where: { companyId: company.id, OR: [{ nationalId }, { email }] },
      select: { id: true },
    });
    const e = existing
      ? await prisma.employee.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.employee.create({ data: { companyId: company.id, ...data, isActive: true }, select: { id: true } });
    employeeIdOf.set(u.id, e.id);
    employeeIdByName.set(norm(u.nombres), e.id);
  }
  for (const u of pocUsers) {
    const managerId = u.liderDirecto.trim() ? employeeIdByName.get(norm(u.liderDirecto)) ?? null : null;
    if (u.liderDirecto.trim() && !managerId) console.log(`  ! ${u.nombres}: no person named "${u.liderDirecto}"`);
    await prisma.employee.update({ where: { id: employeeIdOf.get(u.id)! }, data: { managerId } });
  }
  console.log(`✓ ${deptIds.size} departments, ${hubIds.size} hubs, ${employeeIdOf.size} people`);

  // --- Replace surveys from an earlier run (their plans first) ---------------
  if (old.length) {
    await prisma.actionPlan.deleteMany({ where: { surveyId: { in: old.map((o) => o.id) } } });
    await prisma.climateSurvey.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    console.log(`  replaced ${old.length} survey(s) from an earlier run`);
  }

  // The results survey keeps the POC's wording (what people answered); the draft, the template's
  const pocTextAt = new Map([...templateIndexOf].map(([pocId, j]) => [j, pocQuestions.find((q) => q.id === pocId)!.text]));
  const questionsFromTemplate = (wording?: Map<number, string>) =>
    template.questions.map((q, j) => ({
      text: wording?.get(j) ?? q.text,
      type: q.type,
      dimensionId: q.dimensionId,
      order: q.order,
      isRequired: q.isRequired,
      config: (q.config ?? undefined) as Prisma.InputJsonValue | undefined,
    }));

  // --- The 2026 survey: closed, results released -----------------------------
  const { aplicacion, portada } = results;
  const opensAt = bogota(aplicacion.fechaInicio, aplicacion.horaInicio);
  const closesAt = bogota(aplicacion.fechaFin, aplicacion.horaFin);
  const survey = await prisma.climateSurvey.create({
    data: {
      companyId: company.id,
      name: results.title,
      description: results.description ?? null,
      type: "CLIMATE",
      status: "CLOSED",
      templateId: template.id,
      instrumentVersion: INSTRUMENT_VERSION,
      isAnonymous: true,
      anonymityThreshold: 5,
      goalBand: "FAVORABLE",
      planMinPerLeader: 1,
      welcomeBody: results.enunciado ?? null,
      accessStartDate: opensAt,
      accessEndDate: closesAt,
      reportIntroText: portada?.introTexto || null,
      reportScaleText: portada?.escalaRespuestas || null,
      reportExtraDuration: portada?.duracionAdicional || null,
      // Everything was already sent: the daily jobs leave this survey alone
      resultsReleasedAt: closesAt,
      resultsEmailedAt: closesAt,
      closingReportSentAt: closesAt,
      closedAt: closesAt,
      reportToken: randomBytes(24).toString("base64url"),
      followUpUserIds: admins.map((a) => a.userId),
      createdAt: new Date(results.createdAt),
      questions: { create: questionsFromTemplate(pocTextAt) },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const distribution = await prisma.surveyDistribution.create({
    data: { surveyId: survey.id, targetType: "ALL", dueDate: new Date(`${aplicacion.fechaFin}T00:00:00Z`), sentAt: opensAt },
  });

  // The POC's answer times predate its own application window: keep their
  // spacing, starting an hour after the survey opened
  const firstAnswer = Math.min(...pocResponses.map((r) => new Date(r.submitted_at).getTime()));
  const shift = opensAt.getTime() + HOUR - firstAnswer;
  const leaderOfPocLeader = new Map<string, string>(); // POC leader id → employee id
  for (const l of results.leaders ?? []) {
    const id = employeeIdByName.get(norm(l.name));
    if (id) leaderOfPocLeader.set(l.id, id);
    else console.log(`  ! Leader ${l.name}: no person with that name`);
  }

  const people = await prisma.employee.findMany({
    where: { id: { in: [...employeeIdOf.values()] } },
    include: { teamMemberships: { select: { teamId: true } } },
  });
  const personById = new Map(people.map((p) => [p.id, p]));
  let texts = 0;
  for (const r of pocResponses) {
    const employeeId = employeeIdOf.get(r.user_id);
    if (!employeeId) {
      console.log(`  ! Response ${r.id}: no person ${r.user_id}`);
      continue;
    }
    const submittedAt = new Date(Math.min(new Date(r.submitted_at).getTime() + shift, closesAt.getTime()));
    // The leader they rated, as the POC recorded it
    const snapshot = {
      ...buildSegmentSnapshot(personById.get(employeeId)!, submittedAt),
      leaderEmployeeId: r.leader_id ? leaderOfPocLeader.get(r.leader_id) ?? null : null,
    };
    const answers = Object.entries(r.answers).flatMap(([pocId, value]): Prisma.SurveyAnswerCreateManyResponseInput[] => {
      const index = templateIndexOf.get(pocId);
      if (index === undefined) return [];
      const questionId = survey.questions[index].id;
      if (typeof value === "number") return [{ questionId, ratingValue: value }];
      if (typeof value === "string" && value.trim()) {
        texts++;
        return [{ questionId, textValue: value.trim() }];
      }
      return [];
    });
    await prisma.surveyResponse.create({
      data: {
        distributionId: distribution.id,
        employeeId,
        isComplete: true,
        submittedAt,
        createdAt: submittedAt,
        segmentSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        answers: { createMany: { data: answers } },
      },
    });
  }
  // Everyone else was invited and didn't answer
  const answered = new Set(pocResponses.map((r) => r.user_id));
  const pending = pocUsers.filter((u) => !answered.has(u.id));
  await prisma.surveyResponse.createMany({
    data: pending.map((u) => ({ distributionId: distribution.id, employeeId: employeeIdOf.get(u.id)!, isComplete: false, createdAt: opensAt })),
  });
  console.log(`✓ "${survey.name}": ${pocResponses.length}/${pocUsers.length} answered (${texts} open answers), closed and released`);

  // Leaders' notes before planning, when they wrote any
  for (const l of results.leaders ?? []) {
    const leaderId = leaderOfPocLeader.get(l.id);
    if (!leaderId || !Object.values(l.contexto ?? {}).some((v) => v?.trim())) continue;
    await prisma.leaderSurveyContext.create({
      data: { surveyId: survey.id, leaderEmployeeId: leaderId, answers: l.contexto as Prisma.InputJsonValue },
    });
  }

  // --- Leaders' action plans, with baselines from the imported results ------
  const scoring = await loadSurveyForScoring(survey.id, company.id);
  let plans = 0;
  for (const p of results.actionPlans ?? []) {
    const leaderId = leaderOfPocLeader.get(p.leaderId);
    const dimensionId = dimensionIdOf.get(p.dimension);
    if (!leaderId || !dimensionId || !scoring) {
      console.log(`  ! Plan "${p.accion}": no leader or dimension "${p.dimension}"`);
      continue;
    }
    const { score, dimensions: scores } = scoreScope(scoring, "LEADER", leaderId);
    const dim = scores.find((d) => d.dimensionId === dimensionId);
    if (!dim?.mean || !dim.band) {
      console.log(`  ! Plan "${p.accion}": the leader's team has no score in ${p.dimension}`);
      continue;
    }
    if (p.evidenciaNombre) console.log(`  ! Plan "${p.accion}": evidence "${p.evidenciaNombre}" not imported`);
    const status = planStatus(p.estado);
    const createdAt = new Date(p.createdAt);
    const endDate = new Date(`${p.fechaFin}T00:00:00Z`);
    await prisma.actionPlan.create({
      data: {
        companyId: company.id,
        surveyId: survey.id,
        dimensionId,
        scope: "LEADER",
        scopeRefId: leaderId,
        ownerEmployeeId: leaderId,
        createdByEmployeeId: leaderId,
        // The one-action form writes the same text to title, objective and task
        title: p.accion,
        objective: p.accion,
        baselineMean: dim.mean,
        baselineFavorability: dim.favorability,
        baselineBand: dim.band,
        baselineN: score.respondents,
        targetBand: BANDS[Math.min(BANDS.indexOf(dim.band) + 1, BANDS.length - 1)],
        startDate: new Date(`${p.fechaInicio}T00:00:00Z`),
        endDate,
        status: status.plan,
        submittedAt: createdAt,
        completedAt: status.plan === "COMPLETED" ? endDate : null,
        createdAt,
        tasks: {
          create: [
            {
              title: p.accion,
              dueDate: endDate,
              status: status.task,
              completedAt: status.task === "DONE" ? endDate : null,
              createdAt,
            },
          ],
        },
        measures: { create: [{ kind: "OUTCOME", name: dim.dimensionName, baselineValue: dim.mean }] },
      },
    });
    plans++;
  }
  console.log(`✓ ${plans} action plans`);

  // --- The POC's draft of the same survey ------------------------------------
  await prisma.climateSurvey.create({
    data: {
      companyId: company.id,
      name: draft.title,
      description: draft.description ?? null,
      type: "CLIMATE",
      status: "DRAFT",
      templateId: template.id,
      instrumentVersion: INSTRUMENT_VERSION,
      isAnonymous: true,
      anonymityThreshold: 5,
      followUpUserIds: admins.map((a) => a.userId),
      createdAt: new Date(draft.createdAt),
      questions: { create: questionsFromTemplate() },
    },
  });
  console.log(`✓ "${draft.title}" as a draft`);

  if (surveys.has(SKIPPED_SURVEY)) console.log(`  skipped "${surveys.get(SKIPPED_SURVEY)!.title}": its question types don't exist here yet`);
  console.log("Done. The import itself sent no email.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
