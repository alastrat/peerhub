// What happens when a climate survey finishes, by hand, on its end date or
// once everyone has answered: results go to the leaders (Modelo 1) and the
// company admins get the closing report (Modelo 3). Each email goes out once
// per survey and one per person (client's "Modelos de correo").

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { businessDay, businessDayAsDate, BUSINESS_TIME_ZONE } from "@/lib/constants/business-time";
import { sendEmail } from "@/lib/email/resend";
import { DEFAULT_EMAIL_SIGNATURE, EMAIL_SIGNATURE_SETTING_KEY, SUPPORT_EMAIL, SURVEY_SENDER_NAME } from "@/lib/email/email-constants";
import {
  MissingEmailFieldError,
  adminClosingEmail,
  dayAndMonth,
  leaderResultsEmail,
  longDay,
  type BuiltEmail,
} from "@/lib/email/climate-result-emails";
import { loadSurveyForScoring } from "@/lib/queries/climate-reports";
import { evaluateAndNotifyPlanOutcomes, leaderGaps, leaderIdsOf } from "@/lib/queries/action-plans";
import { getLeaderLink } from "./leader-links";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_PLAN_WINDOW_DAYS = 15;

export interface EmailRunResult {
  sent: number;
  /** People whose email didn't go out, and why (an empty field or a delivery error). */
  skipped: { name: string; reason: string }[];
}

export interface LeaderEmailRun extends EmailRunResult {
  /** False when the results email had already gone out (or another run is sending it). */
  claimed: boolean;
  leaders: number;
  leadersWithGaps: number;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** One survey email to one person, from "Kultiva Encuestas", replies to support. */
export function sendSurveyEmail(to: string, email: BuiltEmail) {
  return sendEmail({ to, ...email, fromName: SURVEY_SENDER_NAME, replyTo: SUPPORT_EMAIL });
}

/** The name that signs the results emails ({firma_nombre}), set by a super admin. */
export async function getEmailSignature(): Promise<string> {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: EMAIL_SIGNATURE_SETTING_KEY }, select: { value: true } });
    return setting?.value.trim() || DEFAULT_EMAIL_SIGNATURE;
  } catch {
    return DEFAULT_EMAIL_SIGNATURE;
  }
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** "Ana", "Ana y Pablo", "Ana, Pablo y Luis" (or with "and" in English). */
export function joinNames(names: string[], locale?: string | null): string {
  const and = locale === "en" ? "and" : "y";
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

/** The survey's follow-up people (active users and typed-in addresses): names and emails. */
export async function followUpPeople(companyId: string, survey: { followUpUserIds: string[]; followUpEmails: string[] }) {
  const users = survey.followUpUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: survey.followUpUserIds }, companies: { some: { companyId, isActive: true } } },
        select: { name: true, email: true },
      })
    : [];
  const emails = new Set<string>();
  const names: string[] = [];
  for (const u of users) {
    if (!u.email) continue;
    emails.add(u.email.toLowerCase());
    names.push(u.name?.trim() || u.email);
  }
  for (const raw of survey.followUpEmails) {
    const e = raw.trim().toLowerCase();
    if (e && !emails.has(e)) {
      emails.add(e);
      names.push(e);
    }
  }
  return { names, emails: [...emails] };
}

function skipReason(error: unknown) {
  return error instanceof MissingEmailFieldError ? `missing ${error.field}` : error instanceof Error ? error.message : "unknown error";
}

// ---------------------------------------------------------------------------
// Modelo 1 · results to every leader
// ---------------------------------------------------------------------------

/**
 * Results email to every leader whose team reached the anonymity threshold,
 * with the action-plan block when the survey asks for plans and the leader
 * has gaps. Once per survey: does nothing if it already went out.
 */
