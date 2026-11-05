"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma, type ActionPlanScope, type ActionTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types";
import { getClimateActor, requireClimateActor, type ClimateActor } from "@/lib/auth/climate-actor";
import { loadSurveyForScoring, scoreScope } from "@/lib/queries/climate-reports";
import {
  evaluateAndNotifyPlanOutcomes,
  leaderGaps,
  leaderIdsOf,
  OPEN_PLAN_STATUSES,
  SUBMITTED_PLAN_STATUSES,
  isSingleActionPlan,
} from "@/lib/queries/action-plans";
import { bandRank, isClimateBand, nextBand, type ClimateBand } from "@/lib/utils/climate-scoring";
import { emailEmployeeViaPortal, emailUsersViaDashboard, planEmails, safely } from "@/lib/email/climate-plan-emails";
import { businessDayAsDate } from "@/lib/constants/business-time";
import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_MB } from "@/lib/constants/action-plan-evidence";
import { getTranslator } from "@/i18n/translator";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ActionPlanTaskInput {
  title: string;
  description?: string | null;
  ownerEmployeeId?: string | null;
  dueDate: string | Date;
  suggestedActionCode?: string | null;
}

export interface ProcessMeasureInput {
  name: string;
  unit?: string | null;
  baselineValue?: number | null;
  targetValue?: number | null;
  taskId?: string | null;
}

export interface CreateActionPlanInput {
  surveyId: string;
  dimensionId: string;
  scope: ActionPlanScope;
  scopeRefId?: string | null;
  ownerEmployeeId?: string | null;
  title: string;
  objective: string;
  targetBand?: ClimateBand;
  targetMean?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  tasks?: ActionPlanTaskInput[];
  measures?: Omit<ProcessMeasureInput, "taskId">[];
}

export interface UpdateActionPlanInput {
  title?: string;
  objective?: string;
  targetBand?: ClimateBand;
  targetMean?: number | null;
  startDate?: string | Date;
  endDate?: string | Date;
  ownerEmployeeId?: string;
}

const TASK_STATUSES: ActionTaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];
const MAX_TEXT = 2000;
const MAX_TITLE = 200;
const MAX_TASKS = 30;
const MAX_EVIDENCE_PER_TASK = 10;
const EVIDENCE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Message key under `climate_plans.errors`; a `field` value names a key under `errors.fields`. */
class PlanError extends Error {
  constructor(
    readonly key: string,
    readonly values: Record<string, string | number> = {},
  ) {
    super(key);
  }
}

function fail(key: string, values?: Record<string, string | number>): never {
  throw new PlanError(key, values);
}

/** Errors reach users as toasts, so they follow the actor's company language. */
async function errorTranslator() {
  let locale: string | null = null;
  try {
    const actor = await getClimateActor();
    if (actor) {
      const company = await prisma.company.findUnique({ where: { id: actor.companyId }, select: { locale: true } });
      locale = company?.locale ?? null;
    }
  } catch {
    // Fall back to the default language rather than mask the original error
  }
  return getTranslator(locale, "climate_plans.errors");
}

async function toResult(error: unknown, fallbackKey: string): Promise<{ success: false; error: string }> {
  const t = await errorTranslator();
  if (error instanceof PlanError) {
    const { field, ...values } = error.values;
    return { success: false, error: t(error.key, field ? { ...values, field: t(`fields.${field}`) } : values) };
  }
  if (error instanceof Error && error.message === "Unauthorized") return { success: false, error: t("unauthorized") };
  console.error(`[action-plans] ${fallbackKey}:`, error);
  return { success: false, error: t(fallbackKey) };
}

function parseDate(value: string | Date | null | undefined, field: string): Date {
  if (value == null || value === "") fail("required", { field });
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) fail("invalid_date", { field });
  return d;
}

function cleanText(value: string | null | undefined, field: string, max: number, required = true): string | null {
  const v = (value ?? "").trim();
  if (!v) {
    if (required) fail("required", { field });
    return null;
  }
  if (v.length > max) fail("too_long", { field });
  return v;
}

function optionalNumber(value: number | null | undefined, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fail("not_a_number", { field });
  return value;
}

function isAdmin(actor: ClimateActor) {
  return actor.kind === "admin";
}

async function assertEmployeeInCompany(employeeId: string, companyId: string, notFoundKey = "owner_not_found") {
  const e = await prisma.employee.findFirst({ where: { id: employeeId, companyId, isActive: true }, select: { id: true } });
  if (!e) fail(notFoundKey);
}

