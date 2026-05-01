import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  FileText,
  MessageSquare,
  Settings,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  CLIMATE_SURVEY_STATUS_LABELS,
  CLIMATE_SURVEY_STATUS_COLORS,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
} from "@/lib/constants/climate-survey";
import { formatRelativeTime } from "@/lib/utils/dates";
import { DistributeDialog } from "@/components/climate/distribute-dialog";
import { SurveyDetailActions } from "@/components/climate/survey-detail-actions";
import { SurveyAnswersTab } from "@/components/climate/survey-answers-tab";
import { SurveySettingsTab } from "@/components/climate/survey-settings-tab";
import { SurveyInsightsTab } from "@/components/climate/survey-insights-tab";
import { getSurveyResults } from "@/lib/queries/climate-reports";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSurvey(companyId: string, surveyId: string) {
  return prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    include: {
      questions: {
        include: { dimension: { select: { id: true, name: true } } },
        orderBy: { order: "asc" },
      },
      distributions: {
        include: {
          _count: { select: { responses: true } },
          responses: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  title: true,
                  department: { select: { name: true } },
                  hub: { select: { name: true } },
                },
              },
              answers: {
                select: {
                  questionId: true,
                  ratingValue: true,
                  textValue: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
              _count: { select: { answers: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
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
  const t = await getTranslations("dashboard.climate.detail");

  const companyId = session.companyUser.companyId;
  const survey = await getSurvey(companyId, id);
  if (!survey) notFound();

  const isDraft = survey.status === "DRAFT";
  const isActiveOrClosed =
    survey.status === "ACTIVE" || survey.status === "CLOSED";

  // Only fetch targeting options for draft surveys (used by DistributeDialog)
  const [hubs, departments, teams, employees, company] = isDraft
    ? await Promise.all([
        prisma.hub.findMany({
          where: { companyId, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.department.findMany({
          where: { companyId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.team.findMany({
          where: { companyId, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.employee.findMany({
          where: { companyId, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        }),
        prisma.company.findUnique({
          where: { id: companyId },
          select: { featureHubs: true },
        }),
      ])
    : [[], [], [], [], null];

  // Fetch insights data for active/closed surveys
  const results = isActiveOrClosed
    ? await getSurveyResults(id, companyId)
    : null;

  // Flatten all responses for the Answers tab
  const allResponses = survey.distributions.flatMap((d) =>
    d.responses.map((r) => ({
      id: r.id,
      employeeName: r.employee?.name ?? "Anonymous",
      employeeEmail: r.employee?.email ?? "—",
      employeeTitle: r.employee?.title ?? null,
      departmentName: r.employee?.department?.name ?? null,
      hubName: r.employee?.hub?.name ?? null,
      isComplete: r.isComplete,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      answeredCount: r._count.answers,
      totalQuestions: survey.questions.length,
      answers: r.answers.map((a) => ({
        questionId: a.questionId,
        ratingValue: a.ratingValue,
        textValue: a.textValue,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      distributionSentAt: d.sentAt,
    }))
  );
  const totalResponses = allResponses.length;
  const completedResponses = allResponses.filter((r) => r.isComplete).length;
  const pendingResponses = totalResponses - completedResponses;

  // Build per-question survey averages for comparison in detail view
  const completedAnswers = allResponses
    .filter((r) => r.isComplete)
    .flatMap((r) => r.answers);
  const questionAverages: Record<string, number> = {};
  for (const q of survey.questions) {
    const ratings = completedAnswers
      .filter((a) => a.questionId === q.id && a.ratingValue != null)
      .map((a) => a.ratingValue!);
    if (ratings.length > 0) {
      questionAverages[q.id] =
        Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100) / 100;
    }
  }

  // Questions data for the detail sheet
  const questionsData = survey.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    order: q.order,
    isRequired: q.isRequired,
    dimensionId: q.dimensionId,
    dimensionName: q.dimension?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/surveys/climate">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{survey.name}</h1>
            <Badge
              variant={
                CLIMATE_SURVEY_STATUS_COLORS[survey.status] as
                  | "default"
                  | "secondary"
                  | "outline"
              }
            >
              {CLIMATE_SURVEY_STATUS_LABELS[survey.status]}
            </Badge>
            <Badge variant="secondary">
              {CLIMATE_SURVEY_TYPE_LABELS[survey.type]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {survey.description || t("no_description")} ·{" "}
            {survey.isAnonymous ? t("anonymous") : t("non_anonymous")} ·{" "}
            {t(
              survey.questions.length === 1
                ? "questions_count_one"
                : "questions_count_other",
              { count: survey.questions.length },
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isDraft && (
            <DistributeDialog
              surveyId={survey.id}
              surveyName={survey.name}
              hubs={hubs}
              departments={departments}
              teams={teams}
              employees={employees}
              featureHubs={company?.featureHubs ?? false}
              trigger={
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  {t("send_survey")}
                </Button>
              }
            />
          )}
          <SurveyDetailActions
            surveyId={survey.id}
            surveyStatus={survey.status}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {survey.questions.length}
            </div>
            <p className="text-sm text-muted-foreground">{t("stats.questions")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-sm text-muted-foreground">{t("stats.respondents")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {completedResponses}/{totalResponses}
            </div>
            <p className="text-sm text-muted-foreground">{t("stats.completed")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {SURVEY_FREQUENCY_LABELS[survey.frequency]}
            </div>
            <p className="text-sm text-muted-foreground">{t("stats.frequency")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="answers">
        <TabsList>
          <TabsTrigger value="answers" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {t("tabs.answers")}
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <FileText className="h-4 w-4" />
            {t("tabs.questions")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            {t("tabs.settings")}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            {t("tabs.insights")}
          </TabsTrigger>
        </TabsList>

        {/* Answers Tab */}
        <TabsContent value="answers">
          <SurveyAnswersTab
            responses={allResponses}
            totalCount={totalResponses}
            completedCount={completedResponses}
            pendingCount={pendingResponses}
            surveyId={survey.id}
            isDraft={isDraft}
            questions={questionsData}
            questionAverages={questionAverages}
            isAnonymous={survey.isAnonymous}
          />
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>{t("questions_tab.title")}</CardTitle>
              <CardDescription>
                {survey.isAnonymous
                  ? t("questions_tab.anonymous_survey")
                  : t("questions_tab.non_anonymous_survey")}{" "}
                ·{" "}
                {t(
                  survey.questions.length === 1
                    ? "questions_count_one"
                    : "questions_count_other",
                  { count: survey.questions.length },
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {survey.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                  >
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
                            {t("questions_tab.required_badge")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <SurveySettingsTab
            surveyId={survey.id}
            initialValues={{
              name: survey.name,
              description: survey.description,
              type: survey.type,
              frequency: survey.frequency,
              isAnonymous: survey.isAnonymous,
              questionsPerPage: survey.questionsPerPage,
              logoUrl: survey.logoUrl,
              accessStartDate: survey.accessStartDate,
              accessEndDate: survey.accessEndDate,
            }}
            distributions={survey.distributions.map((dist) => ({
              id: dist.id,
              sentAt: dist.sentAt,
              dueDate: dist.dueDate,
              targetType: dist.targetType,
              responseCount: dist._count.responses,
              completedCount: dist.responses.filter((r) => r.isComplete)
                .length,
            }))}
          />
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          {isActiveOrClosed && results ? (
            <SurveyInsightsTab
              results={results}
              totalInvited={totalResponses}
              totalCompleted={completedResponses}
              totalPending={pendingResponses}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 font-semibold">{t("insights_tab.no_insights")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("insights_tab.no_insights_hint")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
