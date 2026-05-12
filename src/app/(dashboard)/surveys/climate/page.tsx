import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ClimateSurveyType } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimateContent } from "@/components/dashboard/climate-content";
import { CLIMATE_SURVEY_TYPE_LABELS } from "@/lib/constants/climate-survey";

const VALID_TYPES = new Set(Object.values(ClimateSurveyType));

function parseTypeParam(raw: string | undefined): ClimateSurveyType | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return VALID_TYPES.has(upper as ClimateSurveyType)
    ? (upper as ClimateSurveyType)
    : null;
}

async function getSurveys(
  companyId: string,
  type: ClimateSurveyType | null,
) {
  return prisma.climateSurvey.findMany({
    where: {
      companyId,
      status: { not: "ARCHIVED" },
      ...(type ? { type } : {}),
    },
    include: {
      questions: true,
      distributions: {
        include: {
          _count: { select: { responses: true } },
          responses: { where: { isComplete: true }, select: { id: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function SurveysLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SurveysLoader({
  companyId,
  type,
}: {
  companyId: string;
  type: ClimateSurveyType | null;
}) {
  // Check feature flag
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { featureWorkEnv: true },
  });
  if (!company?.featureWorkEnv) {
    redirect("/overview");
  }

  const surveys = await getSurveys(companyId, type);

  const surveyData = surveys.map((survey) => {
    const totalResponses = survey.distributions.reduce(
      (acc, d) => acc + d._count.responses,
      0
    );
    const completedResponses = survey.distributions.reduce(
      (acc, d) => acc + d.responses.length,
      0
    );

    return {
      id: survey.id,
      name: survey.name,
      description: survey.description,
      status: survey.status,
      type: survey.type,
      questionCount: survey.questions.length,
      totalResponses,
      completedResponses,
    };
  });

  const typeLabel = type ? CLIMATE_SURVEY_TYPE_LABELS[type] : null;

  return <ClimateContent surveys={surveyData} typeLabel={typeLabel} />;
}

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function ClimateSurveysPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const { type: rawType } = await searchParams;
  const type = parseTypeParam(rawType);

  return (
    <Suspense fallback={<SurveysLoading />}>
      <SurveysLoader
        companyId={session.companyUser.companyId}
        type={type}
      />
    </Suspense>
  );
}