const planInclude = {
  tasks: { select: { id: true, ownerEmployeeId: true, status: true, title: true, dueDate: true } },
  survey: { select: { id: true, name: true, followUpUserIds: true } },
  dimension: { select: { name: true } },
  owner: { select: { name: true, email: true } },
} satisfies Prisma.ActionPlanInclude;

type LoadedPlan = Prisma.ActionPlanGetPayload<{ include: typeof planInclude }>;

async function loadPlan(planId: string, actor: ClimateActor): Promise<LoadedPlan> {
  const plan = await prisma.actionPlan.findFirst({ where: { id: planId, companyId: actor.companyId }, include: planInclude });
  if (!plan) fail("plan_not_found");
  return plan;
}

function canManage(actor: ClimateActor, plan: { ownerEmployeeId: string }) {
  return isAdmin(actor) || actor.employeeId === plan.ownerEmployeeId;
}

function assertCanManage(actor: ClimateActor, plan: { ownerEmployeeId: string }) {
  if (!canManage(actor, plan)) fail("cannot_edit_plan");
}

function assertOpen(plan: { status: string }) {
  if (!OPEN_PLAN_STATUSES.includes(plan.status as never)) fail("plan_closed");
}

function assertActive(plan: { status: string }) {
  if (plan.status !== "ACTIVE") fail("plan_not_active");
}

function revalidatePlan(plan: { id: string; surveyId: string }) {
  revalidatePath(`/surveys/climate/${plan.surveyId}`);
  revalidatePath(`/surveys/climate/${plan.surveyId}/plans/${plan.id}`);
  revalidatePath(`/portal/climate-plans/${plan.id}`);
  revalidatePath(`/portal/climate-results/${plan.surveyId}`);
  revalidatePath("/portal/my-tasks");
  revalidatePath("/portal/home");
}

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function notifyTaskOwner(
  task: { title: string; dueDate: Date; ownerEmployeeId: string | null },
  plan: { title: string; ownerEmployeeId: string },
) {
  if (!task.ownerEmployeeId || task.ownerEmployeeId === plan.ownerEmployeeId) return;
  await safely("task assigned email", () =>
    emailEmployeeViaPortal(
      task.ownerEmployeeId!,
      "/portal/my-tasks",
      planEmails.taskAssigned(task.title, plan.title, formatDay(task.dueDate)),
    ),
  );
}

async function logUpdate(
  actor: ClimateActor,
  data: Omit<Prisma.ActionPlanUpdateUncheckedCreateInput, "authorEmployeeId" | "authorUserId" | "authorName">,
) {
  await prisma.actionPlanUpdate.create({
    data: {
      ...data,
      authorEmployeeId: actor.employeeId,
      authorUserId: actor.userId,
      authorName: actor.name,
    },
  });
}

