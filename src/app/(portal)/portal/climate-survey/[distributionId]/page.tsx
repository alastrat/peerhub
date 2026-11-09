import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { prisma } from "@/lib/db/prisma";
import { getPlatformTheme } from "@/lib/queries/platform-theme";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PortalClimateSurveyFlow } from "@/components/portal/portal-climate-survey-flow";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";

interface PageProps {
  params: Promise<{ distributionId: string }>;
}

export default async function PortalClimateSurveyPage({ params }: PageProps) {
  const { distributionId } = await params;

  // A survey link's session counts here, for its own survey only
  const session = await getPortalSession({ distributionId });
  if (!session) {
    redirect("/portal");
  }

  const distribution = await prisma.surveyDistribution.findFirst({
    // Only the signed-in person's company's surveys
    where: { id: distributionId, survey: { companyId: session.companyId } },
    include: {
      survey: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { dimension: { select: { name: true } } },
          },
          company: { select: { logo: true, name: true } },
        },
      },
      responses: {
        where: { employeeId: session.employeeId },
        include: { answers: true },
      },
    },
  });

  if (!distribution || distribution.survey.status !== "ACTIVE") {
    notFound();
  }

  const locale = await getPortalLocale();
  const existingResponse = distribution.responses[0];
  if (existingResponse?.isComplete) {
    const t = await getTranslations({ locale, namespace: "portal.climate_survey" });
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PageHeader
            title={distribution.survey.name}
            description={t("already_completed")}
          />
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("already_completed_body")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLeft = daysUntil(distribution.dueDate);
  const isOverdue = isDateInPast(distribution.dueDate);

  // Map existing answers into draft format
  const draftAnswers: Record<string, { ratingValue?: number; textValue?: string }> = {};
  if (existingResponse) {
    for (const ans of existingResponse.answers) {
      draftAnswers[ans.questionId] = {
        ratingValue: ans.ratingValue ?? undefined,
        textValue: ans.textValue ?? undefined,
      };
    }
  }

  const platformTheme = await getPlatformTheme();
  const respondent = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { name: true },
  });

  // Break out of the portal layout's max-w container so the wallpaper fills
  // full viewport width. The opaque background keeps the portal header from
  // showing through wallpapers that are partly transparent.
  return (
    <div data-app-shell="survey" className="fixed inset-0 z-40 overflow-y-auto bg-background">
    <PortalClimateSurveyFlow
      distributionId={distribution.id}
      surveyName={distribution.survey.name}
      surveyType={distribution.survey.type}
      isAnonymous={distribution.survey.isAnonymous}
      welcomeTitle={distribution.survey.welcomeTitle}
      welcomeBody={distribution.survey.welcomeBody}
      welcomeBannerUrl={distribution.survey.welcomeBannerUrl}
      welcomeCtaText={distribution.survey.welcomeCtaText}
      themeColor={distribution.survey.themeColor}
      wallpaperConfig={distribution.survey.wallpaperConfig}
      colorConfig={distribution.survey.colorConfig}
      thankYouTitle={distribution.survey.thankYouTitle}
      thankYouBody={distribution.survey.thankYouBody}
      thankYouCtaText={distribution.survey.thankYouCtaText}
      logoUrl={distribution.survey.logoUrl ?? distribution.survey.company.logo}
      companyName={distribution.survey.company.name}
      respondentName={respondent?.name}
      questionsPerPage={distribution.survey.questionsPerPage}
      dueDateLabel={formatDate(distribution.dueDate, undefined, locale)}
      daysLeft={daysLeft}
      isOverdue={isOverdue}
      questions={distribution.survey.questions.map((q) => ({
        id: q.id,
        text: q.text,
        description: null,
        type: q.type,
        isRequired: q.isRequired,
        order: q.order,
        config: q.config as Record<string, unknown> | null,
        dimensionName: q.dimension?.name ?? null,
      }))}
      draftAnswers={draftAnswers}
      platformTheme={platformTheme}
    />
    </div>
  );
}
