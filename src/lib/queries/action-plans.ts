// Read models and internal engine for climate action plans (spec §4).
// Not a "use server" module: nothing here is callable from the browser.
// Callers (pages, actions) are responsible for permission checks.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { emailEmployeeViaPortal, planEmails, safely } from "@/lib/email/climate-plan-emails";
import type { SegmentScope } from "@/lib/utils/climate-segments";
import { businessDay } from "@/lib/constants/business-time";
import { Prisma, type ActionPlanScope, type ActionPlanStatus, type ActionTaskStatus } from "@prisma/client";
import {
  loadSurveyForScoring,
  scoreScope,
  type DimensionResult,
  type ScoringSurvey,
} from "@/lib/queries/climate-reports";
import { getQuestionScale, type ScaleKey } from "@/lib/constants/climate-scales";
import { getInstrumentItemCode } from "@/lib/constants/climate-instrument";
import {
  classifyImpact,
  findGaps,
  type ClimateBand,
  type ImpactResult,
  type IndexScore,
} from "@/lib/utils/climate-scoring";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const OPEN_PLAN_STATUSES: ActionPlanStatus[] = ["DRAFT", "ACTIVE"];
export const SUBMITTED_PLAN_STATUSES: ActionPlanStatus[] = ["ACTIVE", "COMPLETED"];
const CLOSED_TASK_STATUSES: ActionTaskStatus[] = ["DONE", "CANCELLED"];

/**
 * Due dates are calendar days (stored as UTC midnight from a date input), so
 * compare them with today's date in the business time zone: a task due today
 * is never overdue, whatever time zone the server runs in.
 */
export function isTaskOverdue(task: { dueDate: Date; status: ActionTaskStatus }, now = new Date()): boolean {
  if (CLOSED_TASK_STATUSES.includes(task.status)) return false;
  return new Date(task.dueDate).toISOString().slice(0, 10) < businessDay(now);
}

/**
 * A plan made with the leader view's one-action form: its title, objective
 * and only open task share one text, as createSingleActionPlan writes them.
 * That form edits all three at once, so a plan whose texts differ (one
 * written in the full editor) is never edited through it and loses nothing.
 */
export function isSingleActionPlan(plan: {
  title: string;
  objective: string;
  tasks: { title: string; status: ActionTaskStatus }[];
}): boolean {
  const open = plan.tasks.filter((t) => t.status !== "CANCELLED");
  return open.length === 1 && open[0].title === plan.title && plan.objective === plan.title;
}

export function planProgress(tasks: { status: ActionTaskStatus }[]) {
  const counted = tasks.filter((t) => t.status !== "CANCELLED");
  const done = counted.filter((t) => t.status === "DONE").length;
  return { done, total: counted.length, pct: counted.length ? Math.round((done / counted.length) * 100) : 0 };
}

/** Impact of a plan from its OUTCOME measure: null while waiting for a follow-up survey. */
export function planImpact(
  baselineBand: ClimateBand,
  outcome: { evaluatedAt: Date | null; resultBand: ClimateBand | null } | undefined,
): ImpactResult | null {
  if (!outcome?.evaluatedAt) return null;
  return classifyImpact(baselineBand, outcome.resultBand);
}

/** Display name of a plan's scope (leader, department, …). */
export async function resolveScopeName(
  companyId: string,
  scope: ActionPlanScope,
  scopeRefId: string | null,
): Promise<string | null> {
  if (!scopeRefId) return null;
  switch (scope) {
    case "LEADER":
      return (await prisma.employee.findFirst({ where: { id: scopeRefId, companyId }, select: { name: true } }))?.name ?? null;
    case "DEPARTMENT":
      return (await prisma.department.findFirst({ where: { id: scopeRefId, companyId }, select: { name: true } }))?.name ?? null;
    case "HUB":
      return (await prisma.hub.findFirst({ where: { id: scopeRefId, companyId }, select: { name: true } }))?.name ?? null;
    case "TEAM":
      return (await prisma.team.findFirst({ where: { id: scopeRefId, companyId }, select: { name: true } }))?.name ?? null;
    default:
      return null;
  }
}

