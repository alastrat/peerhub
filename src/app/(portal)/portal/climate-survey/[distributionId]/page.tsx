import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/db/prisma";
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

  const session = await getPortalSession();
  if (!session) {
    redirect("/portal");
  }

  const distribution = await prisma.surveyDistribution.findFirst({
    where: { id: distributionId },
    include: {
      survey: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { dimension: { select: { name: true } } },
          },
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

  const existingResponse = distribution.responses[0];
  if (existingResponse?.isComplete) {
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
            description="Ya has completado esta encuesta"
          />
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Gracias por tu participación. Tus respuestas han sido registradas.
            </p>
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

  // Break out of the portal layout's max-w container so the wallpaper fills full viewport width
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
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
      logoUrl={distribution.survey.logoUrl}
      questionsPerPage={distribution.survey.questionsPerPage}
      dueDateLabel={formatDate(distribution.dueDate)}
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
    />
    </div>
  );
}
