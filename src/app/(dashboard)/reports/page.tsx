import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Users, CheckCircle2, Send } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getCyclesWithReports } from "@/lib/queries/reports";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/dates";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";

function ReportsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ReportsCycleList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const cycles = await getCyclesWithReports(session.companyUser.companyId);

  if (cycles.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 text-muted-foreground" />}
        title="No reports available"
        description="Reports will appear here once review cycles are in progress or completed."
        action={
          <Button asChild>
            <Link href="/cycles">View Cycles</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {cycles.map((cycle) => {
        const completionRate =
          cycle.totalReviews > 0
            ? (cycle.completedReviews / cycle.totalReviews) * 100
            : 0;
        const releaseRate =
          cycle.participantCount > 0
            ? (cycle.releasedCount / cycle.participantCount) * 100
            : 0;

        return (
          <Link key={cycle.id} href={`/reports/${cycle.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{cycle.name}</h3>
                      <Badge className={CYCLE_STATUS_COLORS[cycle.status]}>
                        {CYCLE_STATUS_LABELS[cycle.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {cycle.templateName} • Ended {formatDate(cycle.reviewEndDate)}
                    </p>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Participants
                          </span>
                        </div>
                        <p className="font-medium">{cycle.participantCount}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Reviews Completed
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {cycle.completedReviews}/{cycle.totalReviews}
                          </span>
                          <Progress value={completionRate} className="h-2 w-20" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Send className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Reports Released
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {cycle.releasedCount}/{cycle.participantCount}
                          </span>
                          <Progress value={releaseRate} className="h-2 w-20" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    Manage Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Manage and release feedback reports for review cycles"
      />

      <Suspense fallback={<ReportsLoading />}>
        <ReportsCycleList />
      </Suspense>
    </div>
  );
}
