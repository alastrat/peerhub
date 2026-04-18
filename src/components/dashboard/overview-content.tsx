"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  RotateCcw,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { StatCard } from "@/components/design-system/stat-card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { getInitials } from "@/lib/utils/formatting";

interface DashboardStats {
  employeeCount: number;
  activeCycleCount: number;
  pendingReviewCount: number;
  completionRate: number;
  completedReviewCount: number;
  recentCycles: {
    id: string;
    name: string;
    status: string;
    templateName: string;
    participantCount: number;
    reviewEndDate: Date;
  }[];
}

interface EmployeeStats {
  pendingReviews: number;
  completedReviews: number;
  releasedReports: number;
  pendingNominations: number;
}

interface PendingReview {
  id: string;
  reviewerType: string;
  reviewee: { name: string | null; email: string };
  cycle: { name: string; reviewEndDate: Date };
}

interface ReleasedReport {
  id: string;
  cycleId: string;
  releasedAt: Date;
  cycle: { name: string };
}

interface NominationCycle {
  id: string;
  name: string;
}

interface OverviewContentProps {
  userName: string;
  isAdmin: boolean;
  adminStats?: DashboardStats;
  employeeStats?: EmployeeStats;
  pendingReviews?: PendingReview[];
  releasedReports?: ReleasedReport[];
  nominationCycles?: NominationCycle[];
}

function AdminDashboardContent({
  stats,
  t,
}: {
  stats: DashboardStats;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("total_employees")}
          value={stats.employeeCount}
          icon={<Users className="h-5 w-5 text-primary" />}
          description={t("active_team_members")}
        />
        <StatCard
          title={t("active_cycles")}
          value={stats.activeCycleCount}
          icon={<RotateCcw className="h-5 w-5 text-blue-500" />}
          description={t("currently_running")}
        />
        <StatCard
          title={t("pending_reviews")}
          value={stats.pendingReviewCount}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          description={t("awaiting_completion")}
        />
        <StatCard
          title={t("completion_rate")}
          value={`${stats.completionRate}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description={t("completed", { count: stats.completedReviewCount })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quick_actions")}</CardTitle>
          <CardDescription>{t("quick_actions_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/people">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("manage_people")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("add_or_import")}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/surveys/360/templates">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("review_templates")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("create_or_edit_forms")}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/surveys/360/new">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <RotateCcw className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("new_cycle")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("start_collecting")}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {stats.recentCycles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("recent_cycles")}</CardTitle>
              <CardDescription>{t("latest_cycles")}</CardDescription>
            </div>
            <Link href="/surveys/360">
              <Button variant="outline" size="sm">
                {t("view_all")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentCycles.map((cycle) => (
                <Link key={cycle.id} href={`/surveys/360/${cycle.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{cycle.name}</span>
                        <Badge
                          className={
                            CYCLE_STATUS_COLORS[
                              cycle.status as keyof typeof CYCLE_STATUS_COLORS
                            ]
                          }
                        >
                          {cycle.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cycle.templateName} • {cycle.participantCount}{" "}
                        {t("participants")}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {t("ends", { date: formatDate(cycle.reviewEndDate) })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function EmployeeDashboardContent({
  stats,
  pendingReviews,
  releasedReports,
  nominationCycles,
  t,
}: {
  stats: EmployeeStats;
  pendingReviews: PendingReview[];
  releasedReports: ReleasedReport[];
  nominationCycles: NominationCycle[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("employee_pending_reviews")}
          value={stats.pendingReviews}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          description={t("need_your_feedback")}
        />
        <StatCard
          title={t("employee_completed")}
          value={stats.completedReviews}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description={t("reviews_submitted")}
        />
        <StatCard
          title={t("reports_available")}
          value={stats.releasedReports}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          description={t("feedback_reports")}
        />
        <StatCard
          title={t("nominations_due")}
          value={stats.pendingNominations}
          icon={<UserCheck className="h-5 w-5 text-purple-500" />}
          description={t("peer_selections")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("employee_pending_reviews")}</CardTitle>
              <CardDescription>{t("reviews_waiting")}</CardDescription>
            </div>
            {pendingReviews.length > 0 && (
              <Link href="/my-reviews">
                <Button variant="outline" size="sm">
                  {t("view_all")}
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <EmptyState
                icon={
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                }
                title={t("all_caught_up")}
                description={t("no_pending_reviews")}
              />
            ) : (
              <div className="space-y-4">
                {pendingReviews.map((review) => {
                  const daysLeft = daysUntil(review.cycle.reviewEndDate);
                  const isOverdue = isDateInPast(review.cycle.reviewEndDate);

                  return (
                    <Link key={review.id} href={`/my-reviews/${review.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={undefined} />
                          <AvatarFallback>
                            {getInitials(
                              review.reviewee.name || review.reviewee.email
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {review.reviewerType === "SELF"
                              ? t("self_review")
                              : review.reviewee.name || review.reviewee.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {review.cycle.name}
                          </p>
                        </div>
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                        >
                          {isOverdue
                            ? t("overdue")
                            : t("days_left", { days: daysLeft })}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("your_feedback_reports")}</CardTitle>
              <CardDescription>{t("reports_released_to_you")}</CardDescription>
            </div>
            {releasedReports.length > 0 && (
              <Link href="/my-feedback">
                <Button variant="outline" size="sm">
                  {t("view_all")}
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {releasedReports.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title={t("no_reports_yet")}
                description={t("reports_will_appear")}
              />
            ) : (
              <div className="space-y-4">
                {releasedReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/my-feedback/${report.cycleId}`}
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{report.cycle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("released", {
                            date: formatDate(report.releasedAt),
                          })}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {nominationCycles.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-500" />
              {t("peer_nominations_open")}
            </CardTitle>
            <CardDescription>{t("select_colleagues")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nominationCycles.map((cycle) => (
                <Link key={cycle.id} href={`/nominations/${cycle.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    <span className="font-medium">{cycle.name}</span>
                    <Button size="sm">
                      {t("nominate_peers")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function OverviewContent({
  userName,
  isAdmin,
  adminStats,
  employeeStats,
  pendingReviews = [],
  releasedReports = [],
  nominationCycles = [],
}: OverviewContentProps) {
  const t = useTranslations("dashboard.overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("welcome", { name: userName })}
        description={t("subtitle")}
      />

      {isAdmin && adminStats ? (
        <AdminDashboardContent stats={adminStats} t={t} />
      ) : employeeStats ? (
        <EmployeeDashboardContent
          stats={employeeStats}
          pendingReviews={pendingReviews}
          releasedReports={releasedReports}
          nominationCycles={nominationCycles}
          t={t}
        />
      ) : null}
    </div>
  );
}
