"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma, type ActionPlanScope, type ActionTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types";
import { requireClimateActor, type ClimateActor } from "@/lib/auth/climate-actor";
import { loadSurveyForScoring, scoreScope } from "@/lib/queries/climate-reports";
import {
  evaluateAndNotifyPlanOutcomes,
  leaderGaps,
  leaderIdsOf,
  OPEN_PLAN_STATUSES,
  SUBMITTED_PLAN_STATUSES,
} from "@/lib/queries/action-plans";
import { bandRank, isClimateBand, nextBand, type ClimateBand } from "@/lib/utils/climate-scoring";
import { emailEmployeeViaPortal, emailUsersViaDashboard, planEmails, safely } from "@/lib/email/climate-plan-emails";

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
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const MAX_EVIDENCE_PER_TASK = 10;
const EVIDENCE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class PlanError extends Error {}

function fail(message: string): never {
  throw new PlanError(message);
}

function toResult(error: unknown, fallback: string): { success: false; error: string } {
  if (error instanceof PlanError) return { success: false, error: error.message };
  if (error instanceof Error && error.message === "Unauthorized") return { success: false, error: "Unauthorized" };
  console.error(`[action-plans] ${fallback}:`, error);
  return { success: false, error: fallback };
}

function parseDate(value: string | Date | null | undefined, label: string): Date {
  if (value == null || value === "") fail(`${label} is required`);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) fail(`${label} is not a valid date`);
  return d;
}

function cleanText(value: string | null | undefined, label: string, max: number, required = true): string | null {
  const v = (value ?? "").trim();
  if (!v) {
    if (required) fail(`${label} is required`);
    return null;
  }
  if (v.length > max) fail(`${label} is too long`);
  return v;
}