/** Leaders (managers at submission) that have respondents in a survey. */
export function leaderIdsOf(survey: ScoringSurvey): string[] {
  return [...new Set(survey.responses.map((r) => r.segments.leaderEmployeeId).filter((x): x is string => !!x))];
}

// ---------------------------------------------------------------------------
// Leader gaps
// ---------------------------------------------------------------------------

export interface LeaderGaps {
  leaderEmployeeId: string;
  respondents: number;
  suppressed: boolean;
  index: IndexScore | null;
  dimensions: DimensionResult[];
  gaps: DimensionResult[];
  /** Plans the leader must submit: min(planMinPerLeader, number of gaps). */
  required: number;
}

export function leaderGaps(survey: ScoringSurvey, leaderEmployeeId: string, planMinPerLeader: number): LeaderGaps {
  const { score, dimensions } = scoreScope(survey, "LEADER", leaderEmployeeId);
  const gaps = score.suppressed ? [] : (findGaps(dimensions, survey.goalPct) as DimensionResult[]);
  return {
    leaderEmployeeId,
    respondents: score.respondents,
    suppressed: score.suppressed,
    index: score.index,
    dimensions,
    gaps,
    required: Math.min(planMinPerLeader, gaps.length),
  };
}

// ---------------------------------------------------------------------------
// Leader view (portal)
// ---------------------------------------------------------------------------

export interface LeaderItemResult {
  questionId: string;
  text: string;
  itemCode: string | null;
  dimensionId: string | null;
  scaleKey: ScaleKey | null;
  mean: number | null;
  favorability: number | null;
  distribution: Record<number, number>;
}

export interface LeaderPlanSummary {
  id: string;
  title: string;
  dimensionId: string;
  dimensionName: string;
  status: ActionPlanStatus;
  baselineBand: ClimateBand;
  targetBand: ClimateBand;
  startDate: Date;
  endDate: Date;
  progress: { done: number; total: number; pct: number };
  impact: ImpactResult | null;
  /** The plan's first open task: the "action" of a single-action plan. */
  action: {
    taskId: string;
    status: ActionTaskStatus;
    evidence: { id: string; fileName: string; uploadedByEmployeeId: string | null }[];
  } | null;
  taskCount: number;
  /** Edited through the one-action form (see isSingleActionPlan). */
  isSingleAction: boolean;
}

export interface LeaderTeamView {
  survey: {
    id: string;
    name: string;
    /** Survey goal: % of favorable answers */
    goalPct: number;
    planMinPerLeader: number;
    planDueDate: Date | null;
    anonymityThreshold: number;
    /** Null only when an admin opens a leader before results are released. */
    releasedAt: Date | null;
  };
  leader: { id: string; name: string; department: string | null };
  gaps: LeaderGaps;
  items: LeaderItemResult[];
  plans: LeaderPlanSummary[];
  submittedOnGaps: number;
  context: Record<string, string> | null;
}

