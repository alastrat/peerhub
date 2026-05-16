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
  // The card list only consumes id / name / description / status / type
  // plus three counts — there's no reason to hydrate the full question
  // rows or every response object just to call `.length` on them. We
  // pull only the scalars + relation counts so this scales linearly with
  // surveys instead of surveys × questions × responses.
  return prisma.climateSurvey.findMany({
    where: {
      companyId,
      status: { not: "ARCHIVED" },
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      type: true,
      _count: { select: { questions: true } },
      distributions: {
        select: {
          _count: {
            select: {
              // Prisma supports per-relation filtered counts via this
              // nested `where`; "responses" appears twice with different
              // filters using key aliasing on the result object.
              responses: true,
            },
          },
          // Filtered count for "completed only". Prisma can't alias a
          // second count of the same relation, so fetch just the
          // isComplete flag (1 byte/row) and sum client-side.
          responses: { select: { isComplete: true } },
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
  // Both round-trips are independent — fire them in parallel instead of
  // serializing. Cuts the loader's wall-clock from ~feature+~surveys
  // down to max(feature, surveys).
  const [company, surveys] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { featureWorkEnv: true },
    }),
    getSurveys(companyId, type),
  ]);

  if (!company?.featureWorkEnv) {
    redirect("/overview");
  }

  const surveyData = surveys.map((survey) => {
    const totalResponses = survey.distributions.reduce(
      (acc, d) => acc + d._count.responses,
      0,
    );
    const completedResponses = survey.distributions.reduce(
      (acc, d) => acc + d.responses.filter((r) => r.isComplete).length,
      0,
    );

    return {
      id: survey.id,
      name: survey.name,
      description: survey.description,
      status: survey.status,
      type: survey.type,
      questionCount: survey._count.questions,
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
