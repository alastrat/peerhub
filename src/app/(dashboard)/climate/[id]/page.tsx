import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, BarChart3, Send } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  CLIMATE_SURVEY_STATUS_LABELS,
  CLIMATE_SURVEY_STATUS_COLORS,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
} from "@/lib/constants/climate-survey";
import { formatRelativeTime } from "@/lib/utils/dates";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSurvey(companyId: string, surveyId: string) {
  return prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    include: {
      questions: {
        include: { dimension: { select: { name: true } } },
        orderBy: { order: "asc" },
      },
      distributions: {
        include: {
          _count: { select: { responses: true } },
          responses: { where: { isComplete: true }, select: { id: true } },
        },
        orderBy: { sentAt: "desc" },
      },
    },
  });
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const survey = await getSurvey(session.companyUser.companyId, id);
  if (!survey) notFound();

  const totalResponses = survey.distributions.reduce(
    (acc, d) => acc + d._count.responses, 0
  );
  const completedResponses = survey.distributions.reduce(
    (acc, d) => acc + d.responses.length, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/climate">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={survey.name}
          description={survey.description || "No description"}
        />
        <div className="ml-auto flex gap-2">
          {survey.status === "DRAFT" && (
            <Button variant="outline" asChild>
              <Link href={`/climate/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {(survey.status === "ACTIVE" || survey.status === "CLOSED") && (
            <Button variant="outline" asChild>
              <Link href={`/climate/${id}/results`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Results
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant={CLIMATE_SURVEY_STATUS_COLORS[survey.status] as "default" | "secondary" | "outline"}>
                {CLIMATE_SURVEY_STATUS_LABELS[survey.status]}
              </Badge>
              <Badge variant="secondary">
                {CLIMATE_SURVEY_TYPE_LABELS[survey.type]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Status & Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{survey.questions.length}</div>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completedResponses}/{totalResponses}</div>
            <p className="text-sm text-muted-foreground">Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {SURVEY_FREQUENCY_LABELS[survey.frequency]}
            </div>
            <p className="text-sm text-muted-foreground">Frequency</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {survey.isAnonymous ? "Anonymous survey" : "Non-anonymous survey"} · {survey.questions.length} questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {survey.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{q.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                    </Badge>
                    {q.dimension && (
                      <Badge variant="secondary" className="text-xs">
                        {q.dimension.name}
                      </Badge>
                    )}
                    {q.isRequired && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distributions */}
      {survey.distributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {survey.distributions.map((dist) => (
                <div key={dist.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">
                      Sent {dist.sentAt ? formatRelativeTime(dist.sentAt) : "Not sent"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatRelativeTime(dist.dueDate)} · Target: {dist.targetType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {dist.responses.length}/{dist._count.responses} completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dist._count.responses > 0
                        ? Math.round((dist.responses.length / dist._count.responses) * 100)
                        : 0}% completion
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