function optionalNumber(value: number | null | undefined, label: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${label} must be a number`);
  return value;
}

function isAdmin(actor: ClimateActor) {
  return actor.kind === "admin";
}

async function assertEmployeeInCompany(employeeId: string, companyId: string, label = "Owner") {
  const e = await prisma.employee.findFirst({ where: { id: employeeId, companyId, isActive: true }, select: { id: true } });
  if (!e) fail(`${label} not found`);
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
  if (!plan) fail("Plan not found");
  return plan;
}

function canManage(actor: ClimateActor, plan: { ownerEmployeeId: string }) {
  return isAdmin(actor) || actor.employeeId === plan.ownerEmployeeId;
}

function assertCanManage(actor: ClimateActor, plan: { ownerEmployeeId: string }) {
  if (!canManage(actor, plan)) fail("You can't edit this plan");
}

function assertOpen(plan: { status: string }) {
  if (!OPEN_PLAN_STATUSES.includes(plan.status as never)) fail("This plan is closed");
}

function assertActive(plan: { status: string }) {
  if (plan.status !== "ACTIVE") fail("Progress can only be recorded on an active plan");
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
  if (tasks.length > MAX_TASKS) fail(`A plan can have at most ${MAX_TASKS} tasks`);
  const out = [];
  for (const [i, t] of tasks.entries()) {
    const title = cleanText(t.title, "Task title", MAX_TITLE)!;
    const dueDate = parseDate(t.dueDate, "Task due date");
    if (t.ownerEmployeeId) await assertEmployeeInCompany(t.ownerEmployeeId, companyId, "Task owner");
    out.push({
      title,
      description: cleanText(t.description, "Task description", MAX_TEXT, false),
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
    if (!surveyMeta) fail("Survey not found");
    if (!surveyMeta.instrumentVersion) fail("Action plans need a survey that uses the validated instrument");
    if (surveyMeta.status === "DRAFT") fail("This survey hasn't been sent yet");

    const scope = input.scope;
    let scopeRefId = input.scopeRefId || null;
    let ownerEmployeeId: string;

    if (isAdmin(actor)) {
      if (scope === "ORGANIZATION") {
        scopeRefId = null;
      } else {
        if (!scopeRefId) fail("Choose the group this plan is for");
        const exists =
          scope === "LEADER"
            ? await prisma.employee.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
            : scope === "DEPARTMENT"
              ? await prisma.department.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
              : scope === "HUB"
                ? await prisma.hub.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } })
                : await prisma.team.findFirst({ where: { id: scopeRefId, companyId: actor.companyId }, select: { id: true } });
        if (!exists) fail("Group not found");
      }
      ownerEmployeeId = input.ownerEmployeeId || (scope === "LEADER" ? scopeRefId! : actor.employeeId ?? "");
      if (!ownerEmployeeId) fail("Choose who owns this plan");
      await assertEmployeeInCompany(ownerEmployeeId, actor.companyId);
    } else {
      // Leaders plan for their own team, once results are released
      if (scope !== "LEADER" || scopeRefId !== actor.employeeId) fail("You can only create plans for your own team");
      if (!surveyMeta.resultsReleasedAt) fail("Results haven't been released yet");
      ownerEmployeeId = actor.employeeId;
    }

    const survey = await loadSurveyForScoring(input.surveyId, actor.companyId);
    if (!survey) fail("Survey not found");
    const { score, dimensions } = scoreScope(survey, scope, scopeRefId);
    if (score.suppressed) fail(`This group has fewer than ${survey.anonymityThreshold} responses, so it can't have a plan`);
    const dim = dimensions.find((d) => d.dimensionId === input.dimensionId);
    if (!dim || dim.mean == null || !dim.band) fail("This dimension isn't part of the validated instrument in this survey");

    const title = cleanText(input.title, "Title", MAX_TITLE)!;
    const objective = cleanText(input.objective, "Objective", MAX_TEXT)!;
    const startDate = parseDate(input.startDate, "Start date");
    const endDate = parseDate(input.endDate, "End date");
    if (startDate > endDate) fail("The start date must be on or before the end date");
    const targetBand = input.targetBand ?? nextBand(dim.band);
    if (!isClimateBand(targetBand)) fail("Invalid target level");
    if (bandRank(targetBand) < bandRank(dim.band)) fail("The target can't be below the current level");
    const targetMean = optionalNumber(input.targetMean, "Target mean");
    if (targetMean != null && (targetMean < 1 || targetMean > 4)) fail("Target mean must be between 1 and 4");

    const tasks = await validateTasks(input.tasks ?? [], actor.companyId);
    const measures = (input.measures ?? []).map((m) => ({
      kind: "PROCESS" as const,
      name: cleanText(m.name, "Indicator name", MAX_TITLE)!,
      unit: cleanText(m.unit, "Unit", 50, false),
      baselineValue: optionalNumber(m.baselineValue, "Indicator baseline"),
      targetValue: optionalNumber(m.targetValue, "Indicator target"),
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
    return toResult(error, "Failed to create the plan");
  }
}

export async function updateActionPlan(planId: string, input: UpdateActionPlanInput): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);

    const data: Prisma.ActionPlanUpdateInput = {};
    if (input.title !== undefined) data.title = cleanText(input.title, "Title", MAX_TITLE)!;
    if (input.objective !== undefined) data.objective = cleanText(input.objective, "Objective", MAX_TEXT)!;
    const startDate = input.startDate !== undefined ? parseDate(input.startDate, "Start date") : plan.startDate;
    const endDate = input.endDate !== undefined ? parseDate(input.endDate, "End date") : plan.endDate;
    if (startDate > endDate) fail("The start date must be on or before the end date");
    data.startDate = startDate;
    data.endDate = endDate;
    if (input.targetBand !== undefined) {
      if (!isClimateBand(input.targetBand)) fail("Invalid target level");
      if (bandRank(input.targetBand) < bandRank(plan.baselineBand as ClimateBand)) {
        fail("The target can't be below the current level");
      }
      data.targetBand = input.targetBand;
    }
    if (input.targetMean !== undefined) {
      const tm = optionalNumber(input.targetMean, "Target mean");
      if (tm != null && (tm < 1 || tm > 4)) fail("Target mean must be between 1 and 4");
      data.targetMean = tm;
    }
    if (input.ownerEmployeeId !== undefined && input.ownerEmployeeId !== plan.ownerEmployeeId) {
      if (!isAdmin(actor)) fail("Only an administrator can change the owner");
      await assertEmployeeInCompany(input.ownerEmployeeId, actor.companyId);
      data.owner = { connect: { id: input.ownerEmployeeId } };
    }

    await prisma.actionPlan.update({ where: { id: plan.id }, data });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to update the plan");
  }
}

export async function submitActionPlan(planId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status !== "DRAFT") fail("Only draft plans can be submitted");
    if (plan.tasks.filter((t) => t.status !== "CANCELLED").length === 0) fail("Add at least one task before submitting");

    await prisma.actionPlan.update({ where: { id: plan.id }, data: { status: "ACTIVE", submittedAt: new Date() } });
    await logUpdate(actor, { planId: plan.id, note: "Plan enviado", statusFrom: "DRAFT", statusTo: "ACTIVE" });

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
    return toResult(error, "Failed to submit the plan");
  }
}

