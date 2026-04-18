import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { SurveyWizard } from "@/components/climate/survey-wizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClimateSurveyPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const [survey, dimensions, templates] = await Promise.all([
    prisma.climateSurvey.findFirst({
      where: { id, companyId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    }),
    prisma.climateDimension.findMany({
      where: {
        OR: [{ companyId }, { companyId: null, isDefault: true }],
      },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.climateSurveyTemplate.findMany({
      where: {
        isArchived: false,
        OR: [{ companyId }, { companyId: null, isDefault: true }],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { questions: { orderBy: { order: "asc" } } },
    }),
  ]);

  if (!survey) notFound();

  const initialData = {
    id: survey.id,
    name: survey.name,
    description: survey.description,
    type: survey.type,
    frequency: survey.frequency,
    isAnonymous: survey.isAnonymous,
    templateId: survey.templateId,
    welcomeTitle: survey.welcomeTitle,
    welcomeBody: survey.welcomeBody,
    welcomeBannerUrl: survey.welcomeBannerUrl,
    welcomeCtaText: survey.welcomeCtaText,
    themeColor: survey.themeColor,
    thankYouTitle: survey.thankYouTitle,
    thankYouBody: survey.thankYouBody,
    thankYouCtaText: survey.thankYouCtaText,
    wallpaperConfig: survey.wallpaperConfig,
    colorConfig: survey.colorConfig,
    questionsPerPage: survey.questionsPerPage,
    questions: survey.questions.map((q) => ({
      text: q.text,
      type: q.type as "LIKERT" | "TEXT" | "NPS" | "RATING",
      dimensionId: q.dimensionId ?? "",
      isRequired: q.isRequired,
    })),
  };

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type,
    isDefault: t.isDefault,
    questionCount: t.questions.length,
    questions: t.questions.map((q) => ({
      text: q.text,
      type: q.type as "LIKERT" | "TEXT" | "NPS" | "RATING",
      dimensionId: q.dimensionId ?? "",
      isRequired: q.isRequired,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/surveys/climate/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Edit: ${survey.name}`}
          description={
            survey.status === "DRAFT"
              ? "Modify this draft survey"
              : "Edit appearance and presentation settings"
          }
        />
      </div>
      <SurveyWizard
        dimensions={dimensions}
        templates={templateOptions}
        mode="edit"
        initialData={initialData}
      />
    </div>
  );
}
