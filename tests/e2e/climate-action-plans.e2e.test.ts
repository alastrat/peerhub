/**
 * End-to-end test of climate scoring and action plans against a real
 * Postgres database. Only auth (dashboard + portal sessions) and email
 * delivery are stubbed; every server action, query and Prisma call is real.
 *
 * Run:  E2E_DATABASE_URL=postgresql://…/peerhub_climate npx vitest run tests/e2e
 * The database must be migrated and seeded (instrument template KCO-2026.1).
 * Skipped when E2E_DATABASE_URL is not set.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const E2E = vi.hoisted(() => {
  const url = process.env.E2E_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
  process.env.EMAIL_DEV_MODE = "true";
  return { enabled: !!url };
});

// ---- stubs: sessions and email ---------------------------------------------
const state = vi.hoisted(() => ({
  dashboard: null as null | Record<string, unknown>,
  portal: null as null | { employeeId: string; companyId: string; email: string },
  emails: [] as { to: string | string[]; subject: string; cc?: string[] }[],
}));

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => state.dashboard) }));
vi.mock("@/lib/auth/portal-session", () => ({ getPortalSession: vi.fn(async () => state.portal) }));
vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(async (opts: { to: string | string[]; subject: string; cc?: string[] }) => {
    state.emails.push({ to: opts.to, subject: opts.subject, cc: opts.cc });
    return { messageId: "test" };
  }),
  sendBulkEmails: vi.fn(async () => []),
  EmailDeliveryError: class extends Error {},
}));
// Mirrors an environment without Supabase credentials (and avoids `server-only`)
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseStorageClient: () => {
    throw new Error("Supabase Storage is not configured");
  },
  CLIMATE_EVIDENCE_BUCKET: "climate-evidence",
  SURVEY_ASSETS_BUCKET: "survey-assets",
}));

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createClimateSurvey, updateClimateSurveyQuestion, updateSurveySettings } from "@/lib/actions/climate-surveys";
import { distributeSurvey, closeSurvey } from "@/lib/actions/climate-distribution";
import { submitSurveyResponse } from "@/lib/actions/climate-responses";
import {
  addActionPlanNote,
  addActionPlanTask,
  addProcessMeasure,
  cancelActionPlan,
  completeActionPlan,
  createActionPlan,
  deleteActionPlan,
  evaluateSurveyImpact,
  recordMeasureValue,
  releaseSurveyResults,
  retractSurveyResults,
  saveLeaderContext,
  setActionPlanTaskStatus,
  submitActionPlan,
  updateActionPlan,
  uploadTaskEvidence,
} from "@/lib/actions/action-plans";
import { getSurveyResults } from "@/lib/queries/climate-reports";
import { getLeaderTeamView, getPlanDetail, getSurveyPlansOverview, getMyTasks, listLeaderSurveys } from "@/lib/queries/action-plans";
import { sendPlanDeadlineReminders, sendTaskReminders } from "@/lib/queries/action-plan-reminders";
import { emailUsersViaDashboard, planEmails } from "@/lib/email/climate-plan-emails";
import { INSTRUMENT_DIMENSIONS, INSTRUMENT_VERSION, instrumentItemConfig } from "@/lib/constants/climate-instrument";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RUN = Math.random().toString(36).slice(2, 8);
const DIMS = ["LID", "CVI", "SPS"] as const;
const DAY = 24 * 60 * 60 * 1000;

interface Person {
  id: string;
  name: string;
  email: string;
}

const ctx = {
  companyId: "",
  otherCompanyId: "",
  adminUserId: "",
  adminEmployee: null as unknown as Person,
  otherAdminUserId: "",
  dims: {} as Record<string, string>,
  ventas: "",
  operaciones: "",
  teamNorte: "",
  lina: null as unknown as Person,
  marco: null as unknown as Person,
  nora: null as unknown as Person,
  linaTeam: [] as Person[],
  marcoTeam: [] as Person[],
  noraTeam: [] as Person[],
  surveyA: "",
  surveyB: "",
  linaPlan: "",
  linaTask1: "",
  linaTask2: "",
  orgPlan: "",
  deptPlan: "",
  teamPlan: "",
  marcoPlan: "",
  userIds: [] as string[],
};

function asAdmin(companyId = ctx.companyId, userId = ctx.adminUserId, employeeId: string | null = ctx.adminEmployee?.id ?? null) {
  state.portal = null;
  state.dashboard = {
    user: { id: userId, name: "Ana Admin", email: `ana-${RUN}@e2e.test`, globalRole: "USER" },
    companyUser: { companyId, role: "ADMIN", employeeId },
  };
}

function asPortal(p: Person) {
  state.dashboard = null;
  state.portal = { employeeId: p.id, companyId: ctx.companyId, email: p.email };
}

async function employee(name: string, extra: { departmentId?: string; managerId?: string } = {}): Promise<Person> {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}-${RUN}@e2e.test`;
  const e = await prisma.employee.create({
    data: { companyId: ctx.companyId, name, email, departmentId: extra.departmentId, managerId: extra.managerId },
  });
  return { id: e.id, name, email };
}

function instrumentQuestions(dims: readonly string[]) {
  let order = 0;
  return dims.flatMap((code) => {
    const dim = INSTRUMENT_DIMENSIONS.find((d) => d.code === code)!;
    return dim.items.map((item) => ({
      text: item.text,
      type: "LIKERT" as const,
      dimensionId: ctx.dims[code],
      order: order++,
      isRequired: true,
      config: instrumentItemConfig(item.code) as Record<string, unknown>,
    }));
  });
}

/** Answer every instrument item of a dimension with `value`. */
async function respond(surveyId: string, person: Person, values: Record<string, number>, extra: Record<string, unknown> = {}) {
  const dist = await prisma.surveyDistribution.findFirstOrThrow({ where: { surveyId }, orderBy: { createdAt: "desc" } });
  const questions = await prisma.surveyQuestion.findMany({ where: { surveyId } });
  const answers = questions.map((q) => {
    const code = (q.config as { itemCode?: string } | null)?.itemCode;
    if (code) return { questionId: q.id, ratingValue: values[code.split("-")[0]] };
    if (q.type === "NPS") return { questionId: q.id, ratingValue: (extra.nps as number) ?? 8 };
    return { questionId: q.id, textValue: (extra.text as string) ?? "ok" };
  });
  asPortal(person);
  return submitSurveyResponse({ distributionId: dist.id, answers });
}

