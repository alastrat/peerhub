// Daily reminders for climate action plans (spec §4.8). Run by
// /api/cron/climate-plans; safe to run more than once a day.

import { prisma } from "@/lib/db/prisma";
import { businessDay } from "@/lib/constants/business-time";
import { emailEmployeeViaPortal, planEmails, safely } from "@/lib/email/climate-plan-emails";
import { loadSurveyForScoring } from "@/lib/queries/climate-reports";
import { leaderGaps, leaderIdsOf, SUBMITTED_PLAN_STATUSES } from "@/lib/queries/action-plans";

const DAY = 24 * 60 * 60 * 1000;
const SOON_DAYS = 3;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Tasks due within 3 days or overdue, one email per owner, at most once a day per task. */
export async function sendTaskReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + SOON_DAYS * DAY);
  const tasks = await prisma.actionPlanTask.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueDate: { lte: horizon },
      plan: { status: "ACTIVE" },
      OR: [{ reminderSentAt: null }, { reminderSentAt: { lt: new Date(now.getTime() - 20 * 60 * 60 * 1000) } }],
    },
    include: { plan: { select: { ownerEmployeeId: true } } },
    orderBy: { dueDate: "asc" },
  });

  const byOwner = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const owner = t.ownerEmployeeId ?? t.plan.ownerEmployeeId;
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), t]);
  }

  let emails = 0;
  const today = businessDay(now);
  for (const [employeeId, list] of byOwner) {
    const items = list.map((t) => ({ title: t.title, dueDate: dayKey(t.dueDate), overdue: dayKey(t.dueDate) < today }));
    let sent = false;
    await safely("task reminder email", async () => {
      sent = await emailEmployeeViaPortal(employeeId, "/portal/my-tasks", planEmails.taskDue(items));
    });
    if (!sent) continue;
    emails++;
    await prisma.actionPlanTask.updateMany({ where: { id: { in: list.map((t) => t.id) } }, data: { reminderSentAt: now } });
  }
  return { tasks: tasks.length, emails };
}

/** Leaders below their plan minimum when the deadline is 3 days away (once per survey). */
export async function sendPlanDeadlineReminders(now = new Date()) {
  const surveys = await prisma.climateSurvey.findMany({
    where: {
      resultsReleasedAt: { not: null },
      instrumentVersion: { not: null },
      planReminderSentAt: null,
      planDueDate: { gte: now, lte: new Date(now.getTime() + SOON_DAYS * DAY) },
    },
    select: { id: true, name: true, companyId: true, planDueDate: true, planMinPerLeader: true },
  });

  let emails = 0;
  for (const s of surveys) {
    const survey = await loadSurveyForScoring(s.id, s.companyId);
    if (!survey) continue;
    for (const leaderId of leaderIdsOf(survey)) {
      const g = leaderGaps(survey, leaderId, s.planMinPerLeader);
      if (g.required === 0) continue;
      const submitted = await prisma.actionPlan.count({
        where: {
          surveyId: s.id,
          scope: "LEADER",
          scopeRefId: leaderId,
          status: { in: SUBMITTED_PLAN_STATUSES },
          dimensionId: { in: g.gaps.map((x) => x.dimensionId) },
        },
      });
      if (submitted >= g.required) continue;
      await safely("plan deadline email", async () => {
        if (
          await emailEmployeeViaPortal(
            leaderId,
            `/portal/climate-results/${s.id}`,
            planEmails.planDeadline(s.name, dayKey(s.planDueDate!), submitted, g.required),
          )
        ) {
          emails++;
        }
      });
    }
    await prisma.climateSurvey.update({ where: { id: s.id }, data: { planReminderSentAt: now } });
  }
  return { surveys: surveys.length, emails };
}
