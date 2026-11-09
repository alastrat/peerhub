"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { actionError } from "@/lib/auth/action-locale";
import { createPortalSession } from "@/lib/auth/portal-session";
import {
  consumeSurveyLink,
  createSurveyLinks,
  SurveyLinkError,
  type CreatedSurveyLink,
  type SurveyLinkBatch,
} from "@/lib/climate/survey-links";
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

/**
 * A new personal link for one participant without an email who hasn't
 * answered (their unused one stops working). Nobody else can get one.
 */
export async function createSurveyLink(surveyId: string, employeeId: string): Promise<ActionResult<CreatedSurveyLink>> {
  try {
    const companyId = await requireCompanyAdmin();
    if (!companyId) return actionError("unauthorized");
    const { links, ended } = await createSurveyLinks(companyId, surveyId, [employeeId]);
    if (links[0]) return { success: true, data: links[0] };
    return actionError(ended.length > 0 ? "survey_link_ended" : "survey_link_not_available");
  } catch (error) {
    return linkError(error);
  }
}

/** New personal links for every participant without an email who hasn't answered, for the CSV download. */
export async function createSurveyLinksWithoutEmail(surveyId: string): Promise<ActionResult<SurveyLinkBatch>> {
  try {
    const companyId = await requireCompanyAdmin();
    if (!companyId) return actionError("unauthorized");
    const batch = await createSurveyLinks(companyId, surveyId);
    batch.links.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return { success: true, data: batch };
  } catch (error) {
    return linkError(error);
  }
}

/**
 * The "Comenzar" button of a personal link's page: uses the link and signs
 * the person into the portal for that survey only, until the link would
 * have expired. When the link can't be used, its page explains why.
 */
export async function openSurveyLink(token: string): Promise<void> {
  const state = await consumeSurveyLink(token);
  if (state.status !== "valid") redirect(`/portal/link/${encodeURIComponent(token)}`);
  await createPortalSession(state.employeeId, state.companyId, state.email, {
    distributionId: state.distributionId,
    expiresAt: state.expiresAt,
  });
  redirect(`/portal/climate-survey/${state.distributionId}`);
}
