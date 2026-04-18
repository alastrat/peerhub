import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getDashboardStats, getEmployeeDashboardStats } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/db/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewContent } from "@/components/dashboard/overview-content";

function OverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function AdminDashboardLoader({
  companyId,
  userName,
}: {
  companyId: string;
  userName: string;
}) {
  const stats = await getDashboardStats({ companyId });

  return (
    <OverviewContent
      userName={userName}
      isAdmin={true}
      adminStats={{
        employeeCount: stats.employeeCount,
        activeCycleCount: stats.activeCycleCount,
        pendingReviewCount: stats.pendingReviewCount,
        completionRate: stats.completionRate,
        completedReviewCount: stats.completedReviewCount,
        recentCycles: stats.recentCycles.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          templateName: c.templateName,
          participantCount: c.participantCount,
          reviewEndDate: c.reviewEndDate,
        })),
      }}
    />
  );
}

async function EmployeeDashboardLoader({
  employeeId,
  companyId,
  userName,
}: {
  employeeId: string | null;
  companyId: string;
  userName: string;
}) {
  const [stats, pendingReviews, releasedReports, nominationCycles] = await Promise.all([
    getEmployeeDashboardStats(employeeId, companyId),
    employeeId
      ? prisma.reviewAssignment.findMany({
          where: {
            reviewerId: employeeId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            cycle: { companyId, status: "IN_PROGRESS" },
          },
          include: {
            cycle: true,
            reviewee: true,
          },
          take: 5,
          orderBy: { cycle: { reviewEndDate: "asc" } },
        })
      : Promise.resolve([]),
    employeeId
      ? prisma.cycleParticipant.findMany({
          where: {
            employeeId,
            releasedAt: { not: null },
            cycle: { companyId },
          },
          include: {
            cycle: true,
          },
          take: 5,
          orderBy: { releasedAt: "desc" },
        })
      : Promise.resolve([]),
    employeeId
      ? prisma.cycle.findMany({
          where: {
            companyId,
            status: "NOMINATION",
            participants: {
              some: { employeeId },
            },
          },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  return (
    <OverviewContent
      userName={userName}
      isAdmin={false}
      employeeStats={{
        pendingReviews: stats.pendingReviews,
        completedReviews: stats.completedReviews,
        releasedReports: stats.releasedReports,
        pendingNominations: stats.pendingNominations,
      }}
      pendingReviews={pendingReviews.map((r) => ({
        id: r.id,
        reviewerType: r.reviewerType,
        reviewee: { name: r.reviewee.name, email: r.reviewee.email },
        cycle: { name: r.cycle.name, reviewEndDate: r.cycle.reviewEndDate },
      }))}
      releasedReports={releasedReports.map((r) => ({
        id: r.id,
        cycleId: r.cycleId,
        releasedAt: r.releasedAt!,
        cycle: { name: r.cycle.name },
      }))}
      nominationCycles={nominationCycles.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
    />
  );
}

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.companyUser) redirect("/onboarding");

  const isAdmin = session.companyUser.role === "ADMIN";
  const userName = session.user?.name?.split(" ")[0] || "there";

  return (
    <Suspense fallback={<OverviewLoading />}>
      {isAdmin ? (
        <AdminDashboardLoader
          companyId={session.companyUser.companyId}
          userName={userName}
        />
      ) : (
        <EmployeeDashboardLoader
          employeeId={session.companyUser.employeeId}
          companyId={session.companyUser.companyId}
          userName={userName}
        />
      )}
    </Suspense>
  );
}