async function validateTasks(tasks: ActionPlanTaskInput[], companyId: string) {
  if (tasks.length > MAX_TASKS) fail("too_many_tasks", { max: MAX_TASKS });
  const out = [];
  for (const [i, t] of tasks.entries()) {
    const title = cleanText(t.title, "task_title", MAX_TITLE)!;
    const dueDate = parseDate(t.dueDate, "task_due_date");
    if (t.ownerEmployeeId) await assertEmployeeInCompany(t.ownerEmployeeId, companyId, "task_owner_not_found");
    out.push({
      title,
      description: cleanText(t.description, "task_description", MAX_TEXT, false),
      ownerEmployeeId: t.ownerEmployeeId || null,
      dueDate,
      order: i,
      suggestedActionCode: t.suggestedActionCode || null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function createActionPlan(input: CreateActionPlanInput): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireClimateActor();
    const surveyMeta = await prisma.climateSurvey.findFirst({
      where: { id: input.surveyId, companyId: actor.companyId },
      select: { id: true, instrumentVersion: true, resultsReleasedAt: true, status: true },
    });
    if (!surveyMeta) fail("survey_not_found");
    if (!surveyMeta.instrumentVersion) fail("survey_not_instrument");
    if (surveyMeta.status === "DRAFT") fail("survey_not_sent");

    const scope = input.scope;
    let scopeRefId = input.scopeRefId || null;
    let ownerEmployeeId: string;

    if (isAdmin(actor)) {
      if (scope === "ORGANIZATION") {
        scopeRefId = null;
      } else {
        if (!scopeRefId) fail("choose_group");
        const exists =
          scope === "LEADER"
            ? await prisma.employee.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
            : scope === "DEPARTMENT"
              ? await prisma.department.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
              : scope === "HUB"
                ? await prisma.hub.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
                : await prisma.team.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } });
        if (!exists) fail("group_not_found");
      }
      ownerEmployeeId = input.ownerEmployeeId || (scope === "LEADER" ? scopeRefId! : actor.employeeId ?? "");
      if (!ownerEmployeeId) fail("choose_owner");
      await assertEmployeeInCompany(ownerEmployeeId, actor.companyId);
    } else {
      // Leaders plan for their own team, once results are released
      if (scope !== "LEADER" || scopeRefId !== actor.employeeId) fail("own_team_only");
      if (!surveyMeta.resultsReleasedAt) fail("results_not_released");
      ownerEmployeeId = actor.employeeId;
    }

    const survey = await loadSurveyForScoring(input.surveyId, actor.companyId);
    if (!survey) fail("survey_not_found");
    const { score, dimensions } = scoreScope(survey, scope, scopeRefId);
    if (score.suppressed) fail("group_too_small", { threshold: survey.anonymityThreshold });
    const dim = dimensions.find((d) => d.dimensionId === input.dimensionId);
    if (!dim || dim.mean == null || !dim.band) fail("dimension_not_instrument");

    const title = cleanText(input.title, "title", MAX_TITLE)!;
    const objective = cleanText(input.objective, "objective", MAX_TEXT)!;
    const startDate = parseDate(input.startDate, "start_date");
    const endDate = parseDate(input.endDate, "end_date");
    if (startDate > endDate) fail("start_after_end");
    const targetBand = input.targetBand ?? nextBand(dim.band);
    if (!isClimateBand(targetBand)) fail("invalid_target");
    if (bandRank(targetBand) < bandRank(dim.band)) fail("target_below_current");
    const targetMean = optionalNumber(input.targetMean, "target_mean");
    if (targetMean != null && (targetMean < 1 || targetMean > 4)) fail("target_mean_range");

    const tasks = await validateTasks(input.tasks ?? [], actor.companyId);
    const measures = (input.measures ?? []).map((m) => ({
      kind: "PROCESS" as const,
      name: cleanText(m.name, "indicator_name", MAX_TITLE)!,
      unit: cleanText(m.unit, "unit", 50, false),
      baselineValue: optionalNumber(m.baselineValue, "indicator_baseline"),
      targetValue: optionalNumber(m.targetValue, "indicator_target"),
    }));

    const plan = await prisma.actionPlan.create({
      data: {
        companyId: actor.companyId,
        surveyId: survey.id,
        dimensionId: dim.dimensionId,
        scope,
        scopeRefId,
        ownerEmployeeId,
        title,
        objective,
        baselineMean: dim.mean,
        baselineFavorability: dim.favorability,
        baselineBand: dim.band,
        baselineN: score.respondents,
        targetBand,
        targetMean,
        startDate,
        endDate,
        createdByUserId: actor.userId,
        createdByEmployeeId: actor.employeeId,
        tasks: { create: tasks },
        measures: {
          create: [
            {
              kind: "OUTCOME",
              name: dim.dimensionName,
              baselineValue: dim.mean,
              targetValue: targetMean,
            },
            ...measures,
          ],
        },
      },
      select: { id: true, surveyId: true },
    });

    revalidatePlan(plan);
    return { success: true, data: { id: plan.id } };
  } catch (error) {
    return toResult(error, "failed_create_plan");
  }
}

export async function updateActionPlan(planId: string, input: UpdateActionPlanInput): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);

    const data: Prisma.ActionPlanUpdateInput = {};
    if (input.title !== undefined) data.title = cleanText(input.title, "title", MAX_TITLE)!;
    if (input.objective !== undefined) data.objective = cleanText(input.objective, "objective", MAX_TEXT)!;
    const startDate = input.startDate !== undefined ? parseDate(input.startDate, "start_date") : plan.startDate;
    const endDate = input.endDate !== undefined ? parseDate(input.endDate, "end_date") : plan.endDate;
    if (startDate > endDate) fail("start_after_end");
    data.startDate = startDate;
    data.endDate = endDate;
    if (input.targetBand !== undefined) {
      if (!isClimateBand(input.targetBand)) fail("invalid_target");
      if (bandRank(input.targetBand) < bandRank(plan.baselineBand as ClimateBand)) {
        fail("target_below_current");
      }
      data.targetBand = input.targetBand;
    }
    if (input.targetMean !== undefined) {
      const tm = optionalNumber(input.targetMean, "target_mean");
      if (tm != null && (tm < 1 || tm > 4)) fail("target_mean_range");
      data.targetMean = tm;
    }
    if (input.ownerEmployeeId !== undefined && input.ownerEmployeeId !== plan.ownerEmployeeId) {
      if (!isAdmin(actor)) fail("admin_only_owner");
      await assertEmployeeInCompany(input.ownerEmployeeId, actor.companyId);
      data.owner = { connect: { id: input.ownerEmployeeId } };
    }

    await prisma.actionPlan.update({ where: { id: plan.id }, data });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_plan");
  }
}

