import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
  Calendar,
  UserCheck,
  BarChart3,
} from "lucide-react";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalDashboard } from "@/lib/actions/portal";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
import type { ReviewerType } from "@prisma/client";

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent() {
  const session = await getPortalSession();
  if (!session) {
    redirect("/portal");
  }

  const [dashboard, employee] = await Promise.all([
    getPortalDashboard(session.employeeId),
    prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { name: true },
    }),
  ]);
  const firstName = employee?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Here's an overview of your pending items and feedback"
      />

      {/* Pending Reviews */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pending Reviews
          </h2>
          {dashboard.pendingReviews.length > 0 && (
            <Badge variant="secondary">
              {dashboard.pendingReviews.length} pending
            </Badge>
          )}
        </div>

        {dashboard.pendingReviews.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
            title="All caught up!"
            description="You have no pending reviews at the moment. Check back later for new feedback requests."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {dashboard.pendingReviews.map((review) => {
              const daysLeft = daysUntil(review.dueDate);
              const isOverdue = isDateInPast(review.dueDate);

              return (
                <Link
                  key={review.id}
                  href={`/portal/review/${review.id}`}
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {review.reviewerType === "SELF"
                              ? "Self Review"
                              : `Review for ${review.revieweeName}`}
                          </p>
                          <Badge variant="outline">
                            {REVIEWER_TYPE_LABELS[review.reviewerType as ReviewerType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {review.cycleName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p
                          className={`text-xs ${
                            isOverdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isOverdue
                            ? "Overdue"
                            : daysLeft <= 3
                              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
                              : `Due ${formatDate(review.dueDate)}`}
                        </p>
                        <Button size="sm">Start</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending Climate Surveys */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Encuestas de Clima
          </h2>
          {dashboard.pendingClimateSurveys.length > 0 && (
            <Badge variant="secondary">
              {dashboard.pendingClimateSurveys.length} pendiente{dashboard.pendingClimateSurveys.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {dashboard.pendingClimateSurveys.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
            title="Sin encuestas pendientes"
            description="Cuando tu organización lance una encuesta de clima, aparecerá aquí."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {dashboard.pendingClimateSurveys.map((survey) => {
              const daysLeft = daysUntil(survey.dueDate);
              const isOverdue = isDateInPast(survey.dueDate);

              return (
                <Link
                  key={survey.distributionId}
                  href={`/portal/climate-survey/${survey.distributionId}`}
                >
                  <Card className="transition-shadow hover:shadow-md border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{survey.surveyName}</p>
                          <Badge variant="outline">{survey.surveyType}</Badge>
                          {survey.isAnonymous && (
                            <Badge variant="secondary" className="text-xs">
                              Anónima
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p
                          className={`text-xs ${
                            isOverdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isOverdue
                            ? "Vencida"
                            : daysLeft <= 3
                              ? `${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
                              : `Hasta ${formatDate(survey.dueDate)}`}
                        </p>
                        <Button size="sm">Responder</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending Nominations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-500" />
            Peer Nominations
          </h2>
          {dashboard.pendingNominations.length > 0 && (
            <Badge variant="secondary">
              {dashboard.pendingNominations.length} open
            </Badge>
          )}
        </div>

        {dashboard.pendingNominations.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No open nominations"
            description="When a review cycle opens for peer nominations, you'll see it here."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {dashboard.pendingNominations.map((nomination) => (
              <Link
                key={nomination.cycleId}
                href={`/portal/nominations/${nomination.cycleId}`}
              >
                <Card className="transition-shadow hover:shadow-md border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/10">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {nomination.cycleName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Select {nomination.minPeers}
                        {nomination.maxPeers > nomination.minPeers
                          ? ` to ${nomination.maxPeers}`
                          : ""}{" "}
                        peer{nomination.maxPeers !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Nominate Peers
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Released Reports */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Feedback Reports
          </h2>
          {dashboard.releasedReports.length > 0 && (
            <Badge variant="secondary">
              {dashboard.releasedReports.length} available
            </Badge>
          )}
        </div>

        {dashboard.releasedReports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title="No reports yet"
            description="Your feedback reports will appear here once they are released by your HR team."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {dashboard.releasedReports.map((report) => (
              <Link
                key={report.cycleId}
                href={`/portal/reports/${report.cycleId}`}
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {report.cycleName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Released {formatDate(report.releasedAt)}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default async function PortalHomePage() {
  const session = await getPortalSession();
  if (!session) {
    redirect("/portal");
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
