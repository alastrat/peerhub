// Daily reminders for climate action plans (spec §4.8). Run by
// /api/cron/climate-plans; safe to run more than once a day.

import { prisma } from "@/lib/db/prisma";
import { businessDay } from "@/lib/constants/business-time";
import { emailEmployeeViaPortal, planEmails, safely } from "@/lib/email/climate-plan-emails";
import { loadSurveyForScoring } from "@/lib/queries/climate-reports";
import { leaderGaps, leaderIdsOf, SUBMITTED_PLAN_STATUSES } from "@/lib/queries/action-plans";
import { firstName, getEmailSignature, sendSurveyEmail } from "@/lib/climate/survey-finish";
import { getLeaderLink } from "@/lib/climate/leader-links";
import { longDay, planReminderEmail } from "@/lib/email/climate-result-emails";

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

/** The day leaders get the plan reminder: the survey's own date, else 3 days before the deadline. */
export function planReminderDay(survey: { planDueDate: Date; planReminderDate: Date | null }): string {
  return dayKey(survey.planReminderDate ?? new Date(survey.planDueDate.getTime() - SOON_DAYS * DAY));
}

/**
 * Modelo 2: leaders still short of their plans get one reminder per survey,
 * from the reminder day until the deadline.
 */
export async function sendPlanDeadlineReminders(now = new Date()) {
  const today = businessDay(now);
  const surveys = await prisma.climateSurvey.findMany({
    where: {
      resultsReleasedAt: { not: null },
      instrumentVersion: { not: null },
      planReminderSentAt: null,
      planMinPerLeader: { gt: 0 },
      // Due dates are calendar days at UTC midnight
      planDueDate: { gte: new Date(`${today}T00:00:00.000Z`) },
    },
    select: {
      id: true,
      name: true,
      companyId: true,
      planDueDate: true,
      planReminderDate: true,
      planMinPerLeader: true,
      company: { select: { locale: true } },
    },
  });

  let emails = 0;
  let due = 0;
  for (const s of surveys) {
    const planDueDate = s.planDueDate!;
    if (today < planReminderDay({ planDueDate, planReminderDate: s.planReminderDate })) continue;
    due++;
    const survey = await loadSurveyForScoring(s.id, s.companyId);
    if (!survey) continue;
    const locale = s.company.locale;
    const signature = await getEmailSignature();
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
      const leader = await prisma.employee.findFirst({
        where: { id: leaderId, companyId: s.companyId, isActive: true },
        select: { id: true, name: true, email: true, companyId: true },
      });
      if (!leader) continue;
      await safely("plan reminder email", async () => {
        const email = planReminderEmail(
          {
            leaderFirstName: firstName(leader.name),
            surveyName: s.name,
            dueDate: longDay(planDueDate, locale),
            minimum: g.required,
            link: await getLeaderLink(leader, s.id, now),
            signature,
          },
          locale,
        );
        await sendSurveyEmail(leader.email, email);
        emails++;
      });
    }
    await prisma.climateSurvey.update({ where: { id: s.id }, data: { planReminderSentAt: now } });
  }
  return { surveys: due, emails };
}
