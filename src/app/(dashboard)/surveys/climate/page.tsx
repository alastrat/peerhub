import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClimateContent } from "@/components/dashboard/climate-content";

async function getSurveys(companyId: string) {
  return prisma.climateSurvey.findMany({
    where: { companyId, status: { not: "ARCHIVED" } },
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

async function SurveysLoader({ companyId }: { companyId: string }) {
  // Check feature flag
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { featureWorkEnv: true },
  });
  if (!company?.featureWorkEnv) {
    redirect("/overview");
  }

  const surveys = await getSurveys(companyId);

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

  return <ClimateContent surveys={surveyData} />;
}

export default async function ClimateSurveysPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<SurveysLoading />}>
      <SurveysLoader companyId={session.companyUser.companyId} />
    </Suspense>
  );
}
