import { Suspense } from "react";
import Link from "next/link";
import { Plus, RotateCcw, Calendar, Users } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";
import { redirect } from "next/navigation";

async function getCycles(companyId: string) {
  return prisma.cycle.findMany({
    where: { companyId, status: { not: "ARCHIVED" } },
    include: {
      template: true,
      _count: {
        select: {
          participants: true,
          assignments: true,
        },
      },
      assignments: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

function CyclesLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function CyclesList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const cycles = await getCycles(session.companyUser.companyId);

  if (cycles.length === 0) {
    return (
      <EmptyState
        icon={<RotateCcw className="h-8 w-8 text-muted-foreground" />}
        title="No review cycles yet"
        description="Create your first 360° review cycle to start collecting feedback."
        action={{
          label: "Create Cycle",
          onClick: () => {},
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {cycles.map((cycle) => {
        const completedCount = cycle.assignments.filter(
          (a) => a.status === "COMPLETED"
        ).length;
        const totalCount = cycle.assignments.length;
        const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        const daysLeft = daysUntil(cycle.reviewEndDate);
        const isOverdue = isDateInPast(cycle.reviewEndDate) && cycle.status === "IN_PROGRESS";

        return (
          <Link key={cycle.id} href={`/cycles/${cycle.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cycle.name}</CardTitle>
                    <CardDescription>
                      {cycle.template.name} • {cycle._count.participants} participants
                    </CardDescription>
                  </div>
                  <Badge className={CYCLE_STATUS_COLORS[cycle.status]}>
                    {CYCLE_STATUS_LABELS[cycle.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                {totalCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">
                        {completedCount} / {totalCount} reviews ({Math.round(completionRate)}%)
                      </span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(cycle.reviewStartDate)} - {formatDate(cycle.reviewEndDate)}
                    </span>
                  </div>
                  {cycle.status === "IN_PROGRESS" && (
                    <div className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                      {isOverdue ? (
                        <span>Overdue</span>
                      ) : daysLeft <= 7 ? (
                        <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Cycles"
        description="Create and manage 360° feedback cycles"
      >
        <Link href="/cycles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Cycle
          </Button>
        </Link>
      </PageHeader>

      <Suspense fallback={<CyclesLoading />}>
        <CyclesList />
      </Suspense>
    </div>
  );
}