export async function submitActionPlan(planId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status !== "DRAFT") fail("draft_only_submit");
    if (plan.tasks.filter((t) => t.status !== "CANCELLED").length === 0) fail("needs_task");

    await prisma.actionPlan.update({ where: { id: plan.id }, data: { status: "ACTIVE", submittedAt: new Date() } });
    await logUpdate(actor, { planId: plan.id, note: "", statusFrom: "DRAFT", statusTo: "ACTIVE" });

    await safely("plan submitted email", () =>
      emailUsersViaDashboard(
        actor.companyId,
        plan.survey.followUpUserIds,
        `/surveys/climate/${plan.surveyId}/plans/${plan.id}`,
        planEmails.planSubmitted(plan.owner.name, plan.title, plan.dimension.name, plan.survey.name),
      ),
    );
    for (const task of plan.tasks) await notifyTaskOwner(task, plan);

    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_submit_plan");
  }
}

export async function completeActionPlan(planId: string, closingNote: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertActive(plan);
    const note = cleanText(closingNote, "closing_note", MAX_TEXT)!;
    const open = plan.tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
    if (open.length > 0) fail("open_tasks");
    if (!plan.tasks.some((t) => t.status === "DONE")) fail("needs_done_task");

    await prisma.actionPlan.update({
      where: { id: plan.id },
      data: { status: "COMPLETED", completedAt: new Date(), closingNote: note },
    });
    await logUpdate(actor, { planId: plan.id, note, statusFrom: "ACTIVE", statusTo: "COMPLETED" });

    // Tell HR when a leader has completed every plan for this survey
    if (plan.scope === "LEADER" && plan.scopeRefId) {
      const siblings = await prisma.actionPlan.findMany({
        where: { surveyId: plan.surveyId, scope: "LEADER", scopeRefId: plan.scopeRefId, status: { not: "CANCELLED" } },
        select: { status: true },
      });
      if (siblings.length > 0 && siblings.every((p) => p.status === "COMPLETED")) {
        await safely("leader completed email", () =>
          emailUsersViaDashboard(
            actor.companyId,
            plan.survey.followUpUserIds,
            `/surveys/climate/${plan.surveyId}?tab=plans`,
            planEmails.leaderCompleted(plan.owner.name, plan.survey.name, siblings.length),
          ),
        );
      }
    }

    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_complete_plan");
  }
}

export async function cancelActionPlan(planId: string, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("admin_only_cancel");
    const plan = await loadPlan(planId, actor);
    if (plan.status === "COMPLETED" || plan.status === "CANCELLED") fail("already_closed");
    const why = cleanText(reason, "reason", MAX_TEXT)!;
    await prisma.actionPlan.update({ where: { id: plan.id }, data: { status: "CANCELLED", cancelReason: why } });
    await logUpdate(actor, { planId: plan.id, note: why, statusFrom: plan.status, statusTo: "CANCELLED" });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_cancel_plan");
  }
}

export async function deleteActionPlan(planId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status !== "DRAFT") fail("draft_only_delete");
    await prisma.actionPlan.delete({ where: { id: plan.id } });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_delete_plan");
  }
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

async function loadTask(taskId: string, actor: ClimateActor) {
  const task = await prisma.actionPlanTask.findFirst({
    where: { id: taskId, plan: { companyId: actor.companyId } },
    include: { plan: { include: planInclude } },
  });
  if (!task) fail("task_not_found");
  return task;
}

export async function addActionPlanTask(planId: string, input: ActionPlanTaskInput): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);
    if (plan.tasks.length >= MAX_TASKS) fail("too_many_tasks", { max: MAX_TASKS });
    const [task] = await validateTasks([input], actor.companyId);
    const created = await prisma.actionPlanTask.create({
      data: { ...task, planId: plan.id, order: plan.tasks.length },
    });
    if (plan.status === "ACTIVE") await notifyTaskOwner(created, plan);
    revalidatePlan(plan);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toResult(error, "failed_add_task");
  }
}