export async function sendLeaderResultsEmails(surveyId: string, companyId: string, now = new Date()): Promise<LeaderEmailRun> {
  const result: LeaderEmailRun = { sent: 0, skipped: [], claimed: false, leaders: 0, leadersWithGaps: 0 };
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId, instrumentVersion: { not: null } },
    select: {
      id: true,
      name: true,
      resultsReleasedAt: true,
      resultsEmailedAt: true,
      planMinPerLeader: true,
      planDueDate: true,
      followUpUserIds: true,
      followUpEmails: true,
      company: { select: { name: true, locale: true } },
    },
  });
  if (!meta?.resultsReleasedAt || meta.resultsEmailedAt) return result;
  const survey = await loadSurveyForScoring(surveyId, companyId);
  if (!survey) return result;

  // Claimed before sending, even if some are skipped: a parallel or second
  // run (a double click, a close racing a release) must not email anyone twice
  const { count } = await prisma.climateSurvey.updateMany({
    where: { id: surveyId, resultsEmailedAt: null },
    data: { resultsEmailedAt: now },
  });
  if (count === 0) return result;
  result.claimed = true;
  const locale = meta.company.locale;
  const [signature, followUp] = await Promise.all([getEmailSignature(), followUpPeople(companyId, meta)]);
  const responsible = joinNames(followUp.names, locale) || null;
  const dueDate = meta.planDueDate ? longDay(meta.planDueDate, locale) : "";

  const leaderIds = leaderIdsOf(survey);
  result.leaders = leaderIds.length;
  for (const leaderId of leaderIds) {
    const gaps = leaderGaps(survey, leaderId, meta.planMinPerLeader);
    if (gaps.suppressed) continue; // their report shows nothing to see
    if (gaps.gaps.length > 0) result.leadersWithGaps++;
    const leader = await prisma.employee.findFirst({
      where: { id: leaderId, companyId, isActive: true },
      select: { id: true, name: true, email: true, companyId: true },
    });
    if (!leader) continue;
    try {
      const email = leaderResultsEmail(
        {
          leaderFirstName: firstName(leader.name),
          surveyName: meta.name,
          company: meta.company.name,
          link: await getLeaderLink(leader, surveyId, now),
          threshold: survey.anonymityThreshold,
          signature,
          plans: meta.planMinPerLeader > 0 && gaps.required > 0 ? { minimum: gaps.required, dueDate, responsible } : null,
        },
        locale,
      );
      await sendSurveyEmail(leader.email, email);
      result.sent++;
    } catch (error) {
      console.error(`[survey-finish] Leader results email to ${leader.id} not sent:`, error);
      result.skipped.push({ name: leader.name, reason: skipReason(error) });
    }
  }

  return result;
}

/**
 * Releases results to leaders (if not already) with the default plan deadline,
 * then sends the leaders their results email.
 */
export async function releaseResultsAndNotify(surveyId: string, companyId: string, now = new Date()) {
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: { resultsReleasedAt: true, planDueDate: true, instrumentVersion: true },
  });
  if (!meta?.instrumentVersion) return { released: false, emails: { sent: 0, skipped: [], claimed: false, leaders: 0, leadersWithGaps: 0 } as LeaderEmailRun };
  let released = false;
  if (!meta.resultsReleasedAt) {
    // Default deadline: a calendar day, stored like a date input (UTC midnight)
    const planDueDate = meta.planDueDate ?? businessDayAsDate(new Date(now.getTime() + DEFAULT_PLAN_WINDOW_DAYS * DAY));
    // Conditional: a double click or a parallel close can't release (and email) twice
    const { count } = await prisma.climateSurvey.updateMany({
      where: { id: surveyId, resultsReleasedAt: null },
      data: { resultsReleasedAt: now, planDueDate },
    });
    released = count > 0;
  }
  const emails = await sendLeaderResultsEmails(surveyId, companyId, now);
  return { released, emails };
}

// ---------------------------------------------------------------------------
// Modelo 3 · closing report to the company admins
// ---------------------------------------------------------------------------

