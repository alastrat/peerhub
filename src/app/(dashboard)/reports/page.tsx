import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getCyclesWithReports } from "@/lib/queries/reports";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCycleStatusLabel } from "@/lib/constants/cycle-status";
import { ReportsContent } from "@/components/dashboard/reports-content";

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

async function ReportsLoader({ companyId }: { companyId: string }) {
  const cycles = await getCyclesWithReports(companyId);

  const cycleData = cycles.map((cycle) => ({
    id: cycle.id,
    name: cycle.name,
    status: cycle.status,
    statusLabel: getCycleStatusLabel(cycle.status),
    templateName: cycle.templateName,
    reviewEndDate: cycle.reviewEndDate,
    participantCount: cycle.participantCount,
    completedReviews: cycle.completedReviews,
    totalReviews: cycle.totalReviews,
    releasedCount: cycle.releasedCount,
  }));

  return <ReportsContent cycles={cycleData} />;
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsLoader companyId={session.companyUser.companyId} />
    </Suspense>
  );
}