export async function updateActionPlanTask(
  taskId: string,
  input: Partial<ActionPlanTaskInput>,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const task = await loadTask(taskId, actor);
    assertCanManage(actor, task.plan);
    assertOpen(task.plan);

    const data: Prisma.ActionPlanTaskUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = cleanText(input.title, "task_title", MAX_TITLE)!;
    if (input.description !== undefined) data.description = cleanText(input.description, "task_description", MAX_TEXT, false);
    if (input.dueDate !== undefined) data.dueDate = parseDate(input.dueDate, "task_due_date");
    let newOwner: string | null | undefined;
    if (input.ownerEmployeeId !== undefined && (input.ownerEmployeeId || null) !== task.ownerEmployeeId) {
      newOwner = input.ownerEmployeeId || null;
      if (newOwner) await assertEmployeeInCompany(newOwner, actor.companyId, "task_owner_not_found");
      data.ownerEmployeeId = newOwner;
    }
    const updated = await prisma.actionPlanTask.update({ where: { id: task.id }, data });
    if (newOwner && task.plan.status === "ACTIVE") await notifyTaskOwner(updated, task.plan);
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_task");
  }
}

export async function deleteActionPlanTask(taskId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const task = await loadTask(taskId, actor);
    assertCanManage(actor, task.plan);
    assertOpen(task.plan);
    const remaining = task.plan.tasks.filter((t) => t.id !== task.id && t.status !== "CANCELLED");
    if (task.plan.status === "ACTIVE" && remaining.length === 0) {
      fail("keep_one_task");
    }
    await prisma.actionPlanTask.delete({ where: { id: task.id } });
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_delete_task");
  }
}

export async function setActionPlanTaskStatus(
  taskId: string,
  status: ActionTaskStatus,
  note?: string,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!TASK_STATUSES.includes(status)) fail("invalid_status");
    const task = await loadTask(taskId, actor);
    const isTaskOwner = !!actor.employeeId && actor.employeeId === task.ownerEmployeeId;
    if (!canManage(actor, task.plan) && !isTaskOwner) fail("cannot_update_task");
    assertActive(task.plan);
    if (status === "CANCELLED" && !canManage(actor, task.plan)) fail("owner_only_cancel_task");
    if (task.status === status) return { success: true };

    await prisma.actionPlanTask.update({
      where: { id: task.id },
      data: { status, completedAt: status === "DONE" ? new Date() : null },
    });
    await logUpdate(actor, {
      planId: task.planId,
      taskId: task.id,
      note: cleanText(note, "note", MAX_TEXT, false) ?? "",
      statusFrom: task.status,
      statusTo: status,
    });
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_task");
  }
}

export async function addActionPlanNote(
  planId: string,
  note: string,
  taskId?: string | null,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    const task = taskId ? plan.tasks.find((t) => t.id === taskId) : undefined;
    if (taskId && !task) fail("task_not_found");
    const isTaskOwner = !!task && !!actor.employeeId && task.ownerEmployeeId === actor.employeeId;
    if (!canManage(actor, plan) && !isTaskOwner) fail("cannot_add_notes");
    assertActive(plan);
    await logUpdate(actor, { planId: plan.id, taskId: task?.id ?? null, note: cleanText(note, "note", MAX_TEXT)! });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_add_note");
  }
}

// ---------------------------------------------------------------------------
// Process measures
// ---------------------------------------------------------------------------

export async function addProcessMeasure(planId: string, input: ProcessMeasureInput): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);
    if (input.taskId && !plan.tasks.some((t) => t.id === input.taskId)) fail("task_not_found");
    const created = await prisma.actionPlanMeasure.create({
      data: {
        planId: plan.id,
        taskId: input.taskId || null,
        kind: "PROCESS",
        name: cleanText(input.name, "indicator_name", MAX_TITLE)!,
        unit: cleanText(input.unit, "unit", 50, false),
        baselineValue: optionalNumber(input.baselineValue, "indicator_baseline"),
        targetValue: optionalNumber(input.targetValue, "indicator_target"),
      },
    });
    revalidatePlan(plan);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toResult(error, "failed_add_indicator");
  }
}

async function loadProcessMeasure(measureId: string, actor: ClimateActor) {
  const measure = await prisma.actionPlanMeasure.findFirst({
    where: { id: measureId, plan: { companyId: actor.companyId } },
    include: { plan: { include: planInclude } },
  });
  if (!measure) fail("indicator_not_found");
  if (measure.kind !== "PROCESS") fail("outcome_indicator_auto");
  return measure;
}

export async function updateProcessMeasure(
  measureId: string,
  input: Partial<Omit<ProcessMeasureInput, "taskId">>,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const measure = await loadProcessMeasure(measureId, actor);
    assertCanManage(actor, measure.plan);
    assertOpen(measure.plan);
    const data: Prisma.ActionPlanMeasureUpdateInput = {};
    if (input.name !== undefined) data.name = cleanText(input.name, "indicator_name", MAX_TITLE)!;
    if (input.unit !== undefined) data.unit = cleanText(input.unit, "unit", 50, false);
    if (input.baselineValue !== undefined) data.baselineValue = optionalNumber(input.baselineValue, "indicator_baseline");
    if (input.targetValue !== undefined) data.targetValue = optionalNumber(input.targetValue, "indicator_target");
    await prisma.actionPlanMeasure.update({ where: { id: measure.id }, data });
    revalidatePlan(measure.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_indicator");
  }
}

