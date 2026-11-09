"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { actionError } from "@/lib/auth/action-locale";
import { createPortalSession } from "@/lib/auth/portal-session";
import { consumeSurveyLink, createSurveyLinks, SurveyLinkError, type CreatedSurveyLink } from "@/lib/climate/survey-links";
import type { ActionResult } from "@/types";

/** Company admins (or a super admin in the company they're working in) only. */
async function requireCompanyAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const isAdmin = session.user.globalRole === "SUPER_ADMIN" || session.companyUser?.role === "ADMIN";
  return isAdmin ? (session.companyUser?.companyId ?? null) : null;
}

function linkError(error: unknown) {
  if (error instanceof SurveyLinkError) return actionError(error.key);
  console.error("[survey-links] Couldn't create links:", error);
  return actionError("survey_link_failed");
}

/** A new personal link for one participant (their unused one stops working). */
export async function createSurveyLink(surveyId: string, employeeId: string): Promise<ActionResult<CreatedSurveyLink>> {
  try {
    const companyId = await requireCompanyAdmin();
    if (!companyId) return actionError("unauthorized");
    const [link] = await createSurveyLinks(companyId, surveyId, [employeeId]);
    return { success: true, data: link };
  } catch (error) {
    return linkError(error);
  }
}

/** New personal links for every participant without an email, for the CSV download. */
export async function createSurveyLinksWithoutEmail(surveyId: string): Promise<ActionResult<CreatedSurveyLink[]>> {
  try {
    const companyId = await requireCompanyAdmin();
    if (!companyId) return actionError("unauthorized");
    const participants = await prisma.surveyResponse.findMany({
      where: { distribution: { surveyId, survey: { companyId } }, employee: { companyId, isActive: true, email: null } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    });
    const ids = participants.flatMap((p) => (p.employeeId ? [p.employeeId] : []));
    if (ids.length === 0) return { success: true, data: [] };
    const links = await createSurveyLinks(companyId, surveyId, ids);
    return { success: true, data: links.sort((a, b) => a.name.localeCompare(b.name, "es")) };
  } catch (error) {
    return linkError(error);
  }
}

/**
 * The "Comenzar" button of a personal link's page: uses the link, signs the
 * person into the portal and opens their survey. When the link can't be
 * used, its page explains why.
 */
export async function openSurveyLink(token: string): Promise<void> {
  const state = await consumeSurveyLink(token);
  if (state.status !== "valid") redirect(`/portal/link/${encodeURIComponent(token)}`);
  await createPortalSession(state.employeeId, state.companyId, state.email);
  redirect(`/portal/climate-survey/${state.distributionId}`);
}
