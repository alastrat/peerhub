// Personal survey links for people without a corporate email (proposal to
// validate with Kultiva): an admin copies the link or sends it by WhatsApp;
// opening it once signs the person into the portal on that survey.
//
// - One link per person and survey distribution, used once. Generating a
//   new one removes their unused ones for the survey.
// - It expires at the survey's end (access end date, else the
//   distribution's due date) or after 30 days, whichever comes first.
// - It only works while the survey is active and the company is active, and
//   only for the company, survey and person it was made for.
// - Opening the page doesn't use it up (WhatsApp and other apps fetch links
//   to build previews): the person presses "Comenzar" to use it.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { endOfBusinessDay } from "@/lib/constants/business-time";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;

export const SURVEY_LINK_MAX_DAYS = 30;

/** Where a personal survey link lands. */
export function surveyLinkUrl(token: string): string {
  return `${APP_URL}/portal/link/${token}`;
}

/**
 * When a link made now expires: the survey's end, or after 30 days if that
 * comes first. Null when the survey's end already passed. `accessEndDate` is
 * a moment; a due date is a calendar day, which ends at midnight in business time.
 */
export function surveyLinkExpiry(
  survey: { accessEndDate: Date | null },
  distribution: { dueDate: Date },
  now: Date = new Date(),
): Date | null {
  const end = survey.accessEndDate ?? endOfBusinessDay(distribution.dueDate);
  if (end.getTime() <= now.getTime()) return null;
  const cap = new Date(now.getTime() + SURVEY_LINK_MAX_DAYS * DAY);
  return end.getTime() < cap.getTime() ? end : cap;
}

export class SurveyLinkError extends Error {
  constructor(readonly key: "survey_not_found" | "survey_link_not_active" | "survey_link_ended" | "survey_link_not_participant") {
    super(key);
  }
}

export interface CreatedSurveyLink {
  employeeId: string;
  name: string;
  nationalId: string | null;
  phone: string | null;
  url: string;
  expiresAt: Date;
}

/**
 * New single-use links for these people in a survey of this company, one
 * per person, for the latest distribution that includes them. Their unused
 * links for the survey stop working. People who aren't participants (or
 * aren't in the company) get none.
 */
export async function createSurveyLinks(
  companyId: string,
  surveyId: string,
  employeeIds: string[],
  now: Date = new Date(),
): Promise<CreatedSurveyLink[]> {
  const survey = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    select: { id: true, status: true, accessEndDate: true, company: { select: { isActive: true } } },
  });
  if (!survey) throw new SurveyLinkError("survey_not_found");
  if (survey.status !== "ACTIVE" || !survey.company.isActive) throw new SurveyLinkError("survey_link_not_active");

  // Their latest distribution in this survey; the company and the person are checked here too
  const responses = await prisma.surveyResponse.findMany({
    where: {
      employeeId: { in: employeeIds },
      distribution: { surveyId: survey.id },
      employee: { companyId, isActive: true },
    },
    select: {
      employeeId: true,
      distributionId: true,
      distribution: { select: { dueDate: true } },
      employee: { select: { name: true, email: true, nationalId: true, phone: true } },
    },
    orderBy: { distribution: { createdAt: "desc" } },
  });
  const latest = new Map<string, (typeof responses)[number]>();
  for (const r of responses) if (r.employeeId && !latest.has(r.employeeId)) latest.set(r.employeeId, r);
  if (latest.size === 0) throw new SurveyLinkError("survey_link_not_participant");

  const links = [...latest.values()].map((r) => {
    const expiresAt = surveyLinkExpiry(survey, r.distribution, now);
    if (!expiresAt) throw new SurveyLinkError("survey_link_ended");
    return { response: r, token: randomBytes(18).toString("base64url"), expiresAt };
  });

  await prisma.$transaction([
    // A new link replaces the person's unused ones for this survey
    prisma.accessToken.deleteMany({
      where: {
        companyId,
        purpose: "SURVEY_LINK",
        usedAt: null,
        employeeId: { in: [...latest.keys()] },
        distribution: { surveyId: survey.id },
      },
    }),
    prisma.accessToken.createMany({
      data: links.map(({ response: r, token, expiresAt }) => ({
        token,
        email: r.employee!.email,
        companyId,
        employeeId: r.employeeId!,
        distributionId: r.distributionId,
        purpose: "SURVEY_LINK" as const,
        expiresAt,
      })),
    }),
  ]);

  return links.map(({ response: r, token, expiresAt }) => ({
    employeeId: r.employeeId!,
    name: r.employee!.name,
    nationalId: r.employee!.nationalId,
    phone: r.employee!.phone,
    url: surveyLinkUrl(token),
    expiresAt,
  }));
}

export type SurveyLinkState =
  | { status: "invalid" }
  | {
      /** valid: can be used now; used: already opened; expired; closed: the survey no longer takes answers */
      status: "valid" | "used" | "expired" | "closed";
      id: string;
      employeeId: string;
      companyId: string;
      email: string | null;
      distributionId: string;
      firstName: string;
      surveyName: string;
      companyName: string;
    };

/** What a personal survey link would do if opened now, without using it. */
export async function describeSurveyLink(token: string, now: Date = new Date()): Promise<SurveyLinkState> {
  if (!token || token.length > 64) return { status: "invalid" };
  const link = await prisma.accessToken.findUnique({
    where: { token },
    select: {
      id: true,
      purpose: true,
      companyId: true,
      email: true,
      usedAt: true,
      expiresAt: true,
      company: { select: { name: true, isActive: true } },
      employee: { select: { id: true, name: true, companyId: true, isActive: true } },
      distribution: { select: { id: true, survey: { select: { name: true, status: true, companyId: true } } } },
    },
  });
  if (!link || link.purpose !== "SURVEY_LINK" || !link.employee || !link.distribution) return { status: "invalid" };
  // Only for the company it was made in: its person and its survey
  if (link.employee.companyId !== link.companyId || link.distribution.survey.companyId !== link.companyId) {
    return { status: "invalid" };
  }

  const info = {
    id: link.id,
    employeeId: link.employee.id,
    companyId: link.companyId,
    email: link.email,
    distributionId: link.distribution.id,
    firstName: link.employee.name.trim().split(/\s+/)[0] ?? "",
    surveyName: link.distribution.survey.name,
    companyName: link.company.name,
  };
  if (link.distribution.survey.status !== "ACTIVE" || !link.company.isActive || !link.employee.isActive) {
    return { status: "closed", ...info };
  }
  if (link.usedAt) return { status: "used", ...info };
  if (link.expiresAt.getTime() <= now.getTime()) return { status: "expired", ...info };
  return { status: "valid", ...info };
}

/**
 * Use a link: only the first call for a valid link succeeds (a conditional
 * update, so two quick taps can't both sign in). Returns the link's state
 * otherwise.
 */
export async function consumeSurveyLink(token: string, now: Date = new Date()): Promise<SurveyLinkState> {
  const state = await describeSurveyLink(token, now);
  if (state.status !== "valid") return state;
  const { count } = await prisma.accessToken.updateMany({
    where: { id: state.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return count === 1 ? state : { ...state, status: "used" };
}
