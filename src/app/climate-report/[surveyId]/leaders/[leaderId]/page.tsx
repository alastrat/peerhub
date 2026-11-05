import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getTranslator } from "@/i18n/translator";
import { getLeaderTeamView } from "@/lib/queries/action-plans";
import { formatReportDate, getReportSurvey } from "@/lib/queries/climate-report";
import { LeaderReport } from "@/components/climate/report/leader-report";

interface PageProps {
  params: Promise<{ surveyId: string; leaderId: string }>;
}

/**
 * Who may read a leader's report, with the same rules as the leader views:
 * company admins see any leader at any time; the leader sees their own team
 * after results are released, signed in to the dashboard or the portal.
 */
type Access =
  | { allowed: true; companyId: string; requireRelease: boolean; backHref: string }
  | { allowed: false; signedIn: boolean };

const resolveAccess = cache(async (surveyId: string, leaderId: string): Promise<Access> => {
  const session = await auth();
  const cu = session?.companyUser;
  const dashboardBack = `/action-plans/${surveyId}/${leaderId}`;
  if (cu?.role === "ADMIN") {
    return { allowed: true, companyId: cu.companyId, requireRelease: false, backHref: dashboardBack };
  }
  if (cu?.employeeId === leaderId) {
    return { allowed: true, companyId: cu.companyId, requireRelease: true, backHref: dashboardBack };
  }
  const portal = await getPortalSession();
  if (portal?.employeeId === leaderId) {
    return {
      allowed: true,
      companyId: portal.companyId,
      requireRelease: true,
      backHref: `/portal/climate-results/${surveyId}`,
    };
  }
  return { allowed: false, signedIn: !!cu || !!portal };
});

const loadReport = cache(async (surveyId: string, leaderId: string) => {
  const access = await resolveAccess(surveyId, leaderId);
  if (!access.allowed) return null;
  const [survey, view] = await Promise.all([
    getReportSurvey(surveyId, access.companyId),
    getLeaderTeamView(surveyId, leaderId, access.companyId, { requireRelease: access.requireRelease }),
  ]);
  if (!survey || !view) return null;
  return { survey, view, backHref: access.backHref };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { surveyId, leaderId } = await params;
  const report = await loadReport(surveyId, leaderId);
  if (!report) return {};
  const t = getTranslator(report.survey.locale, "climate_report");
  return { title: t("document_title_leader", { name: report.survey.cover.surveyName, leader: report.view.leader.name }) };
}

export default async function LeaderReportPage({ params }: PageProps) {
  const { surveyId, leaderId } = await params;
  const access = await resolveAccess(surveyId, leaderId);
  if (!access.allowed && !access.signedIn) {
    redirect(`/portal?redirect=${encodeURIComponent(`/climate-report/${surveyId}/leaders/${leaderId}`)}`);
  }
  const report = await loadReport(surveyId, leaderId);
  if (!report) notFound();
  const messages = await getMessages({ locale: report.survey.locale });

  return (
    <NextIntlClientProvider locale={report.survey.locale} messages={messages}>
      <LeaderReport
        survey={report.survey}
        view={report.view}
        generatedOn={formatReportDate(new Date(), report.survey.locale)}
        backHref={report.backHref}
      />
    </NextIntlClientProvider>
  );
}
