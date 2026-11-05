import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { getTranslator } from "@/i18n/translator";
import { formatReportDate, getReportSurvey } from "@/lib/queries/climate-report";
import { getSurveyResults } from "@/lib/queries/climate-reports";
import { ClimateReport } from "@/components/climate/report/climate-report";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * The general report behind the closing email's link (Modelo 3): anyone with
 * the link sees it, without signing in, once the survey has closed. The same
 * anonymity threshold applies as in the dashboard.
 */
const loadShared = cache(async (token: string) => {
  if (!token || token.length < 20) return null;
  const survey = await prisma.climateSurvey.findUnique({
    where: { reportToken: token },
    select: { id: true, companyId: true, status: true },
  });
  if (!survey || survey.status !== "CLOSED") return null;
  const report = await getReportSurvey(survey.id, survey.companyId);
  return report ? { ...survey, report } : null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const shared = await loadShared((await params).token);
  if (!shared) return {};
  const t = getTranslator(shared.report.locale, "climate_report");
  return { title: t("document_title", { name: shared.report.cover.surveyName }) };
}

export default async function SharedClimateReportPage({ params }: PageProps) {
  const shared = await loadShared((await params).token);
  if (!shared) notFound();
  const [results, messages] = await Promise.all([
    getSurveyResults(shared.id, shared.companyId),
    getMessages({ locale: shared.report.locale }),
  ]);

  return (
    <NextIntlClientProvider locale={shared.report.locale} messages={messages}>
      <ClimateReport survey={shared.report} results={results} generatedOn={formatReportDate(new Date(), shared.report.locale)} />
    </NextIntlClientProvider>
  );
}
