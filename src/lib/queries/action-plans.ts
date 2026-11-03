// Read models and internal engine for climate action plans (spec §4).
// Not a "use server" module: nothing here is callable from the browser.
// Callers (pages, actions) are responsible for permission checks.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { emailEmployeeViaPortal, planEmails, safely } from "@/lib/email/climate-plan-emails";
import type { SegmentScope } from "@/lib/utils/climate-segments";
import type { ActionPlanScope, ActionPlanStatus, ActionTaskStatus } from "@prisma/client";
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

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isTaskOverdue(task: { dueDate: Date; status: ActionTaskStatus }, now = new Date()): boolean {
  return !CLOSED_TASK_STATUSES.includes(task.status) && task.dueDate < startOfToday(now);
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
  const gaps = score.suppressed ? [] : (findGaps(dimensions, survey.goalBand) as DimensionResult[]);
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
  endDate: Date;
  progress: { done: number; total: number; pct: number };
  impact: ImpactResult | null;
}

export interface LeaderTeamView {
  survey: {
    id: string;
    name: string;
    goalBand: ClimateBand;
    planMinPerLeader: number;
    planDueDate: Date | null;
    anonymityThreshold: number;
    releasedAt: Date;
  };
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
): Promise<LeaderTeamView | null> {
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: { resultsReleasedAt: true, planMinPerLeader: true, planDueDate: true, instrumentVersion: true },
  });
  if (!meta?.resultsReleasedAt || !meta.instrumentVersion) return null;

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

  const [plans, context] = await Promise.all([
    prisma.actionPlan.findMany({
      where: { surveyId, scope: "LEADER", scopeRefId: leaderEmployeeId, status: { not: "CANCELLED" } },
      include: {
        dimension: { select: { name: true } },
        tasks: { select: { status: true } },
        measures: { where: { kind: "OUTCOME" }, select: { evaluatedAt: true, resultBand: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaderSurveyContext.findUnique({
      where: { surveyId_leaderEmployeeId: { surveyId, leaderEmployeeId } },
      select: { answers: true },
    }),
  ]);

  const gapIds = new Set(gaps.gaps.map((g) => g.dimensionId));
  return {
    survey: {
      id: survey.id,
      name: survey.name,
      goalBand: survey.goalBand,
      planMinPerLeader: meta.planMinPerLeader,
      planDueDate: meta.planDueDate,
      anonymityThreshold: survey.anonymityThreshold,
      releasedAt: meta.resultsReleasedAt,
    },
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
      endDate: p.endDate,
      progress: planProgress(p.tasks),
      impact: planImpact(p.baselineBand as ClimateBand, p.measures[0] as never),
    })),
    submittedOnGaps: plans.filter((p) => SUBMITTED_PLAN_STATUSES.includes(p.status) && gapIds.has(p.dimensionId)).length,
    context: (context?.answers as Record<string, string> | undefined) ?? null,
  };
}

/** Released instrument surveys where the employee leads at least one respondent. */
export async function listLeaderSurveys(employeeId: string, companyId: string) {
  const surveys = await prisma.climateSurvey.findMany({
    where: { companyId, resultsReleasedAt: { not: null }, instrumentVersion: { not: null } },
    select: { id: true, planMinPerLeader: true, planDueDate: true, resultsReleasedAt: true },
    orderBy: { resultsReleasedAt: "desc" },
  });
  const out = [];
  for (const s of surveys) {
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
      survey: { select: { id: true, name: true, goalBand: true, followUpUserIds: true } },
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

export async function getSurveyPlansOverview(surveyId: string, companyId: string) {
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: {
      id: true,
      status: true,
      instrumentVersion: true,
      resultsReleasedAt: true,
      goalBand: true,
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
      include: {
        dimension: { select: { name: true } },
        owner: { select: { name: true } },
        tasks: { select: { status: true, dueDate: true } },
        measures: { where: { kind: "OUTCOME" }, select: { evaluatedAt: true, resultBand: true, resultMean: true } },
      },
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

  const scopeNames = new Map<string, string | null>();
  for (const p of plans) {
    const key = `${p.scope}:${p.scopeRefId}`;
    if (!scopeNames.has(key)) scopeNames.set(key, await resolveScopeName(companyId, p.scope, p.scopeRefId));
  }

  const planRows = plans.map((p) => ({
    id: p.id,
    title: p.title,
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

  const impactSummary = { IMPROVED: 0, UNCHANGED: 0, WORSENED: 0, NOT_EVALUABLE: 0, PENDING: 0 };
  for (const p of planRows) {
    if (!SUBMITTED_PLAN_STATUSES.includes(p.status)) continue;
    impactSummary[p.impact ?? "PENDING"]++;
  }

  return {
    survey: { ...meta, name: survey.name, isInstrument: !!meta.instrumentVersion },
    leaders,
    plans: planRows,
    impactSummary,
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
      impact: classifyImpact(plan.baselineBand as ClimateBand, evaluable ? (dim!.band as ClimateBand) : null),
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
 * Evaluate plans against a follow-up survey and email each plan owner the
 * result. Used by the admin "evaluate impact" action and by survey closing;
 * callers check permissions.
 */
export async function evaluateAndNotifyPlanOutcomes(surveyId: string, companyId: string): Promise<number> {
  const results = await evaluatePlanOutcomes(surveyId, companyId);
  if (results.length === 0) return 0;
  const surveyName =
    (await prisma.climateSurvey.findFirst({ where: { id: surveyId, companyId }, select: { name: true } }))?.name ?? "";
  for (const r of results) {
    await safely("impact email", () =>
      emailEmployeeViaPortal(r.ownerEmployeeId, `/portal/climate-plans/${r.planId}`, (locale) =>
        planEmails.impactEvaluated(r.planTitle, surveyName, IMPACT_LABELS[r.impact][locale === "en" ? "en" : "es"])(locale),
      ),
    );
    revalidatePath(`/portal/climate-plans/${r.planId}`);
  }
  return results.length;
}
