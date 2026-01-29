import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Users, FileText, CheckCircle2, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getDashboardStats, getCycleParticipation, getCompletionBreakdown } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/design-system/page-header";
import { StatCard } from "@/components/design-system/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ParticipationChart } from "@/components/analytics/participation-chart";
import { CompletionBreakdown } from "@/components/analytics/completion-breakdown";
import { formatDate } from "@/lib/utils/dates";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";
import { Badge } from "@/components/ui/badge";

function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const companyId = session.companyUser.companyId;

  const [stats, participationData, completionBreakdown] = await Promise.all([
    getDashboardStats({ companyId }),
    getCycleParticipation({ companyId }),
    getCompletionBreakdown(companyId),
  ]);

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.employeeCount}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Active Cycles"
          value={stats.activeCycleCount}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviewCount}
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description={`${stats.completedReviewCount} of ${stats.completedReviewCount + stats.pendingReviewCount} reviews`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ParticipationChart data={participationData} />
        <CompletionBreakdown breakdown={completionBreakdown} />
      </div>

      {/* Recent Cycles */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cycles</CardTitle>
          <CardDescription>
            Latest review cycles and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{cycle.name}</span>
                    <Badge className={CYCLE_STATUS_COLORS[cycle.status]}>
                      {CYCLE_STATUS_LABELS[cycle.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {cycle.templateName} • {cycle.participantCount} participants • {cycle.assignmentCount} reviews
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  Ends {formatDate(cycle.reviewEndDate)}
                </div>
              </div>
            ))}

            {stats.recentCycles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No cycles created yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="View performance review analytics and insights"
      />

      <Suspense fallback={<AnalyticsLoading />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
