import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { PortalClimateSurveyFlow } from "@/components/portal/portal-climate-survey-flow";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Survey preview",
  robots: { index: false, follow: false },
};

/**
 * Public preview route. Anyone with the survey ID can see what respondents
 * would see. No authentication, no submission — it's a read-only walkthrough.
 */
export default async function SurveyPreviewPage({ params }: PageProps) {
  const { id } = await params;

  const survey = await prisma.climateSurvey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { dimension: { select: { name: true } } },
      },
    },
  });

  if (!survey) notFound();

  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("portal.climate_survey");

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
    <div className="min-h-screen">
      {/* Thin preview banner so testers know they're on a preview page */}
      <div className="border-b bg-amber-50 text-amber-900">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2 text-xs">
          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">
            {t("preview_banner_label")}
          </Badge>
          <span>
            {t.rich("preview_banner_body", {
              name: survey.name,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </span>
        </div>
      </div>

      <main>
        <PortalClimateSurveyFlow
          distributionId={`preview-${survey.id}`}
          surveyName={survey.name}
          surveyType={survey.type}
          isAnonymous={survey.isAnonymous}
          welcomeTitle={survey.welcomeTitle}
          welcomeBody={survey.welcomeBody}
          welcomeBannerUrl={survey.welcomeBannerUrl}
          welcomeCtaText={survey.welcomeCtaText}
          themeColor={survey.themeColor}
          wallpaperConfig={survey.wallpaperConfig}
          colorConfig={survey.colorConfig}
          thankYouTitle={survey.thankYouTitle}
          thankYouBody={survey.thankYouBody}
          thankYouCtaText={survey.thankYouCtaText}
          logoUrl={survey.logoUrl}
          questionsPerPage={survey.questionsPerPage}
          dueDateLabel="—"
          daysLeft={999}
          isOverdue={false}
          questions={survey.questions.map((q) => ({
            id: q.id,
            text: q.text,
            description: null,
            type: q.type,
            isRequired: q.isRequired,
            order: q.order,
            config: q.config as Record<string, unknown> | null,
            dimensionName: q.dimension?.name ?? null,
          }))}
          draftAnswers={{}}
          previewMode
        />
      </main>
    </div>
    </NextIntlClientProvider>
  );
}
