import { Suspense } from "react";
import Link from "next/link";
import { Plus, Thermometer, MoreHorizontal, Copy, Archive } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/utils/dates";
import { redirect } from "next/navigation";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  CLIMATE_SURVEY_STATUS_LABELS,
  CLIMATE_SURVEY_STATUS_COLORS,
} from "@/lib/constants/climate-survey";

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

async function SurveysList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  // Check feature flag
  const company = await prisma.company.findUnique({
    where: { id: session.companyUser.companyId },
    select: { featureWorkEnv: true },
  });
  if (!company?.featureWorkEnv) {
    redirect("/overview");
  }

  const surveys = await getSurveys(session.companyUser.companyId);

  if (surveys.length === 0) {
    return (
      <EmptyState
        icon={<Thermometer className="h-8 w-8 text-muted-foreground" />}
        title="No surveys yet"
        description="Create your first work environment survey to start measuring employee engagement."
        action={
          <Link href="/surveys/climate/new">
            <Button>Create Survey</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {surveys.map((survey) => {
        const totalResponses = survey.distributions.reduce(
          (acc, d) => acc + d._count.responses,
          0
        );
        const completedResponses = survey.distributions.reduce(
          (acc, d) => acc + d.responses.length,
          0
        );

        return (
          <Card key={survey.id} className="group relative transition-shadow hover:shadow-md">
            <Link href={`/surveys/climate/${survey.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{survey.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {survey.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{survey.questions.length} questions</span>
                  {totalResponses > 0 && (
                    <>
                      <span>·</span>
                      <span>{completedResponses}/{totalResponses} responses</span>
                    </>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={CLIMATE_SURVEY_STATUS_COLORS[survey.status] as "default" | "secondary" | "outline"}>
                    {CLIMATE_SURVEY_STATUS_LABELS[survey.status]}
                  </Badge>
                  <Badge variant="secondary">
                    {CLIMATE_SURVEY_TYPE_LABELS[survey.type]}
                  </Badge>
                </div>
              </CardContent>
            </Link>
            <div className="absolute right-4 top-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default async function ClimateSurveysPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Environment"
        description="Create and manage climate surveys, pulse checks, and eNPS"
      >
        <Link href="/surveys/climate/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        </Link>
      </PageHeader>

      <Suspense fallback={<SurveysLoading />}>
        <SurveysList />
      </Suspense>
    </div>
  );
}
