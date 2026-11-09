import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { getPortalIdentity, getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
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
import { getReviewerTypeLabel } from "@/lib/constants/roles";
import { getClimateSurveyTypeLabel } from "@/lib/constants/climate-survey";
import type { ReviewerType } from "@prisma/client";
import { PortalHomeClimateSection } from "@/components/climate/plans/portal-home-climate-section";

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

  const [dashboard, employee, locale] = await Promise.all([
    getPortalDashboard(session.employeeId),
    prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { name: true },
    }),
    getPortalLocale(),
  ]);
  const t = await getTranslations({ locale, namespace: "portal.home" });
  const firstName = employee?.name?.split(" ")[0];

  const dueLabel = (dueDate: string, isOverdue: boolean, daysLeft: number) =>
    isOverdue
      ? t("overdue")
      : daysLeft <= 3
        ? t("days_left", { count: daysLeft })
        : t("due_on", { date: formatDate(dueDate, undefined, locale) });

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? t("welcome", { name: firstName }) : t("welcome_no_name")}
        description={t("description")}
      />

      <PortalHomeClimateSection employeeId={session.employeeId} companyId={session.companyId} />

      {/* Pending Reviews */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("reviews.title")}
          </h2>
          {dashboard.pendingReviews.length > 0 && (
            <Badge variant="secondary">
              {t("pending_count", { count: dashboard.pendingReviews.length })}
            </Badge>
          )}
        </div>

        {dashboard.pendingReviews.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
            title={t("reviews.empty_title")}
            description={t("reviews.empty_description")}
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
                              ? t("reviews.self_review")
                              : t("reviews.review_for", { name: review.revieweeName })}
                          </p>
                          <Badge variant="outline">
                            {getReviewerTypeLabel(review.reviewerType as ReviewerType, locale)}
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
                          {dueLabel(review.dueDate, isOverdue, daysLeft)}
                        </p>
                        <Button size="sm">{t("reviews.start")}</Button>
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
            {t("climate.title")}
          </h2>
          {dashboard.pendingClimateSurveys.length > 0 && (
            <Badge variant="secondary">
              {t("pending_count", { count: dashboard.pendingClimateSurveys.length })}
            </Badge>
          )}
        </div>

        {dashboard.pendingClimateSurveys.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
            title={t("climate.empty_title")}
            description={t("climate.empty_description")}
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
                          <Badge variant="outline">{getClimateSurveyTypeLabel(survey.surveyType, locale)}</Badge>
                          {survey.isAnonymous && (
                            <Badge variant="secondary" className="text-xs">
                              {t("climate.anonymous")}
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
                          {dueLabel(survey.dueDate, isOverdue, daysLeft)}
                        </p>
                        <Button size="sm">{t("climate.respond")}</Button>
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
            {t("nominations.title")}
          </h2>
          {dashboard.pendingNominations.length > 0 && (
            <Badge variant="secondary">
              {t("nominations.open_count", { count: dashboard.pendingNominations.length })}
            </Badge>
          )}
        </div>

        {dashboard.pendingNominations.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title={t("nominations.empty_title")}
            description={t("nominations.empty_description")}
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
                        {nomination.maxPeers > nomination.minPeers
                          ? t("nominations.select_range", { min: nomination.minPeers, max: nomination.maxPeers })
                          : t("nominations.select_exact", { count: nomination.minPeers })}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      {t("nominations.nominate")}
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
            {t("reports.title")}
          </h2>
          {dashboard.releasedReports.length > 0 && (
            <Badge variant="secondary">
              {t("reports.available_count", { count: dashboard.releasedReports.length })}
            </Badge>
          )}
        </div>

        {dashboard.releasedReports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title={t("reports.empty_title")}
            description={t("reports.empty_description")}
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
                        <span>{t("reports.released_on", { date: formatDate(report.releasedAt, undefined, locale) })}</span>
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
    // A survey link's session only opens its survey
    const identity = await getPortalIdentity();
    if (identity?.surveyDistributionId) redirect(`/portal/climate-survey/${identity.surveyDistributionId}`);
    redirect("/portal");
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