export async function deleteProcessMeasure(measureId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const measure = await loadProcessMeasure(measureId, actor);
    assertCanManage(actor, measure.plan);
    assertOpen(measure.plan);
    await prisma.actionPlanMeasure.delete({ where: { id: measure.id } });
    revalidatePlan(measure.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_delete_indicator");
  }
}

export async function recordMeasureValue(measureId: string, value: number, note?: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const measure = await loadProcessMeasure(measureId, actor);
    const task = measure.taskId ? measure.plan.tasks.find((t) => t.id === measure.taskId) : undefined;
    const isTaskOwner = !!task && !!actor.employeeId && task.ownerEmployeeId === actor.employeeId;
    if (!canManage(actor, measure.plan) && !isTaskOwner) fail("cannot_update_indicator");
    assertActive(measure.plan);
    const v = optionalNumber(value, "value");
    if (v == null) fail("required", { field: "value" });
    await prisma.actionPlanMeasure.update({ where: { id: measure.id }, data: { currentValue: v } });
    await logUpdate(actor, {
      planId: measure.planId,
      measureId: measure.id,
      taskId: measure.taskId,
      value: v,
      note: cleanText(note, "note", MAX_TEXT, false) ?? "",
    });
    revalidatePlan(measure.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_record_value");
  }
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

function sanitizeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-80) || "file";
}