export async function getLeaderTeamView(
  surveyId: string,
  leaderEmployeeId: string,
  companyId: string,
  /** Admins may look at a leader before results are released to leaders. */
  opts: { requireRelease?: boolean } = {},
): Promise<LeaderTeamView | null> {
  const requireRelease = opts.requireRelease ?? true;
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: { resultsReleasedAt: true, planMinPerLeader: true, planDueDate: true, instrumentVersion: true },
  });
  if (!meta?.instrumentVersion || (requireRelease && !meta.resultsReleasedAt)) return null;

  const survey = await loadSurveyForScoring(surveyId, companyId);
  if (!survey) return null;
  const gaps = leaderGaps(survey, leaderEmployeeId, meta.planMinPerLeader);
  if (gaps.respondents === 0) return null; // not this survey's leader

  const { score } = scoreScope(survey, "LEADER", leaderEmployeeId);
  const items: LeaderItemResult[] = gaps.suppressed
    ? []
    : score.items
        .filter((i) => i.scaleKey !== "NPS_11")
        .map((i) => {
          const q = survey.questions.find((x) => x.id === i.questionId)!;
          return {
            questionId: i.questionId,
            text: q.text,
            itemCode: getInstrumentItemCode(q.config),
            dimensionId: q.dimensionId,
            scaleKey: getQuestionScale(q)?.key ?? null,
            mean: i.mean,
            favorability: i.favorability,
            distribution: i.distribution,
          };
        });

  const [plans, context, leader] = await Promise.all([
    prisma.actionPlan.findMany({
      where: { surveyId, scope: "LEADER", scopeRefId: leaderEmployeeId, status: { not: "CANCELLED" } },
      include: {
        dimension: { select: { name: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            evidence: { select: { id: true, fileName: true, uploadedByEmployeeId: true }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        measures: { where: { kind: "OUTCOME" }, select: { evaluatedAt: true, resultBand: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaderSurveyContext.findUnique({
      where: { surveyId_leaderEmployeeId: { surveyId, leaderEmployeeId } },
      select: { answers: true },
    }),
    prisma.employee.findFirst({
      where: { id: leaderEmployeeId, companyId },
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
  ]);
  if (!leader) return null;

  const gapIds = new Set(gaps.gaps.map((g) => g.dimensionId));
  return {
    survey: {
      id: survey.id,
      name: survey.name,
      goalPct: survey.goalPct,
      planMinPerLeader: meta.planMinPerLeader,
      planDueDate: meta.planDueDate,
      anonymityThreshold: survey.anonymityThreshold,
      releasedAt: meta.resultsReleasedAt,
    },
    leader: { id: leader.id, name: leader.name, department: leader.department?.name ?? null },
    gaps,
    items,
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      dimensionId: p.dimensionId,
      dimensionName: p.dimension.name,
      status: p.status,
      baselineBand: p.baselineBand as ClimateBand,
      targetBand: p.targetBand as ClimateBand,
      startDate: p.startDate,
      endDate: p.endDate,
      progress: planProgress(p.tasks),
      impact: planImpact(p.baselineBand as ClimateBand, p.measures[0] as never),
      action: (() => {
        const task = p.tasks.find((t) => t.status !== "CANCELLED");
        return task ? { taskId: task.id, status: task.status, evidence: task.evidence } : null;
      })(),
      taskCount: p.tasks.filter((t) => t.status !== "CANCELLED").length,
      isSingleAction: isSingleActionPlan(p),
    })),
    submittedOnGaps: plans.filter((p) => SUBMITTED_PLAN_STATUSES.includes(p.status) && gapIds.has(p.dimensionId)).length,
    context: (context?.answers as Record<string, string> | undefined) ?? null,
  };
}

/** Instrument surveys that have been sent: the ones with leaders to look at. */
export async function listPlanSurveys(companyId: string) {
  return prisma.climateSurvey.findMany({
    where: { companyId, instrumentVersion: { not: null }, status: { in: ["ACTIVE", "CLOSED"] } },
    select: { id: true, name: true, status: true, resultsReleasedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface SurveyLeaderRow {
  leaderEmployeeId: string;
  name: string;
  department: string | null;
  respondents: number;
  suppressed: boolean;
  indexMean: number | null;
  indexBand: ClimateBand | null;
  gapCount: number;
  required: number;
  planCount: number;
}

/**
 * Leaders of a survey (managers of its respondents) with their gaps and plans,
 * most gaps first. `onlyLeaderId` limits it to one leader (a leader's own view).
 */
export async function getSurveyLeaders(surveyId: string, companyId: string, opts: { onlyLeaderId?: string } = {}) {
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId, instrumentVersion: { not: null } },
    select: { id: true, name: true, goalPct: true, planMinPerLeader: true, resultsReleasedAt: true, status: true },
  });
  if (!meta) return null;
  const survey = await loadSurveyForScoring(surveyId, companyId);
  if (!survey) return null;

  const ids = leaderIdsOf(survey).filter((id) => !opts.onlyLeaderId || id === opts.onlyLeaderId);
  const [employees, planCounts] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, id: { in: ids } },
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
    prisma.actionPlan.groupBy({
      by: ["scopeRefId"],
      where: { surveyId, scope: "LEADER", scopeRefId: { in: ids }, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
  ]);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const plansBy = new Map(planCounts.map((p) => [p.scopeRefId, p._count._all]));

  const leaders: SurveyLeaderRow[] = ids
    .map((id) => {
      const g = leaderGaps(survey, id, meta.planMinPerLeader);
      const { score } = scoreScope(survey, "LEADER", id);
      const employee = byId.get(id);
      return {
        leaderEmployeeId: id,
        name: employee?.name ?? "—",
        department: employee?.department?.name ?? null,
        respondents: g.respondents,
        suppressed: g.suppressed,
        indexMean: g.suppressed ? null : (score.index?.mean ?? null),
        indexBand: g.suppressed ? null : ((score.index?.band as ClimateBand | undefined) ?? null),
        gapCount: g.gaps.length,
        required: g.required,
        planCount: plansBy.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.gapCount - a.gapCount || a.name.localeCompare(b.name));

  return { survey: { ...meta, anonymityThreshold: survey.anonymityThreshold }, leaders };
}

export type SurveyLeaders = NonNullable<Awaited<ReturnType<typeof getSurveyLeaders>>>;

/** Released instrument surveys where the employee leads at least one respondent. */
export async function listLeaderSurveys(employeeId: string, companyId: string) {
  const surveys = await prisma.climateSurvey.findMany({
    where: { companyId, resultsReleasedAt: { not: null }, instrumentVersion: { not: null } },
    select: { id: true, planMinPerLeader: true, planDueDate: true, resultsReleasedAt: true },
    orderBy: { resultsReleasedAt: "desc" },
  });
  const out = [];
  for (const s of surveys) {
    // Cheap check before loading every response: does this employee lead
    // anyone who answered? (snapshot first, live manager for older responses)
    const leads = await prisma.surveyResponse.count({
      where: {
        isComplete: true,
        distribution: { surveyId: s.id },
        OR: [
          { segmentSnapshot: { path: ["leaderEmployeeId"], equals: employeeId } },
          { segmentSnapshot: { equals: Prisma.DbNull }, employee: { managerId: employeeId } },
        ],
      },
    });
    if (leads === 0) continue;
    const survey = await loadSurveyForScoring(s.id, companyId);
    if (!survey) continue;
    const g = leaderGaps(survey, employeeId, s.planMinPerLeader);
    if (g.respondents === 0) continue;
    const submitted = await prisma.actionPlan.count({
      where: {
        surveyId: s.id,
        scope: "LEADER",
        scopeRefId: employeeId,
        status: { in: SUBMITTED_PLAN_STATUSES },
        dimensionId: { in: g.gaps.map((x) => x.dimensionId) },
      },
    });
    out.push({
      surveyId: s.id,
      name: survey.name,
      releasedAt: s.resultsReleasedAt!,
      planDueDate: s.planDueDate,
      respondents: g.respondents,
      suppressed: g.suppressed,
      gapCount: g.gaps.length,
      required: g.required,
      submitted,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Plan detail
// ---------------------------------------------------------------------------

export async function getPlanDetail(planId: string, companyId: string) {
  const plan = await prisma.actionPlan.findFirst({
    where: { id: planId, companyId },
    include: {
      survey: { select: { id: true, name: true, goalPct: true, followUpUserIds: true } },
      dimension: { select: { id: true, name: true, code: true } },
      owner: { select: { id: true, name: true, email: true } },
      tasks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          owner: { select: { id: true, name: true } },
          evidence: { orderBy: { createdAt: "asc" } },
        },
      },
      measures: { orderBy: [{ kind: "asc" }, { createdAt: "asc" }] },
      updates: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!plan) return null;
  const scopeName = await resolveScopeName(companyId, plan.scope, plan.scopeRefId);
  const outcome = plan.measures.find((m) => m.kind === "OUTCOME");
  return {
    ...plan,
    tasks: plan.tasks.map((t) => ({ ...t, overdue: isTaskOverdue(t) })),
    scopeName,
    progress: planProgress(plan.tasks),
    overdueTasks: plan.tasks.filter((t) => isTaskOverdue(t)).length,
    impact: planImpact(plan.baselineBand as ClimateBand, outcome as never),
  };
}

export type PlanDetail = NonNullable<Awaited<ReturnType<typeof getPlanDetail>>>;

// ---------------------------------------------------------------------------
// Employee lists
// ---------------------------------------------------------------------------

export async function getMyTasks(employeeId: string, companyId: string) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { ownerEmployeeId: employeeId, plan: { companyId, status: "ACTIVE" } },
    include: {
      plan: { select: { id: true, title: true, survey: { select: { name: true } }, dimension: { select: { name: true } } } },
      _count: { select: { evidence: true } },
    },
    orderBy: [{ dueDate: "asc" }],
  });
  return tasks.map((t) => ({ ...t, overdue: isTaskOverdue(t) }));
}

export async function getMyPlans(employeeId: string, companyId: string) {
  const plans = await prisma.actionPlan.findMany({
    where: { ownerEmployeeId: employeeId, companyId, status: { not: "CANCELLED" } },
    include: {
      survey: { select: { name: true } },
      dimension: { select: { name: true } },
      tasks: { select: { status: true, dueDate: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return plans.map((p) => ({
    ...p,
    progress: planProgress(p.tasks),
    overdueTasks: p.tasks.filter((t) => isTaskOverdue(t)).length,
  }));
}

// ---------------------------------------------------------------------------
// Admin overview (per survey)
// ---------------------------------------------------------------------------

export interface LeaderCompliance {
  leaderEmployeeId: string;
  name: string;
  respondents: number;
  suppressed: boolean;
  gapNames: string[];
  required: number;
  submitted: number;
  drafts: number;
  meetsMinimum: boolean;
}

const planRowInclude = {
  dimension: { select: { name: true } },
  owner: { select: { name: true } },
  tasks: { select: { status: true, dueDate: true } },
  measures: { where: { kind: "OUTCOME" as const }, select: { evaluatedAt: true, resultBand: true, resultMean: true } },
  survey: { select: { id: true, name: true } },
} satisfies Prisma.ActionPlanInclude;

type PlanWithRowData = Prisma.ActionPlanGetPayload<{ include: typeof planRowInclude }>;

/** One table row per plan: scope name, progress, overdue tasks and impact. */
async function toPlanRows(plans: PlanWithRowData[], companyId: string) {
  // One lookup per distinct scope, run together
  const scopes = new Map<string, Pick<PlanWithRowData, "scope" | "scopeRefId">>();
  for (const p of plans) scopes.set(`${p.scope}:${p.scopeRefId}`, p);
  const scopeNames = new Map(
    await Promise.all(
      [...scopes].map(async ([key, p]) => [key, await resolveScopeName(companyId, p.scope, p.scopeRefId)] as const),
    ),
  );
  return plans.map((p) => ({
    id: p.id,
    title: p.title,
    surveyId: p.survey.id,
    surveyName: p.survey.name,
    scope: p.scope,
    scopeName: scopeNames.get(`${p.scope}:${p.scopeRefId}`) ?? null,
    dimensionId: p.dimensionId,
    dimensionName: p.dimension.name,
    ownerName: p.owner.name,
    status: p.status,
    baselineBand: p.baselineBand as ClimateBand,
    baselineMean: p.baselineMean,
    targetBand: p.targetBand as ClimateBand,
    endDate: p.endDate,
    progress: planProgress(p.tasks),
    overdueTasks: p.tasks.filter((t) => isTaskOverdue(t)).length,
    impact: planImpact(p.baselineBand as ClimateBand, p.measures[0] as never),
    resultMean: p.measures[0]?.resultMean ?? null,
  }));
}

export type PlanRow = Awaited<ReturnType<typeof toPlanRows>>[number];

function impactSummaryOf(rows: PlanRow[]) {
  const summary = { IMPROVED: 0, UNCHANGED: 0, WORSENED: 0, NOT_EVALUABLE: 0, PENDING: 0 };
  for (const p of rows) {
    if (!SUBMITTED_PLAN_STATUSES.includes(p.status)) continue;
    summary[p.impact ?? "PENDING"]++;
  }
  return summary;
}

export async function getSurveyPlansOverview(surveyId: string, companyId: string) {
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: {
      id: true,
      status: true,
      instrumentVersion: true,
      resultsReleasedAt: true,
      resultsEmailedAt: true,
      goalPct: true,
      planMinPerLeader: true,
      planDueDate: true,
      followUpUserIds: true,
      anonymityThreshold: true,
    },
  });
  if (!meta) return null;

  const [survey, plans] = await Promise.all([
    loadSurveyForScoring(surveyId, companyId),
    prisma.actionPlan.findMany({
      where: { surveyId, companyId },
      include: planRowInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!survey) return null;

  const leaderIds = leaderIdsOf(survey);
  const leaderNames = new Map(
    (
      await prisma.employee.findMany({ where: { companyId, id: { in: leaderIds } }, select: { id: true, name: true } })
    ).map((e) => [e.id, e.name]),
  );

  const leaders: LeaderCompliance[] = leaderIds
    .map((id) => {
      const g = leaderGaps(survey, id, meta.planMinPerLeader);
      const gapIds = new Set(g.gaps.map((x) => x.dimensionId));
      const mine = plans.filter((p) => p.scope === "LEADER" && p.scopeRefId === id);
      const submitted = mine.filter((p) => SUBMITTED_PLAN_STATUSES.includes(p.status) && gapIds.has(p.dimensionId)).length;
      return {
        leaderEmployeeId: id,
        name: leaderNames.get(id) ?? "—",
        respondents: g.respondents,
        suppressed: g.suppressed,
        gapNames: g.gaps.map((x) => x.dimensionName),
        required: g.required,
        submitted,
        drafts: mine.filter((p) => p.status === "DRAFT").length,
        meetsMinimum: submitted >= g.required,
      };
    })
    .sort((a, b) => Number(a.meetsMinimum) - Number(b.meetsMinimum) || b.gapNames.length - a.gapNames.length || a.name.localeCompare(b.name));

  const planRows = await toPlanRows(plans, companyId);

  return {
    survey: { ...meta, name: survey.name, isInstrument: !!meta.instrumentVersion },
    leaders,
    plans: planRows,
    impactSummary: impactSummaryOf(planRows),
  };
}

export type SurveyPlansOverview = NonNullable<Awaited<ReturnType<typeof getSurveyPlansOverview>>>;


// ---------------------------------------------------------------------------
// Impact evaluation (spec §4.4)
// ---------------------------------------------------------------------------

export interface EvaluatedOutcome {
  planId: string;
  planTitle: string;
  ownerEmployeeId: string;
  impact: ImpactResult;
  /** First evaluation, a different follow-up, or a different result. */
  changed: boolean;
}

/**
 * Evaluate the OUTCOME measure of every submitted plan from an earlier survey
 * of the same instrument version, using `followUpSurveyId`'s results for the
 * plan's scope and dimension. Re-running for the same follow-up refreshes
 * the result; plans already evaluated against another survey are left alone.
 */
export async function evaluatePlanOutcomes(followUpSurveyId: string, companyId: string): Promise<EvaluatedOutcome[]> {
  const followMeta = await prisma.climateSurvey.findFirst({
    where: { id: followUpSurveyId, companyId },
    select: { id: true, createdAt: true, instrumentVersion: true },
  });
  if (!followMeta?.instrumentVersion) return [];

  const plans = await prisma.actionPlan.findMany({
    where: {
      companyId,
      status: { in: SUBMITTED_PLAN_STATUSES },
      surveyId: { not: followUpSurveyId },
      survey: { instrumentVersion: followMeta.instrumentVersion, createdAt: { lt: followMeta.createdAt } },
      measures: {
        some: { kind: "OUTCOME", OR: [{ evaluatedAt: null }, { followUpSurveyId }] },
      },
    },
    include: { measures: { where: { kind: "OUTCOME" } } },
  });
  if (plans.length === 0) return [];

  const followUp = await loadSurveyForScoring(followUpSurveyId, companyId);
  if (!followUp) return [];
  const dimensionsInFollowUp = new Set(followUp.questions.map((q) => q.dimensionId).filter(Boolean));

  const results: EvaluatedOutcome[] = [];
  for (const plan of plans) {
    // A follow-up that didn't measure the dimension can't evaluate the plan; wait for one that does.
    if (!dimensionsInFollowUp.has(plan.dimensionId)) continue;
    const measure = plan.measures[0];
    if (!measure) continue;
    if (measure.evaluatedAt && measure.followUpSurveyId && measure.followUpSurveyId !== followUpSurveyId) continue;

    const { score, dimensions } = scoreScope(followUp, plan.scope as SegmentScope, plan.scopeRefId);
    const dim = score.suppressed ? undefined : dimensions.find((d) => d.dimensionId === plan.dimensionId);
    const evaluable = dim?.mean != null && dim.band != null;
    const resultBand = evaluable ? (dim!.band as ClimateBand) : null;
    const changed =
      !measure.evaluatedAt || measure.followUpSurveyId !== followUpSurveyId || measure.resultBand !== resultBand;

    await prisma.actionPlanMeasure.update({
      where: { id: measure.id },
      data: {
        followUpSurveyId,
        evaluatedAt: new Date(),
        resultMean: evaluable ? dim!.mean : null,
        resultFavorability: evaluable ? dim!.favorability : null,
        resultBand: evaluable ? dim!.band : null,
        resultN: score.respondents,
        currentValue: evaluable ? dim!.mean : null,
      },
    });
    results.push({
      planId: plan.id,
      planTitle: plan.title,
      ownerEmployeeId: plan.ownerEmployeeId,
      impact: classifyImpact(plan.baselineBand as ClimateBand, resultBand),
      changed,
    });
  }
  return results;
}

const IMPACT_LABELS: Record<ImpactResult, { es: string; en: string }> = {
  IMPROVED: { es: "Mejoró", en: "Improved" },
  UNCHANGED: { es: "Sin cambio de nivel", en: "No level change" },
  WORSENED: { es: "Empeoró", en: "Worsened" },
  NOT_EVALUABLE: { es: "No evaluable", en: "Not evaluable" },
};

/**
 * Evaluate plans against a follow-up survey and email each plan owner whose
 * result is new or changed (re-running never re-sends the same result).
 * Used by the admin "evaluate impact" action and by survey closing;
 * callers check permissions.
 */
export async function evaluateAndNotifyPlanOutcomes(surveyId: string, companyId: string): Promise<number> {
  const results = await evaluatePlanOutcomes(surveyId, companyId);
  if (results.length === 0) return 0;
  const surveyName =
    (await prisma.climateSurvey.findFirst({ where: { id: surveyId, companyId }, select: { name: true } }))?.name ?? "";
  for (const r of results) {
    if (r.changed) {
      await safely("impact email", () =>
        emailEmployeeViaPortal(r.ownerEmployeeId, `/portal/climate-plans/${r.planId}`, (locale) =>
          planEmails.impactEvaluated(r.planTitle, surveyName, IMPACT_LABELS[r.impact][locale === "en" ? "en" : "es"])(locale),
        ),
      );
    }
    revalidatePath(`/portal/climate-plans/${r.planId}`);
  }
  return results.length;
}
