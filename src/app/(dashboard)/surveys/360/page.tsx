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
import { getCycleStatusLabel } from "@/lib/constants/cycle-status";
import { CyclesContent } from "@/components/dashboard/cycles-content";

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

async function CyclesLoader({ companyId }: { companyId: string }) {
  const cycles = await getCycles(companyId);

  const cycleData = cycles.map((cycle) => {
    const completedCount = cycle.assignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;

    return {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      reviewStartDate: cycle.reviewStartDate,
      reviewEndDate: cycle.reviewEndDate,
      templateName: cycle.template.name,
      participantCount: cycle._count.participants,
      completedCount,
      totalCount: cycle.assignments.length,
      statusLabel: getCycleStatusLabel(cycle.status),
    };
  });

  return <CyclesContent cycles={cycleData} />;
}

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<CyclesLoading />}>
      <CyclesLoader companyId={session.companyUser.companyId} />
    </Suspense>
  );
}