const emailsTo = (email: string) => state.emails.filter((m) => (Array.isArray(m.to) ? m.to : [m.to]).includes(email));
const dateIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------

describe.skipIf(!E2E.enabled)("Climate scoring & action plans — end to end", () => {
  beforeAll(async () => {
    const instrument = await prisma.climateSurveyTemplate.findFirst({ where: { instrumentVersion: INSTRUMENT_VERSION } });
    if (!instrument) throw new Error("Seed the instrument first: npx tsx prisma/seed-system-templates.ts");
    for (const d of await prisma.climateDimension.findMany({ where: { code: { not: null } } })) ctx.dims[d.code!] = d.id;

    const company = await prisma.company.create({ data: { name: `E2E Clima ${RUN}`, slug: `e2e-clima-${RUN}`, taxId: "900-E2E" } });
    const other = await prisma.company.create({ data: { name: `E2E Other ${RUN}`, slug: `e2e-other-${RUN}`, taxId: "900-E2E-2" } });
    ctx.companyId = company.id;
    ctx.otherCompanyId = other.id;

    const adminUser = await prisma.user.create({ data: { email: `ana-${RUN}@e2e.test`, name: "Ana Admin" } });
    const otherAdmin = await prisma.user.create({ data: { email: `otro-${RUN}@e2e.test`, name: "Otro Admin" } });
    ctx.adminUserId = adminUser.id;
    ctx.otherAdminUserId = otherAdmin.id;
    ctx.userIds = [adminUser.id, otherAdmin.id];

    ctx.ventas = (await prisma.department.create({ data: { name: "Ventas", companyId: ctx.companyId } })).id;
    ctx.operaciones = (await prisma.department.create({ data: { name: "Operaciones", companyId: ctx.companyId } })).id;

    ctx.adminEmployee = await employee("Ana Admin");
    await prisma.companyUser.create({
      data: { userId: adminUser.id, companyId: ctx.companyId, role: "ADMIN", employeeId: ctx.adminEmployee.id },
    });
    await prisma.companyUser.create({ data: { userId: otherAdmin.id, companyId: ctx.otherCompanyId, role: "ADMIN" } });

    ctx.lina = await employee("Lina Lider", { departmentId: ctx.ventas });
    ctx.marco = await employee("Marco Mando", { departmentId: ctx.operaciones });
    ctx.nora = await employee("Nora Norte", { departmentId: ctx.operaciones });
    for (let i = 1; i <= 6; i++) ctx.linaTeam.push(await employee(`Vendedor ${i}`, { departmentId: ctx.ventas, managerId: ctx.lina.id }));
    for (let i = 1; i <= 6; i++) ctx.marcoTeam.push(await employee(`Operario ${i}`, { departmentId: ctx.operaciones, managerId: ctx.marco.id }));
    for (let i = 1; i <= 2; i++) ctx.noraTeam.push(await employee(`Analista ${i}`, { departmentId: ctx.operaciones, managerId: ctx.nora.id }));

    const team = await prisma.team.create({ data: { name: "Equipo Norte", companyId: ctx.companyId } });
    ctx.teamNorte = team.id;
    for (const p of [...ctx.linaTeam.slice(0, 3), ...ctx.marcoTeam.slice(0, 2)]) {
      await prisma.teamMember.create({ data: { teamId: team.id, employeeId: p.id } });
    }
  });

  afterAll(async () => {
    if (!ctx.companyId) return;
    // Deleting the company must cascade through its plans (NO ACTION FKs)
    await prisma.company.deleteMany({ where: { id: { in: [ctx.companyId, ctx.otherCompanyId] } } });
    await prisma.user.deleteMany({ where: { id: { in: ctx.userIds } } });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Survey creation with the validated instrument
  // =========================================================================

  it("rejects partial instrument dimensions and custom questions inside instrument dimensions", async () => {
    asAdmin();
    const partial = await createClimateSurvey({
      name: "Parcial",
      type: "CLIMATE",
      questions: instrumentQuestions(["LID"]).slice(0, 4),
    });
    expect(partial.success).toBe(false);
    expect(partial.error).toContain("LID-5");

    const intruder = await createClimateSurvey({
      name: "Intruso",
      type: "CLIMATE",
      questions: [
        ...instrumentQuestions(["LID"]),
        { text: "¿Pregunta propia?", type: "LIKERT", dimensionId: ctx.dims.LID, order: 99, isRequired: true },
      ],
    });
    expect(intruder.success).toBe(false);
  });

  it("creates an instrument survey, canonicalizing tampered items", async () => {
    asAdmin();
    const questions = instrumentQuestions(DIMS);
    questions[0] = { ...questions[0], text: "Texto alterado", isRequired: false };
    const res = await createClimateSurvey({
      name: `Clima 2026 ${RUN}`,
      type: "CLIMATE",
      anonymityThreshold: 5,
      questions: [
        ...questions,
        { text: "¿Qué mejorarías?", type: "TEXT", order: 50, isRequired: false },
        { text: "¿Recomendarías trabajar aquí? (0-10)", type: "NPS", order: 51, isRequired: false },
      ],
    });
    expect(res.success).toBe(true);
    ctx.surveyA = res.data!.id;
    expect(res.data!.instrumentVersion).toBe(INSTRUMENT_VERSION);
    const first = res.data!.questions.find((q) => (q.config as { itemCode?: string })?.itemCode === "LID-1")!;
    expect(first.text).toBe(INSTRUMENT_DIMENSIONS[0].items[0].text);
    expect(first.isRequired).toBe(true);
  });

  it("blocks inline edits to locked items but allows custom ones", async () => {
    asAdmin();
    const qs = await prisma.surveyQuestion.findMany({ where: { surveyId: ctx.surveyA } });
    const locked = qs.find((q) => (q.config as { locked?: boolean })?.locked)!;
    const custom = qs.find((q) => q.type === "TEXT")!;
    expect((await updateClimateSurveyQuestion(ctx.surveyA, locked.id, { text: "Nuevo" })).error).toContain("no se pueden editar");
    expect((await updateClimateSurveyQuestion(ctx.surveyA, custom.id, { text: "¿Qué cambiarías?" })).success).toBe(true);
  });

  it("validates plan settings", async () => {
    asAdmin();
    expect((await updateSurveySettings(ctx.surveyA, { goalPct: 120 })).error).toBe("La meta debe ser un porcentaje entero entre 1 y 100");
    expect((await updateSurveySettings(ctx.surveyA, { followUpUserIds: [ctx.otherAdminUserId] })).error).toBe("Uno de los usuarios de seguimiento no pertenece a la empresa");
    const ok = await updateSurveySettings(ctx.surveyA, { goalPct: 75, planMinPerLeader: 1, followUpUserIds: [ctx.adminUserId] });
    expect(ok.success).toBe(true);
  });

  // =========================================================================
  // 2. Responses
  // =========================================================================

  it("distributes and collects responses with validation and snapshots", async () => {
    asAdmin();
    const dist = await distributeSurvey({ surveyId: ctx.surveyA, targetType: "ALL", dueDate: new Date(Date.now() + 7 * DAY) });
    expect(dist.success).toBe(true);

    // Out of range on the 1–4 scale
    const bad = await respond(ctx.surveyA, ctx.linaTeam[0], { LID: 5, CVI: 2, SPS: 3 });
    expect(bad.error).toContain("fuera de la escala de la pregunta");

    // Lina's team: Liderazgo 4, Calidad de vida 2, Seguridad psicológica 3
    for (const p of ctx.linaTeam) expect((await respond(ctx.surveyA, p, { LID: 4, CVI: 2, SPS: 3 }, { nps: 10 })).success).toBe(true);
    // Marco's team: 3 / 4 / 4
    for (const p of ctx.marcoTeam) expect((await respond(ctx.surveyA, p, { LID: 3, CVI: 4, SPS: 4 }, { nps: 5 })).success).toBe(true);
    // Nora's team (2 people): everything 1
    for (const p of ctx.noraTeam) expect((await respond(ctx.surveyA, p, { LID: 1, CVI: 1, SPS: 1 })).success).toBe(true);

    const again = await respond(ctx.surveyA, ctx.linaTeam[0], { LID: 4, CVI: 2, SPS: 3 });
    expect(again.error).toBe("Ya enviaste esta encuesta");

    const snap = await prisma.surveyResponse.findFirstOrThrow({
      where: { employeeId: ctx.linaTeam[0].id, distribution: { surveyId: ctx.surveyA } },
    });
    expect(snap.segmentSnapshot).toMatchObject({ departmentId: ctx.ventas, leaderEmployeeId: ctx.lina.id });

    // Reorganize after submission: the snapshot must keep results stable
    await prisma.employee.update({
      where: { id: ctx.linaTeam[5].id },
      data: { managerId: ctx.marco.id, departmentId: ctx.operaciones },
    });
  });

  it("scores the survey: index, bands, favorability, eNPS, segments and suppression", async () => {
    asAdmin();
    const r = (await getSurveyResults(ctx.surveyA, ctx.companyId))!;
    expect(r.totalResponded).toBe(14);
    expect(r.isInstrument).toBe(true);
    expect(r.suppressed).toBe(false);

    const lid = r.dimensionScores.find((d) => d.dimensionCode === "LID")!;
    // (6×4 + 6×3 + 2×1) / 14 = 3.142… → Favorable
    expect(lid.mean).toBeCloseTo(44 / 14, 5);
    expect(lid.band).toBe("FAVORABLE");
    expect(lid.favorability).toBeCloseTo(12 / 14, 5);
    const cvi = r.dimensionScores.find((d) => d.dimensionCode === "CVI")!;
    expect(cvi.mean).toBeCloseTo(38 / 14, 5); // 2.71 → Desfavorable
    expect(cvi.band).toBe("DESFAVORABLE");
    expect(r.gaps.map((g) => g.dimensionCode)).toEqual(["CVI"]);

    // eNPS only from the NPS question: 6 promoters (10), 6 detractors (5), 2 passives (8)
    expect(r.npsScore).toBe(0);

    const leaders = Object.fromEntries(r.leaderBreakdown.map((s) => [s.segmentName, s]));
    expect(leaders["Lina Lider"].respondents).toBe(6); // snapshot keeps the moved employee
    expect(leaders["Marco Mando"].respondents).toBe(6);
    expect(leaders["Nora Norte"].suppressed).toBe(true);

    const team = r.teamBreakdown.find((s) => s.segmentName === "Equipo Norte")!;
    expect(team.respondents).toBe(5);
    expect(team.suppressed).toBe(false);

    expect(r.attentionSegments.some((s) => s.segmentName === "Nora Norte")).toBe(false);
    // Text answers are visible because the survey is above the minimum
    expect(r.questionResults.find((q) => q.type === "TEXT")!.textResponses.length).toBe(14);
  });

  // =========================================================================
  // 3. Release
  // =========================================================================

  it("keeps leaders out until results are released", async () => {
    asPortal(ctx.lina);
    expect(await getLeaderTeamView(ctx.surveyA, ctx.lina.id, ctx.companyId)).toBeNull();
    const early = await createActionPlan({
      surveyId: ctx.surveyA,
      dimensionId: ctx.dims.CVI,
      scope: "LEADER",
      scopeRefId: ctx.lina.id,
      title: "Antes de tiempo",
      objective: "x",
      startDate: dateIn(0),
      endDate: dateIn(30),
    });
    expect(early.error).toBe("Los resultados aún no se han publicado");
    expect((await releaseSurveyResults(ctx.surveyA)).error).toBe("Solo un administrador puede publicar los resultados");
  });

  it("releases results while the survey is open, leaving the leaders' email for the close", async () => {
    asAdmin();
    state.emails = [];
    // A double click / retry: only one release
    const [first, second] = await Promise.all([releaseSurveyResults(ctx.surveyA), releaseSurveyResults(ctx.surveyA)]);
    expect([first.success, second.success].filter(Boolean)).toHaveLength(1);
    const res = first.success ? first : second;
    expect((first.success ? second : first).error).toBe("Los resultados ya se publicaron");
    // Still active: leaders see their results but get no email yet
    expect(res.data).toEqual({ leaders: 0, leadersWithGaps: 0, emailed: 0, emailOnClose: true });
    expect(state.emails).toHaveLength(0);

    const survey = await prisma.climateSurvey.findUniqueOrThrow({ where: { id: ctx.surveyA } });
    // No default plan deadline yet: it's set when the leaders get their email, at the close
    expect(survey.resultsReleasedAt).not.toBeNull();
    expect(survey.planDueDate).toBeNull();
    expect((await releaseSurveyResults(ctx.surveyA)).error).toBe("Los resultados ya se publicaron");
  });

  it("shows each leader only their own team, and nothing to a suppressed team", async () => {
    const view = (await getLeaderTeamView(ctx.surveyA, ctx.lina.id, ctx.companyId))!;
    expect(view.gaps.respondents).toBe(6);
    expect(view.gaps.gaps.map((g) => g.dimensionCode)).toEqual(["CVI", "SPS"]); // 2.0 then 3.0
    expect(view.gaps.required).toBe(1);

    const nora = (await getLeaderTeamView(ctx.surveyA, ctx.nora.id, ctx.companyId))!;
    expect(nora.gaps.suppressed).toBe(true);
    expect(nora.items).toEqual([]);

    expect(await getLeaderTeamView(ctx.surveyA, ctx.linaTeam[0].id, ctx.companyId)).toBeNull(); // not a leader

    const list = await listLeaderSurveys(ctx.lina.id, ctx.companyId);
    expect(list).toEqual([expect.objectContaining({ surveyId: ctx.surveyA, gapCount: 2, required: 1, submitted: 0 })]);
    expect(await listLeaderSurveys(ctx.linaTeam[0].id, ctx.companyId)).toEqual([]); // leads nobody

    // Responses saved before snapshots existed fall back to the live manager
    const noraResponses = await prisma.surveyResponse.findMany({
      where: { employeeId: { in: ctx.noraTeam.map((p) => p.id) }, distribution: { surveyId: ctx.surveyA } },
    });
    await prisma.surveyResponse.updateMany({
      where: { id: { in: noraResponses.map((r) => r.id) } },
      data: { segmentSnapshot: Prisma.DbNull },
    });
    expect(await listLeaderSurveys(ctx.nora.id, ctx.companyId)).toEqual([
      expect.objectContaining({ surveyId: ctx.surveyA, respondents: 2, suppressed: true }),
    ]);
    for (const r of noraResponses) {
      await prisma.surveyResponse.update({ where: { id: r.id }, data: { segmentSnapshot: r.segmentSnapshot as Prisma.InputJsonValue } });
    }
  });

  // =========================================================================
  // 4. Leader plan lifecycle
  // =========================================================================

  it("lets a leader plan only for their own team, with a valid target", async () => {
    asPortal(ctx.lina);
    const base = {
      surveyId: ctx.surveyA,
      title: "Bienestar del equipo",
      objective: "Pasar Calidad de vida de Muy desfavorable a Desfavorable",
      startDate: dateIn(0),
      endDate: dateIn(60),
    };
    const foreign = await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "LEADER", scopeRefId: ctx.marco.id });
    expect(foreign.error).toBe("Solo puedes crear planes para tu propio equipo");
    const org = await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "ORGANIZATION" });
    expect(org.error).toBe("Solo puedes crear planes para tu propio equipo");
    const lowTarget = await createActionPlan({
      ...base,
      dimensionId: ctx.dims.LID,
      scope: "LEADER",
      scopeRefId: ctx.lina.id,
      targetBand: "FAVORABLE",
    });
    expect(lowTarget.error).toBe("La meta no puede estar por debajo del nivel actual");
    const badDates = await createActionPlan({
      ...base,
      dimensionId: ctx.dims.CVI,
      scope: "LEADER",
      scopeRefId: ctx.lina.id,
      startDate: dateIn(10),
      endDate: dateIn(1),
    });
    expect(badDates.error).toContain("fecha de inicio");

    const ok = await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "LEADER", scopeRefId: ctx.lina.id });
    expect(ok.success).toBe(true);
    ctx.linaPlan = ok.data!.id;

    const plan = (await getPlanDetail(ctx.linaPlan, ctx.companyId))!;
    expect(plan.status).toBe("DRAFT");
    expect(plan.baselineMean).toBe(2);
    expect(plan.baselineBand).toBe("MUY_DESFAVORABLE");
    expect(plan.baselineN).toBe(6);
    expect(plan.targetBand).toBe("DESFAVORABLE"); // default: one band up
    expect(plan.measures.filter((m) => m.kind === "OUTCOME")).toHaveLength(1);
    expect(plan.ownerEmployeeId).toBe(ctx.lina.id);
  });

  it("requires a task before submitting, then notifies HR and task owners", async () => {
    asPortal(ctx.lina);
    expect((await submitActionPlan(ctx.linaPlan)).error).toBe("Agrega al menos una tarea antes de enviar el plan");

    const t1 = await addActionPlanTask(ctx.linaPlan, {
      title: "Pausas activas semanales",
      ownerEmployeeId: ctx.linaTeam[1].id,
      dueDate: dateIn(10),
    });
    const t2 = await addActionPlanTask(ctx.linaPlan, { title: "Revisar cargas de trabajo", dueDate: dateIn(-1) });
    expect(t1.success && t2.success).toBe(true);
    ctx.linaTask1 = t1.data!.id;
    ctx.linaTask2 = t2.data!.id;
    const foreignOwner = await addActionPlanTask(ctx.linaPlan, {
      title: "x",
      ownerEmployeeId: (await prisma.employee.create({ data: { companyId: ctx.otherCompanyId, name: "Ajeno", email: `ajeno-${RUN}@e2e.test` } })).id,
      dueDate: dateIn(5),
    });
    expect(foreignOwner.error).toBe("No encontramos al responsable de la tarea en la empresa");

    expect((await saveLeaderContext(ctx.surveyA, { q1: "Equipo cansado", q2: "Cierre de trimestre" })).success).toBe(true);

    state.emails = [];
    expect((await submitActionPlan(ctx.linaPlan)).success).toBe(true);
    expect(emailsTo(`ana-${RUN}@e2e.test`)[0].subject).toContain("Nuevo plan de acción");
    expect(emailsTo(ctx.linaTeam[1].email)[0].subject).toContain("Nueva tarea asignada");
    expect((await submitActionPlan(ctx.linaPlan)).error).toBe("Solo se pueden enviar planes en borrador");
    expect((await deleteActionPlan(ctx.linaPlan)).error).toBe("Solo se pueden eliminar planes en borrador");

    const overview = (await getSurveyPlansOverview(ctx.surveyA, ctx.companyId))!;
    const lina = overview.leaders.find((l) => l.leaderEmployeeId === ctx.lina.id)!;
    const marco = overview.leaders.find((l) => l.leaderEmployeeId === ctx.marco.id)!;
    expect(lina).toMatchObject({ required: 1, submitted: 1, meetsMinimum: true });
    expect(marco).toMatchObject({ required: 1, submitted: 0, meetsMinimum: false });
    expect(overview.plans.find((p) => p.id === ctx.linaPlan)!.overdueTasks).toBe(1);
  });

  it("lets a task owner progress only their own task", async () => {
    asPortal(ctx.linaTeam[1]);
    expect((await getMyTasks(ctx.linaTeam[1].id, ctx.companyId)).map((t) => t.id)).toEqual([ctx.linaTask1]);
    expect((await setActionPlanTaskStatus(ctx.linaTask1, "IN_PROGRESS", "Arrancamos")).success).toBe(true);
    expect((await setActionPlanTaskStatus(ctx.linaTask1, "CANCELLED")).error).toBe("Solo el responsable del plan puede cancelar una tarea");
    expect((await setActionPlanTaskStatus(ctx.linaTask2, "DONE")).error).toBe("No puedes actualizar esta tarea");
    expect((await addActionPlanNote(ctx.linaPlan, "Primera pausa hecha", ctx.linaTask1)).success).toBe(true);
    expect((await addActionPlanNote(ctx.linaPlan, "Nota general")).error).toBe("No puedes agregar notas a este plan");
    expect((await updateActionPlan(ctx.linaPlan, { title: "Hackeado" })).error).toBe("No puedes editar este plan");
    expect((await setActionPlanTaskStatus(ctx.linaTask1, "DONE")).success).toBe(true);

    // A colleague with nothing assigned can't touch the plan
    asPortal(ctx.linaTeam[2]);
    expect((await setActionPlanTaskStatus(ctx.linaTask1, "PENDING")).error).toBe("No puedes actualizar esta tarea");
  });

  it("tracks process indicators and completes the plan with a closing note", async () => {
    asPortal(ctx.lina);
    const m = await addProcessMeasure(ctx.linaPlan, { name: "Pausas realizadas", unit: "sesiones", baselineValue: 0, targetValue: 8 });
    expect(m.success).toBe(true);
    expect((await recordMeasureValue(m.data!.id, 3, "Semana 3")).success).toBe(true);
    expect((await recordMeasureValue(m.data!.id, Number.NaN)).error).toBe("«Valor» debe ser un número");

    expect((await completeActionPlan(ctx.linaPlan, "Listo")).error).toBe("Termina o cancela todas las tareas antes de completar el plan");
    expect((await setActionPlanTaskStatus(ctx.linaTask2, "DONE")).success).toBe(true);
    expect((await completeActionPlan(ctx.linaPlan, "   ")).error).toBe("Completa el campo «Cierre del plan»");

    state.emails = [];
    expect((await completeActionPlan(ctx.linaPlan, "Se hicieron 8 pausas y se redistribuyó la carga.")).success).toBe(true);
    expect(emailsTo(`ana-${RUN}@e2e.test`).some((e) => e.subject.includes("completó sus planes"))).toBe(true);

    const plan = (await getPlanDetail(ctx.linaPlan, ctx.companyId))!;
    expect(plan.status).toBe("COMPLETED");
    expect(plan.progress).toEqual({ done: 2, total: 2, pct: 100 });
    expect(plan.measures.find((x) => x.kind === "PROCESS")!.currentValue).toBe(3);
    expect(plan.updates.length).toBeGreaterThanOrEqual(5);
    expect((await addActionPlanTask(ctx.linaPlan, { title: "Tarde", dueDate: dateIn(3) })).error).toBe("Este plan está cerrado");
  });

  // =========================================================================
  // 5. Admin plans
  // =========================================================================

  it("lets admins plan for the organization, departments and teams, not for suppressed groups", async () => {
    asAdmin();
    const base = { surveyId: ctx.surveyA, title: "Plan", objective: "Objetivo", startDate: dateIn(0), endDate: dateIn(90) };
    const org = await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "ORGANIZATION", ownerEmployeeId: ctx.adminEmployee.id });
    expect(org.success).toBe(true);
    ctx.orgPlan = org.data!.id;
    expect((await getPlanDetail(ctx.orgPlan, ctx.companyId))!.baselineMean).toBeCloseTo(38 / 14, 5);

    const dept = await createActionPlan({ ...base, dimensionId: ctx.dims.LID, scope: "DEPARTMENT", scopeRefId: ctx.operaciones, ownerEmployeeId: ctx.marco.id });
    expect(dept.success).toBe(true);
    ctx.deptPlan = dept.data!.id;

    const team = await createActionPlan({ ...base, dimensionId: ctx.dims.SPS, scope: "TEAM", scopeRefId: ctx.teamNorte, ownerEmployeeId: ctx.lina.id });
    expect(team.success).toBe(true);
    ctx.teamPlan = team.data!.id;

    expect((await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "DEPARTMENT", scopeRefId: "nope", ownerEmployeeId: ctx.marco.id })).error).toBe("No encontramos el grupo");
    expect((await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "LEADER", scopeRefId: ctx.nora.id })).error).toContain("menos de 5 respuestas");
    expect((await createActionPlan({ ...base, dimensionId: ctx.dims.CVI, scope: "ORGANIZATION" })).success).toBe(true); // owner defaults to the admin's employee
    expect((await createActionPlan({ ...base, dimensionId: "not-a-dimension", scope: "ORGANIZATION", ownerEmployeeId: ctx.adminEmployee.id })).error).toContain("no hace parte del instrumento validado");

    expect((await cancelActionPlan(ctx.deptPlan, "")).error).toBe("Completa el campo «Motivo de cancelación»");
    expect((await cancelActionPlan(ctx.deptPlan, "Se unifica con el plan organizacional")).success).toBe(true);
    expect((await retractSurveyResults(ctx.surveyA)).error).toBe("Los líderes ya enviaron planes para estos resultados");

    // Admin submits the org plan with one task so it's evaluated later
    expect((await addActionPlanTask(ctx.orgPlan, { title: "Programa de bienestar", dueDate: dateIn(30) })).success).toBe(true);
    expect((await submitActionPlan(ctx.orgPlan)).success).toBe(true);
    expect((await addActionPlanTask(ctx.teamPlan, { title: "Retro mensual", dueDate: dateIn(20) })).success).toBe(true);
    expect((await submitActionPlan(ctx.teamPlan)).success).toBe(true);
  });

  it("emails follow-ups only while they belong to the company", async () => {
    state.emails = [];
    const sent = await emailUsersViaDashboard(
      ctx.companyId,
      [ctx.adminUserId, ctx.otherAdminUserId],
      "/surveys/climate",
      planEmails.planSubmitted("x", "y", "z", "w"),
    );
    expect(sent).toBe(1); // the other company's admin is skipped
    await prisma.companyUser.updateMany({ where: { userId: ctx.adminUserId }, data: { isActive: false } });
    expect(await emailUsersViaDashboard(ctx.companyId, [ctx.adminUserId], "/", planEmails.planSubmitted("x", "y", "z", "w"))).toBe(0);
    await prisma.companyUser.updateMany({ where: { userId: ctx.adminUserId }, data: { isActive: true } });
  });

  it("blocks deleting an employee or dimension that still owns plans", async () => {
    await expect(prisma.employee.delete({ where: { id: ctx.lina.id } })).rejects.toThrow();
    await expect(prisma.climateDimension.delete({ where: { id: ctx.dims.CVI } })).rejects.toThrow();
  });

  it("isolates tenants", async () => {
    asAdmin(ctx.otherCompanyId, ctx.otherAdminUserId, null);
    expect(await getPlanDetail(ctx.linaPlan, ctx.otherCompanyId)).toBeNull();
    expect((await cancelActionPlan(ctx.orgPlan, "x")).error).toBe("No encontramos el plan");
    expect((await releaseSurveyResults(ctx.surveyA)).error).toBe("No encontramos la encuesta");
  });

  it("reports storage as unavailable rather than failing when it isn't configured", async () => {
    asAdmin();
    const fd = new FormData();
    fd.append("file", new File(["%PDF-1.4"], "acta.pdf", { type: "application/pdf" }));
    const res = await uploadTaskEvidence(ctx.linaTask1, fd);
    // Plan is completed → closed; uploads to closed plans are rejected first
    expect(res.error).toBe("Este plan está cerrado");
    const exe = new FormData();
    exe.append("file", new File(["MZ"], "virus.exe", { type: "application/x-msdownload" }));
    const orgTask = (await getPlanDetail(ctx.orgPlan, ctx.companyId))!.tasks[0];
    expect((await uploadTaskEvidence(orgTask.id, exe)).error).toBe("Solo se permiten archivos PNG, JPG, WEBP o PDF");
    const big = new FormData();
    big.append("file", new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" }));
    expect((await uploadTaskEvidence(orgTask.id, big)).error).toBe("Los archivos pueden pesar máximo 10 MB");
    expect((await uploadTaskEvidence(orgTask.id, fd)).error).toBe("El almacenamiento de archivos no está configurado");
  });

  // =========================================================================
  // 6. Reminders
  // =========================================================================

  it("sends task reminders at most once a day and the deadline nudge once", async () => {
    asPortal(ctx.marco);
    const plan = await createActionPlan({
      surveyId: ctx.surveyA,
      dimensionId: ctx.dims.LID,
      scope: "LEADER",
      scopeRefId: ctx.marco.id,
      title: "Liderazgo cercano",
      objective: "Subir Liderazgo a Favorable",
      startDate: dateIn(0),
      endDate: dateIn(45),
    });
    ctx.marcoPlan = plan.data!.id;
    await addActionPlanTask(ctx.marcoPlan, { title: "1:1 quincenales", ownerEmployeeId: ctx.marcoTeam[0].id, dueDate: dateIn(1) });
    // Draft plans don't get task reminders; Marco stays below his minimum

    // Active team plan: one task due in 2 days, one overdue
    asAdmin();
    await addActionPlanTask(ctx.teamPlan, { title: "Acordar normas del equipo", ownerEmployeeId: ctx.marcoTeam[1].id, dueDate: dateIn(2) });
    await addActionPlanTask(ctx.teamPlan, { title: "Encuesta rápida al equipo", ownerEmployeeId: ctx.marcoTeam[1].id, dueDate: dateIn(-3) });

    state.emails = [];
    const first = await sendTaskReminders();
    expect(emailsTo(ctx.marcoTeam[0].email)).toHaveLength(0); // draft plan
    const digest = emailsTo(ctx.marcoTeam[1].email);
    expect(digest).toHaveLength(1); // one digest for both tasks
    expect(digest[0].subject).toContain("por vencer");
    expect(first.tasks).toBe(2);
    const second = await sendTaskReminders();
    expect(second.emails).toBe(0);

    await prisma.climateSurvey.update({ where: { id: ctx.surveyA }, data: { planDueDate: new Date(Date.now() + 2 * DAY), planReminderSentAt: null } });
    state.emails = [];
    // Never before the leaders' results email (Modelo 1), which goes out at the close
    expect((await sendPlanDeadlineReminders()).emails).toBe(0);
    await prisma.climateSurvey.update({ where: { id: ctx.surveyA }, data: { resultsEmailedAt: new Date() } });
    const nudge = await sendPlanDeadlineReminders();
    expect(emailsTo(ctx.marco.email).some((e) => e.subject.startsWith("Recordatorio: tu plan de acción"))).toBe(true);
    expect(emailsTo(ctx.lina.email)).toHaveLength(0); // Lina met her minimum
    expect(nudge.emails).toBeGreaterThanOrEqual(1);
    expect((await sendPlanDeadlineReminders()).emails).toBe(0);
    // Undone, so the close below sends the results email
    await prisma.climateSurvey.update({ where: { id: ctx.surveyA }, data: { resultsEmailedAt: null } });
  });

  // =========================================================================
  // 7. Follow-up survey and impact
  // =========================================================================

  it("evaluates plan impact when a follow-up survey closes", async () => {
    asAdmin();
    state.emails = [];
    expect((await closeSurvey(ctx.surveyA)).success).toBe(true);
    // Results were released earlier: the leaders get their email at the close.
    // Lina (CVI, SPS) and Marco (LID) get their results; Nora's team is suppressed
    expect(emailsTo(ctx.lina.email).filter((e) => e.subject.includes("Ya puedes ver los resultados de tu equipo"))).toHaveLength(1);
    expect(emailsTo(ctx.marco.email).filter((e) => e.subject.includes("Ya puedes ver los resultados de tu equipo"))).toHaveLength(1);
    expect(emailsTo(ctx.nora.email)).toHaveLength(0);
    expect((await prisma.climateSurvey.findUniqueOrThrow({ where: { id: ctx.surveyA } })).resultsEmailedAt).not.toBeNull();

    const res = await createClimateSurvey({ name: `Pulso ${RUN}`, type: "CLIMATE", anonymityThreshold: 5, questions: instrumentQuestions(DIMS) });
    ctx.surveyB = res.data!.id;
    expect((await distributeSurvey({ surveyId: ctx.surveyB, targetType: "ALL", dueDate: new Date(Date.now() + 7 * DAY) })).success).toBe(true);

    // Lina's team improves Calidad de vida (half answer 4, half 3)
    for (const [i, p] of ctx.linaTeam.entries()) await respond(ctx.surveyB, p, { LID: 4, CVI: i < 3 ? 4 : 3, SPS: 3 });
    for (const p of ctx.marcoTeam) await respond(ctx.surveyB, p, { LID: 3, CVI: 4, SPS: 4 });
    // Nora's team doesn't answer this time

    state.emails = [];
    asAdmin();
    expect((await closeSurvey(ctx.surveyB)).success).toBe(true);

    const lina = (await getPlanDetail(ctx.linaPlan, ctx.companyId))!;
    // The employee moved to Marco now answers as Marco's report, so Lina has 5
    const outcome = lina.measures.find((m) => m.kind === "OUTCOME")!;
    expect(outcome.followUpSurveyId).toBe(ctx.surveyB);
    expect(outcome.resultN).toBe(5);
    expect(outcome.resultMean).toBeCloseTo(3.6, 5); // (3×4 + 2×3) / 5
    expect(outcome.resultBand).toBe("MUY_FAVORABLE");
    expect(lina.impact).toBe("IMPROVED");
    expect(emailsTo(ctx.lina.email).some((e) => e.subject.includes("Impacto del plan"))).toBe(true);

    const org = (await getPlanDetail(ctx.orgPlan, ctx.companyId))!;
    expect(org.impact).toBe("IMPROVED"); // org CVI 2.71 → (21 + 24) / 12 = 3.75
    const team = (await getPlanDetail(ctx.teamPlan, ctx.companyId))!;
    expect(team.impact).toBe("UNCHANGED"); // Equipo Norte SPS 3.4 → 3.4
    const dept = (await getPlanDetail(ctx.deptPlan, ctx.companyId))!;
    expect(dept.impact).toBeNull(); // cancelled plans aren't evaluated

    // Draft plans aren't evaluated either
    expect((await getPlanDetail(ctx.marcoPlan, ctx.companyId))!.impact).toBeNull();

    // Re-running for the same follow-up is idempotent and doesn't re-send emails
    state.emails = [];
    const again = await evaluateSurveyImpact(ctx.surveyB);
    expect(again.success).toBe(true);
    expect(again.data!.evaluated).toBeGreaterThanOrEqual(2);
    expect(state.emails.filter((e) => e.subject.includes("Impacto del plan"))).toHaveLength(0);
    const overview = (await getSurveyPlansOverview(ctx.surveyA, ctx.companyId))!;
    expect(overview.impactSummary.IMPROVED).toBeGreaterThanOrEqual(2);
  });
});