/** The survey's shared general-report link, creating its unguessable token the first time. */
export async function getGeneralReportLink(surveyId: string): Promise<string> {
  const survey = await prisma.climateSurvey.findUniqueOrThrow({ where: { id: surveyId }, select: { reportToken: true } });
  let token = survey.reportToken;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    const { count } = await prisma.climateSurvey.updateMany({ where: { id: surveyId, reportToken: null }, data: { reportToken: token } });
    if (count === 0) {
      token = (await prisma.climateSurvey.findUniqueOrThrow({ where: { id: surveyId }, select: { reportToken: true } })).reportToken!;
    }
  }
  return `${APP_URL}/climate-report/shared/${token}`;
}

/** Closing report to each active admin of the company. Once per survey, after it closes. */
export async function sendAdminClosingEmails(surveyId: string, companyId: string, now = new Date()): Promise<EmailRunResult> {
  const result: EmailRunResult = { sent: 0, skipped: [] };
  const meta = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId, instrumentVersion: { not: null } },
    select: {
      id: true,
      name: true,
      status: true,
      closingReportSentAt: true,
      resultsEmailedAt: true,
      anonymityThreshold: true,
      planMinPerLeader: true,
      planDueDate: true,
      followUpUserIds: true,
      followUpEmails: true,
      company: { select: { name: true, locale: true } },
    },
  });
  if (!meta || meta.status !== "CLOSED" || meta.closingReportSentAt) return result;
  // Claimed before sending, so a parallel close can't send it twice
  const { count } = await prisma.climateSurvey.updateMany({
    where: { id: surveyId, status: "CLOSED", closingReportSentAt: null },
    data: { closingReportSentAt: now },
  });
  if (count === 0) return result;

  const locale = meta.company.locale;
  const [invited, responded, admins, signature, followUp, reportLink, scoring] = await Promise.all([
    prisma.surveyResponse.count({ where: { distribution: { surveyId } } }),
    prisma.surveyResponse.count({ where: { distribution: { surveyId }, isComplete: true } }),
    prisma.companyUser.findMany({
      where: { companyId, role: "ADMIN", isActive: true },
      select: { user: { select: { email: true, name: true, firstName: true } } },
    }),
    getEmailSignature(),
    followUpPeople(companyId, meta),
    getGeneralReportLink(surveyId),
    loadSurveyForScoring(surveyId, companyId),
  ]);
  // Leaders only got a link when their team reached the anonymity threshold
  const leadersEmailed =
    !!meta.resultsEmailedAt && !!scoring && leaderIdsOf(scoring).some((id) => !leaderGaps(scoring, id, 0).suppressed);

  const seen = new Set<string>();
  for (const { user } of admins) {
    const to = user.email?.toLowerCase();
    if (!to || seen.has(to)) continue;
    seen.add(to);
    try {
      const email = adminClosingEmail(
        {
          adminFirstName: user.firstName?.trim() || firstName(user.name),
          surveyName: meta.name,
          company: meta.company.name,
          responded,
          invited,
          participationPct: invited ? Math.round((responded / invited) * 100) : 0,
          reportLink,
          leadersSentOn: leadersEmailed ? dayAndMonth(meta.resultsEmailedAt!, BUSINESS_TIME_ZONE, locale) : null,
          threshold: meta.anonymityThreshold ?? 5,
          signature,
          plans:
            meta.planMinPerLeader > 0 && meta.planDueDate
              ? { minimum: meta.planMinPerLeader, dueDate: longDay(meta.planDueDate, locale), followUpEmails: followUp.emails.join(", ") || null }
              : null,
        },
        locale,
      );
      await sendSurveyEmail(to, email);
      result.sent++;
    } catch (error) {
      console.error(`[survey-finish] Closing email to ${to} not sent:`, error);
      result.skipped.push({ name: user.name ?? to, reason: skipReason(error) });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Finishing a survey
// ---------------------------------------------------------------------------

export interface FinishResult {
  closed: boolean;
  leaderEmails: EmailRunResult;
  adminEmails: EmailRunResult;
}

/**
 * Close an active survey and run everything that follows: impact of earlier
 * plans, results to leaders and the closing report. Safe to call twice: only
 * the call that actually closes it does the rest.
 */
export async function finishSurvey(surveyId: string, companyId: string, now = new Date()): Promise<FinishResult> {
  const empty = { sent: 0, skipped: [] };
  const { count } = await prisma.climateSurvey.updateMany({
    where: { id: surveyId, companyId, status: "ACTIVE" },
    data: { status: "CLOSED", closedAt: now },
  });
  if (count === 0) return { closed: false, leaderEmails: empty, adminEmails: empty };

  const survey = await prisma.climateSurvey.findUniqueOrThrow({ where: { id: surveyId }, select: { instrumentVersion: true } });
  if (!survey.instrumentVersion) return { closed: true, leaderEmails: empty, adminEmails: empty };

  // A closed instrument survey is the follow-up for earlier action plans
  try {
    await evaluateAndNotifyPlanOutcomes(surveyId, companyId);
  } catch (error) {
    console.error("[survey-finish] Impact evaluation after close failed:", error);
  }

  let leaderEmails: EmailRunResult = empty;
  let adminEmails: EmailRunResult = empty;
  try {
    leaderEmails = (await releaseResultsAndNotify(surveyId, companyId, now)).emails;
  } catch (error) {
    console.error("[survey-finish] Releasing results after close failed:", error);
  }
  try {
    adminEmails = await sendAdminClosingEmails(surveyId, companyId, now);
  } catch (error) {
    console.error("[survey-finish] Closing report emails failed:", error);
  }
  return { closed: true, leaderEmails, adminEmails };
}

/** Closes the survey once every invited person has completed it. */
export async function finishIfEveryoneAnswered(surveyId: string, companyId: string): Promise<boolean> {
  const [invited, pending] = await Promise.all([
    prisma.surveyResponse.count({ where: { distribution: { surveyId } } }),
    prisma.surveyResponse.count({ where: { distribution: { surveyId }, isComplete: false } }),
  ]);
  if (invited === 0 || pending > 0) return false;
  return (await finishSurvey(surveyId, companyId)).closed;
}

/** Surveys whose end date passed longer ago than this stay as they are (no surprise emails on deploy). */
export const AUTO_CLOSE_WINDOW_DAYS = 7;

interface EndDateSurvey {
  accessEndDate: Date | null;
  closedAt: Date | null;
  distributions: { dueDate: Date }[];
}

/**
 * A survey's end: its access end date (a moment, set with a time), else its
 * latest distribution due date (a calendar day, stored at UTC midnight).
 */
export function surveyEndsAt(survey: EndDateSurvey): Date | null {
  if (survey.accessEndDate) return survey.accessEndDate;
  if (survey.distributions.length === 0) return null;
  return new Date(Math.max(...survey.distributions.map((d) => d.dueDate.getTime())));
}

/** Whether the daily job should close this survey now. */
export function isPastEndDate(survey: EndDateSurvey, now: Date): boolean {
  const end = surveyEndsAt(survey);
  if (!end) return false;
  const ended = survey.accessEndDate
    ? now.getTime() > end.getTime()
    : end.toISOString().slice(0, 10) < businessDay(now);
  if (!ended) return false;
  // Reopened by an admin: wait until they move the end date past that close
  if (survey.closedAt && end.getTime() <= survey.closedAt.getTime()) return false;
  return now.getTime() - end.getTime() <= (AUTO_CLOSE_WINDOW_DAYS + 1) * DAY;
}

/** Daily job: close the active surveys whose end date has passed. */
export async function finishSurveysPastEndDate(now = new Date()) {
  const surveys = await prisma.climateSurvey.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, companyId: true, accessEndDate: true, closedAt: true, distributions: { select: { dueDate: true } } },
  });
  let closed = 0;
  for (const s of surveys) {
    if (!isPastEndDate(s, now)) continue;
    try {
      if ((await finishSurvey(s.id, s.companyId, now)).closed) closed++;
    } catch (error) {
      console.error(`[survey-finish] Closing survey ${s.id} on its end date failed:`, error);
    }
  }
  return { checked: surveys.length, closed };
}