export async function uploadTaskEvidence(taskId: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireClimateActor();
    const task = await loadTask(taskId, actor);
    const isTaskOwner = !!actor.employeeId && actor.employeeId === task.ownerEmployeeId;
    if (!canManage(actor, task.plan) && !isTaskOwner) fail("cannot_add_evidence");
    assertOpen(task.plan);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) fail("choose_file");
    if (!EVIDENCE_MIME.has(file.type)) fail("file_type");
    if (file.size > MAX_EVIDENCE_BYTES) fail("file_too_large", { max: MAX_EVIDENCE_MB });
    const count = await prisma.actionPlanEvidence.count({ where: { taskId: task.id } });
    if (count >= MAX_EVIDENCE_PER_TASK) fail("too_many_files", { max: MAX_EVIDENCE_PER_TASK });

    const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
    let supabase;
    try {
      supabase = createSupabaseStorageClient();
    } catch {
      fail("storage_not_configured");
    }
    const path = `companies/${actor.companyId}/plans/${task.planId}/tasks/${task.id}/${randomUUID()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(CLIMATE_EVIDENCE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) fail("upload_failed", { reason: uploadError.message });

    const evidence = await prisma.actionPlanEvidence.create({
      data: {
        taskId: task.id,
        fileName: file.name.slice(0, 200),
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath: path,
        uploadedByEmployeeId: actor.employeeId,
        uploadedByUserId: actor.userId,
      },
    });
    revalidatePlan(task.plan);
    return { success: true, data: { id: evidence.id } };
  } catch (error) {
    return toResult(error, "failed_upload_file");
  }
}

async function loadEvidence(evidenceId: string, actor: ClimateActor) {
  const evidence = await prisma.actionPlanEvidence.findFirst({
    where: { id: evidenceId, task: { plan: { companyId: actor.companyId } } },
    include: { task: { include: { plan: { include: planInclude } } } },
  });
  if (!evidence) fail("file_not_found");
  return evidence;
}

export async function getTaskEvidenceUrl(evidenceId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const actor = await requireClimateActor();
    const evidence = await loadEvidence(evidenceId, actor);
    const plan = evidence.task.plan;
    const canView =
      canManage(actor, plan) || plan.tasks.some((t) => t.ownerEmployeeId && t.ownerEmployeeId === actor.employeeId);
    if (!canView) fail("cannot_view_file");
    const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
    let supabase;
    try {
      supabase = createSupabaseStorageClient();
    } catch {
      fail("storage_not_configured");
    }
    const { data, error } = await supabase.storage.from(CLIMATE_EVIDENCE_BUCKET).createSignedUrl(evidence.storagePath, 300);
    if (error || !data?.signedUrl) fail("cannot_open_file");
    return { success: true, data: { url: data.signedUrl } };
  } catch (error) {
    return toResult(error, "failed_open_file");
  }
}

export async function deleteTaskEvidence(evidenceId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const evidence = await loadEvidence(evidenceId, actor);
    const isUploader = !!actor.employeeId && evidence.uploadedByEmployeeId === actor.employeeId;
    if (!canManage(actor, evidence.task.plan) && !isUploader) fail("cannot_delete_file");
    assertOpen(evidence.task.plan);
    await prisma.actionPlanEvidence.delete({ where: { id: evidence.id } });
    try {
      const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
      await createSupabaseStorageClient().storage.from(CLIMATE_EVIDENCE_BUCKET).remove([evidence.storagePath]);
    } catch (e) {
      console.error("[action-plans] evidence storage cleanup failed:", e);
    }
    revalidatePlan(evidence.task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_delete_file");
  }
}

// ---------------------------------------------------------------------------
// Leader context
// ---------------------------------------------------------------------------

export async function saveLeaderContext(
  surveyId: string,
  answers: Record<string, string>,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!actor.employeeId) fail("leaders_only_context");
    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, resultsReleasedAt: true },
    });
    if (!survey?.resultsReleasedAt) fail("results_not_released");
    const clean: Record<string, string> = {};
    for (const key of ["q1", "q2", "q3", "q4"]) {
      clean[key] = cleanText(answers[key], "answer", MAX_TEXT, false) ?? "";
    }
    await prisma.leaderSurveyContext.upsert({
      where: { surveyId_leaderEmployeeId: { surveyId, leaderEmployeeId: actor.employeeId } },
      create: { surveyId, leaderEmployeeId: actor.employeeId, answers: clean },
      update: { answers: clean },
    });
    revalidatePath(`/portal/climate-results/${surveyId}`);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_save_answers");
  }
}

// ---------------------------------------------------------------------------
// Results release & impact (admin)
// ---------------------------------------------------------------------------

export async function releaseSurveyResults(
  surveyId: string,
): Promise<ActionResult<{ leaders: number; leadersWithGaps: number }>> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("admin_only_release");
    const meta = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, name: true, status: true, instrumentVersion: true, resultsReleasedAt: true, planDueDate: true, planMinPerLeader: true },
    });
    if (!meta) fail("survey_not_found");
    if (meta.status !== "ACTIVE" && meta.status !== "CLOSED") fail("release_needs_sent");
    if (!meta.instrumentVersion) fail("release_needs_instrument");
    if (meta.resultsReleasedAt) fail("already_released");

    const releasedAt = new Date();
    // Default deadline: a calendar day, stored like a date input (UTC midnight)
    const planDueDate =
      meta.planDueDate ?? businessDayAsDate(new Date(releasedAt.getTime() + 15 * 24 * 60 * 60 * 1000));
    // Conditional update: a double click or retry can't release (and email) twice
    const { count } = await prisma.climateSurvey.updateMany({
      where: { id: meta.id, resultsReleasedAt: null },
      data: { resultsReleasedAt: releasedAt, planDueDate },
    });
    if (count === 0) fail("already_released");

    const survey = await loadSurveyForScoring(meta.id, actor.companyId);
    let leadersWithGaps = 0;
    const leaders = survey ? leaderIdsOf(survey) : [];
    for (const leaderId of leaders) {
      const g = leaderGaps(survey!, leaderId, meta.planMinPerLeader);
      if (g.suppressed || g.gaps.length === 0) continue;
      leadersWithGaps++;
      await safely("results released email", () =>
        emailEmployeeViaPortal(
          leaderId,
          `/portal/climate-results/${meta.id}`,
          planEmails.resultsReleased(meta.name, g.gaps.length, formatDay(planDueDate)),
        ),
      );
    }

    revalidatePath(`/surveys/climate/${meta.id}`);
    revalidatePath("/portal/home");
    return { success: true, data: { leaders: leaders.length, leadersWithGaps } };
  } catch (error) {
    return toResult(error, "failed_release_results");
  }
}

export async function retractSurveyResults(surveyId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("admin_only_hide");
    const meta = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, resultsReleasedAt: true },
    });
    if (!meta) fail("survey_not_found");
    if (!meta.resultsReleasedAt) return { success: true };
    const submitted = await prisma.actionPlan.count({ where: { surveyId, status: { in: SUBMITTED_PLAN_STATUSES } } });
    if (submitted > 0) fail("plans_already_submitted");
    await prisma.climateSurvey.update({ where: { id: meta.id }, data: { resultsReleasedAt: null } });
    revalidatePath(`/surveys/climate/${meta.id}`);
    revalidatePath("/portal/home");
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_hide_results");
  }
}

/** Evaluate earlier plans against this survey's results and notify their owners. */
export async function evaluateSurveyImpact(surveyId: string): Promise<ActionResult<{ evaluated: number }>> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("admin_only_evaluate");
    const evaluated = await evaluateAndNotifyPlanOutcomes(surveyId, actor.companyId);
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true, data: { evaluated } };
  } catch (error) {
    return toResult(error, "failed_evaluate_impact");
  }
}

// ---------------------------------------------------------------------------
// Single-action plans (the leader view's "Nuevo plan" form)
//
// One action with dates and a status, stored as a submitted plan with one
// task: emails, reminders, compliance and impact work as for any plan.
// ---------------------------------------------------------------------------

export interface SingleActionPlanInput {
  action: string;
  startDate: string | Date;
  endDate: string | Date;
}

export type SingleActionStatus = "PENDING" | "IN_PROGRESS" | "DONE";

/** The plan's one action. Refuses plans written in the full editor, whose texts the one-action form would overwrite. */
function singleTask(plan: LoadedPlan) {
  if (!isSingleActionPlan(plan)) fail("not_single_action");
  const task = plan.tasks.find((t) => t.status !== "CANCELLED");
  if (!task) fail("task_not_found");
  return task;
}

export async function createSingleActionPlan(
  input: SingleActionPlanInput & { surveyId: string; leaderEmployeeId: string; dimensionId: string },
): Promise<ActionResult<{ id: string; taskId: string }>> {
  const action = (input.action ?? "").trim();
  const created = await createActionPlan({
    surveyId: input.surveyId,
    dimensionId: input.dimensionId,
    scope: "LEADER",
    scopeRefId: input.leaderEmployeeId,
    ownerEmployeeId: input.leaderEmployeeId,
    title: action,
    objective: action,
    startDate: input.startDate,
    endDate: input.endDate,
    tasks: [{ title: action, ownerEmployeeId: null, dueDate: input.endDate }],
  });
  if (!created.success) return { success: false, error: created.error };

  const submitted = await submitActionPlan(created.data!.id);
  if (!submitted.success) {
    await prisma.actionPlan.delete({ where: { id: created.data!.id } }).catch(() => {});
    return { success: false, error: submitted.error };
  }
  const task = await prisma.actionPlanTask.findFirst({ where: { planId: created.data!.id }, select: { id: true } });
  return { success: true, data: { id: created.data!.id, taskId: task!.id } };
}

export async function updateSingleActionPlan(planId: string, input: SingleActionPlanInput): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);
    const task = singleTask(plan);
    const action = cleanText(input.action, "title", MAX_TITLE)!;
    const startDate = parseDate(input.startDate, "start_date");
    const endDate = parseDate(input.endDate, "end_date");
    if (startDate > endDate) fail("start_after_end");

    await prisma.$transaction([
      prisma.actionPlan.update({ where: { id: plan.id }, data: { title: action, objective: action, startDate, endDate } }),
      prisma.actionPlanTask.update({ where: { id: task.id }, data: { title: action, dueDate: endDate } }),
    ]);
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_plan");
  }
}

/** Pendiente / En progreso / Completado: the task's status; Completado also completes the plan. */
export async function setSingleActionPlanStatus(planId: string, status: SingleActionStatus): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!["PENDING", "IN_PROGRESS", "DONE"].includes(status)) fail("invalid_status");
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status === "CANCELLED") fail("already_closed");
    const task = singleTask(plan);

    // Moving a completed action back reopens its plan
    if (plan.status === "COMPLETED" && status !== "DONE") {
      await prisma.actionPlan.update({
        where: { id: plan.id },
        data: { status: "ACTIVE", completedAt: null, closingNote: null },
      });
      await logUpdate(actor, { planId: plan.id, note: "", statusFrom: "COMPLETED", statusTo: "ACTIVE" });
    }
    if (plan.status === "DRAFT") {
      const submitted = await submitActionPlan(plan.id);
      if (!submitted.success) return submitted;
    }

    const updated = await setActionPlanTaskStatus(task.id, status);
    if (!updated.success) return updated;
    if (status === "DONE" && plan.status !== "COMPLETED") return completeActionPlan(plan.id, plan.title);

    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_update_task");
  }
}

/** Leaders delete their own unfinished actions; admins can delete any. */
export async function deleteSingleActionPlan(planId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status === "COMPLETED" && !isAdmin(actor)) fail("admin_only_delete_completed");

    const evidence = await prisma.actionPlanEvidence.findMany({
      where: { task: { planId: plan.id } },
      select: { storagePath: true },
    });
    await prisma.actionPlan.delete({ where: { id: plan.id } });
    if (evidence.length > 0) {
      await safely("delete plan evidence files", async () => {
        const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
        await createSupabaseStorageClient().storage.from(CLIMATE_EVIDENCE_BUCKET).remove(evidence.map((e) => e.storagePath));
      });
    }
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "failed_delete_plan");
  }
}