export async function completeActionPlan(planId: string, closingNote: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertActive(plan);
    const note = cleanText(closingNote, "Closing note", MAX_TEXT)!;
    const open = plan.tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
    if (open.length > 0) fail("Finish or cancel every task before completing the plan");
    if (!plan.tasks.some((t) => t.status === "DONE")) fail("At least one task must be done");

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
    return toResult(error, "Failed to complete the plan");
  }
}

export async function cancelActionPlan(planId: string, reason: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("Only an administrator can cancel a plan");
    const plan = await loadPlan(planId, actor);
    if (plan.status === "COMPLETED" || plan.status === "CANCELLED") fail("This plan is already closed");
    const why = cleanText(reason, "Reason", MAX_TEXT)!;
    await prisma.actionPlan.update({ where: { id: plan.id }, data: { status: "CANCELLED", cancelReason: why } });
    await logUpdate(actor, { planId: plan.id, note: why, statusFrom: plan.status, statusTo: "CANCELLED" });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to cancel the plan");
  }
}

export async function deleteActionPlan(planId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    if (plan.status !== "DRAFT") fail("Only draft plans can be deleted");
    await prisma.actionPlan.delete({ where: { id: plan.id } });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to delete the plan");
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
  if (!task) fail("Task not found");
  return task;
}

export async function addActionPlanTask(planId: string, input: ActionPlanTaskInput): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireClimateActor();
    const plan = await loadPlan(planId, actor);
    assertCanManage(actor, plan);
    assertOpen(plan);
    if (plan.tasks.length >= MAX_TASKS) fail(`A plan can have at most ${MAX_TASKS} tasks`);
    const [task] = await validateTasks([input], actor.companyId);
    const created = await prisma.actionPlanTask.create({
      data: { ...task, planId: plan.id, order: plan.tasks.length },
    });
    if (plan.status === "ACTIVE") await notifyTaskOwner(created, plan);
    revalidatePlan(plan);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toResult(error, "Failed to add the task");
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
    if (input.title !== undefined) data.title = cleanText(input.title, "Task title", MAX_TITLE)!;
    if (input.description !== undefined) data.description = cleanText(input.description, "Task description", MAX_TEXT, false);
    if (input.dueDate !== undefined) data.dueDate = parseDate(input.dueDate, "Task due date");
    let newOwner: string | null | undefined;
    if (input.ownerEmployeeId !== undefined && (input.ownerEmployeeId || null) !== task.ownerEmployeeId) {
      newOwner = input.ownerEmployeeId || null;
      if (newOwner) await assertEmployeeInCompany(newOwner, actor.companyId, "Task owner");
      data.ownerEmployeeId = newOwner;
    }
    const updated = await prisma.actionPlanTask.update({ where: { id: task.id }, data });
    if (newOwner && task.plan.status === "ACTIVE") await notifyTaskOwner(updated, task.plan);
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to update the task");
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
      fail("A submitted plan must keep at least one task; cancel the task instead");
    }
    await prisma.actionPlanTask.delete({ where: { id: task.id } });
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to delete the task");
  }
}

export async function setActionPlanTaskStatus(
  taskId: string,
  status: ActionTaskStatus,
  note?: string,
): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!TASK_STATUSES.includes(status)) fail("Invalid status");
    const task = await loadTask(taskId, actor);
    const isTaskOwner = !!actor.employeeId && actor.employeeId === task.ownerEmployeeId;
    if (!canManage(actor, task.plan) && !isTaskOwner) fail("You can't update this task");
    assertActive(task.plan);
    if (status === "CANCELLED" && !canManage(actor, task.plan)) fail("Only the plan owner can cancel a task");
    if (task.status === status) return { success: true };

    await prisma.actionPlanTask.update({
      where: { id: task.id },
      data: { status, completedAt: status === "DONE" ? new Date() : null },
    });
    await logUpdate(actor, {
      planId: task.planId,
      taskId: task.id,
      note: cleanText(note, "Note", MAX_TEXT, false) ?? "",
      statusFrom: task.status,
      statusTo: status,
    });
    revalidatePlan(task.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to update the task");
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
    if (taskId && !task) fail("Task not found");
    const isTaskOwner = !!task && !!actor.employeeId && task.ownerEmployeeId === actor.employeeId;
    if (!canManage(actor, plan) && !isTaskOwner) fail("You can't add notes to this plan");
    assertActive(plan);
    await logUpdate(actor, { planId: plan.id, taskId: task?.id ?? null, note: cleanText(note, "Note", MAX_TEXT)! });
    revalidatePlan(plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to add the note");
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
    if (input.taskId && !plan.tasks.some((t) => t.id === input.taskId)) fail("Task not found");
    const created = await prisma.actionPlanMeasure.create({
      data: {
        planId: plan.id,
        taskId: input.taskId || null,
        kind: "PROCESS",
        name: cleanText(input.name, "Indicator name", MAX_TITLE)!,
        unit: cleanText(input.unit, "Unit", 50, false),
        baselineValue: optionalNumber(input.baselineValue, "Indicator baseline"),
        targetValue: optionalNumber(input.targetValue, "Indicator target"),
      },
    });
    revalidatePlan(plan);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toResult(error, "Failed to add the indicator");
  }
}

