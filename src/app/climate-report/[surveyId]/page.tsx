import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getTranslator } from "@/i18n/translator";
import { formatReportDate, getReportSurvey } from "@/lib/queries/climate-report";
import { getSurveyResults } from "@/lib/queries/climate-reports";
import { ClimateReport } from "@/components/climate/report/climate-report";

interface PageProps {
  params: Promise<{ surveyId: string }>;
}

/** The survey, for company admins only (the same people who see the Análisis tab). */
const loadSurvey = cache(async (surveyId: string) => {
  const session = await auth();
  const cu = session?.companyUser;
  if (!cu || cu.role !== "ADMIN") return null;
  return getReportSurvey(surveyId, cu.companyId);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const survey = await loadSurvey((await params).surveyId);
  if (!survey) return {};
  // The title is the default file name of "Save as PDF"
  const t = getTranslator(survey.locale, "climate_report");
  return { title: t("document_title", { name: survey.cover.surveyName }) };
}

export default async function ClimateReportPage({ params }: PageProps) {
  const { surveyId } = await params;
  const session = await auth();
  if (!session?.companyUser) redirect("/login");
  if (session.companyUser.role !== "ADMIN") redirect("/overview");

  const survey = await loadSurvey(surveyId);
  if (!survey) notFound();
  const companyId = session.companyUser.companyId;
  const hasResults = survey.status === "ACTIVE" || survey.status === "CLOSED";
  const [results, messages] = await Promise.all([
    hasResults ? getSurveyResults(surveyId, companyId) : Promise.resolve(null),
    getMessages({ locale: survey.locale }),
  ]);

  return (
    <NextIntlClientProvider locale={survey.locale} messages={messages}>
      <ClimateReport
        survey={survey}
        results={results}
        generatedOn={formatReportDate(new Date(), survey.locale)}
        backHref={`/surveys/climate/${surveyId}`}
      />
    </NextIntlClientProvider>
  );
}