async function loadProcessMeasure(measureId: string, actor: ClimateActor) {
  const measure = await prisma.actionPlanMeasure.findFirst({
    where: { id: measureId, plan: { companyId: actor.companyId } },
    include: { plan: { include: planInclude } },
  });
  if (!measure) fail("Indicator not found");
  if (measure.kind !== "PROCESS") fail("The outcome indicator is measured automatically by the next survey");
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
    if (input.name !== undefined) data.name = cleanText(input.name, "Indicator name", MAX_TITLE)!;
    if (input.unit !== undefined) data.unit = cleanText(input.unit, "Unit", 50, false);
    if (input.baselineValue !== undefined) data.baselineValue = optionalNumber(input.baselineValue, "Indicator baseline");
    if (input.targetValue !== undefined) data.targetValue = optionalNumber(input.targetValue, "Indicator target");
    await prisma.actionPlanMeasure.update({ where: { id: measure.id }, data });
    revalidatePlan(measure.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to update the indicator");
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
    return toResult(error, "Failed to delete the indicator");
  }
}

export async function recordMeasureValue(measureId: string, value: number, note?: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const measure = await loadProcessMeasure(measureId, actor);
    const task = measure.taskId ? measure.plan.tasks.find((t) => t.id === measure.taskId) : undefined;
    const isTaskOwner = !!task && !!actor.employeeId && task.ownerEmployeeId === actor.employeeId;
    if (!canManage(actor, measure.plan) && !isTaskOwner) fail("You can't update this indicator");
    assertActive(measure.plan);
    const v = optionalNumber(value, "Value");
    if (v == null) fail("Value is required");
    await prisma.actionPlanMeasure.update({ where: { id: measure.id }, data: { currentValue: v } });
    await logUpdate(actor, {
      planId: measure.planId,
      measureId: measure.id,
      taskId: measure.taskId,
      value: v,
      note: cleanText(note, "Note", MAX_TEXT, false) ?? "",
    });
    revalidatePlan(measure.plan);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to record the value");
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
    if (!canManage(actor, task.plan) && !isTaskOwner) fail("You can't add evidence to this task");
    assertOpen(task.plan);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) fail("Choose a file");
    if (!EVIDENCE_MIME.has(file.type)) fail("Only PNG, JPG, WEBP or PDF files are allowed");
    if (file.size > MAX_EVIDENCE_BYTES) fail("Files can be at most 10 MB");
    const count = await prisma.actionPlanEvidence.count({ where: { taskId: task.id } });
    if (count >= MAX_EVIDENCE_PER_TASK) fail(`A task can have at most ${MAX_EVIDENCE_PER_TASK} files`);

    const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
    let supabase;
    try {
      supabase = createSupabaseStorageClient();
    } catch {
      fail("File storage isn't configured");
    }
    const path = `companies/${actor.companyId}/plans/${task.planId}/tasks/${task.id}/${randomUUID()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(CLIMATE_EVIDENCE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) fail(`Upload failed: ${uploadError.message}`);

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
    return toResult(error, "Failed to upload the file");
  }
}

async function loadEvidence(evidenceId: string, actor: ClimateActor) {
  const evidence = await prisma.actionPlanEvidence.findFirst({
    where: { id: evidenceId, task: { plan: { companyId: actor.companyId } } },
    include: { task: { include: { plan: { include: planInclude } } } },
  });
  if (!evidence) fail("File not found");
  return evidence;
}

export async function getTaskEvidenceUrl(evidenceId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const actor = await requireClimateActor();
    const evidence = await loadEvidence(evidenceId, actor);
    const plan = evidence.task.plan;
    const canView =
      canManage(actor, plan) || plan.tasks.some((t) => t.ownerEmployeeId && t.ownerEmployeeId === actor.employeeId);
    if (!canView) fail("You can't see this file");
    const { createSupabaseStorageClient, CLIMATE_EVIDENCE_BUCKET } = await import("@/lib/supabase/server");
    let supabase;
    try {
      supabase = createSupabaseStorageClient();
    } catch {
      fail("File storage isn't configured");
    }
    const { data, error } = await supabase.storage.from(CLIMATE_EVIDENCE_BUCKET).createSignedUrl(evidence.storagePath, 300);
    if (error || !data?.signedUrl) fail("Couldn't open the file");
    return { success: true, data: { url: data.signedUrl } };
  } catch (error) {
    return toResult(error, "Failed to open the file");
  }
}

export async function deleteTaskEvidence(evidenceId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    const evidence = await loadEvidence(evidenceId, actor);
    const isUploader = !!actor.employeeId && evidence.uploadedByEmployeeId === actor.employeeId;
    if (!canManage(actor, evidence.task.plan) && !isUploader) fail("You can't delete this file");
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
    return toResult(error, "Failed to delete the file");
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
    if (!actor.employeeId) fail("Only leaders can answer the team context");
    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, resultsReleasedAt: true },
    });
    if (!survey?.resultsReleasedAt) fail("Results haven't been released yet");
    const clean: Record<string, string> = {};
    for (const key of ["q1", "q2", "q3", "q4"]) {
      clean[key] = cleanText(answers[key], "Answer", MAX_TEXT, false) ?? "";
    }
    await prisma.leaderSurveyContext.upsert({
      where: { surveyId_leaderEmployeeId: { surveyId, leaderEmployeeId: actor.employeeId } },
      create: { surveyId, leaderEmployeeId: actor.employeeId, answers: clean },
      update: { answers: clean },
    });
    revalidatePath(`/portal/climate-results/${surveyId}`);
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to save the answers");
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
    if (!isAdmin(actor)) fail("Only an administrator can release results");
    const meta = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, name: true, status: true, instrumentVersion: true, resultsReleasedAt: true, planDueDate: true, planMinPerLeader: true },
    });
    if (!meta) fail("Survey not found");
    if (meta.status !== "ACTIVE" && meta.status !== "CLOSED") fail("Only sent surveys can release results");
    if (!meta.instrumentVersion) fail("Only surveys that use the validated instrument have leader results");
    if (meta.resultsReleasedAt) fail("Results were already released");

    const releasedAt = new Date();
    const planDueDate = meta.planDueDate ?? new Date(releasedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    await prisma.climateSurvey.update({ where: { id: meta.id }, data: { resultsReleasedAt: releasedAt, planDueDate } });

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
    return toResult(error, "Failed to release results");
  }
}

export async function retractSurveyResults(surveyId: string): Promise<ActionResult> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("Only an administrator can hide results");
    const meta = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId: actor.companyId },
      select: { id: true, resultsReleasedAt: true },
    });
    if (!meta) fail("Survey not found");
    if (!meta.resultsReleasedAt) return { success: true };
    const submitted = await prisma.actionPlan.count({ where: { surveyId, status: { in: SUBMITTED_PLAN_STATUSES } } });
    if (submitted > 0) fail("Leaders already submitted plans for these results");
    await prisma.climateSurvey.update({ where: { id: meta.id }, data: { resultsReleasedAt: null } });
    revalidatePath(`/surveys/climate/${meta.id}`);
    revalidatePath("/portal/home");
    return { success: true };
  } catch (error) {
    return toResult(error, "Failed to hide results");
  }
}

/** Evaluate earlier plans against this survey's results and notify their owners. */
export async function evaluateSurveyImpact(surveyId: string): Promise<ActionResult<{ evaluated: number }>> {
  try {
    const actor = await requireClimateActor();
    if (!isAdmin(actor)) fail("Only an administrator can evaluate impact");
    const evaluated = await evaluateAndNotifyPlanOutcomes(surveyId, actor.companyId);
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true, data: { evaluated } };
  } catch (error) {
    return toResult(error, "Failed to evaluate impact");
  }
}
