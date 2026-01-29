import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { auth } from "@/lib/auth/config";
import { getDashboardStats, getEmployeeDashboardStats } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/db/prisma";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { getInitials } from "@/lib/utils/formatting";

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

async function AdminDashboard({ companyId }: { companyId: string }) {
  const stats = await getDashboardStats({ companyId });

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.employeeCount}
          icon={<Users className="h-5 w-5 text-primary" />}
          description="Active team members"
        />
        <StatCard
          title="Active Cycles"
          value={stats.activeCycleCount}
          icon={<RotateCcw className="h-5 w-5 text-blue-500" />}
          description="Currently running"
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviewCount}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          description="Awaiting completion"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description={`${stats.completedReviewCount} completed`}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage your 360° review cycles
          </CardDescription>
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
                    <h3 className="font-semibold">Manage People</h3>
                    <p className="text-sm text-muted-foreground">
                      Add or import employees
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/templates">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Review Templates</h3>
                    <p className="text-sm text-muted-foreground">
                      Create or edit forms
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/cycles/new">
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <RotateCcw className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">New Cycle</h3>
                    <p className="text-sm text-muted-foreground">
                      Start collecting feedback
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Cycles */}
      {stats.recentCycles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Cycles</CardTitle>
              <CardDescription>Your latest review cycles</CardDescription>
            </div>
            <Link href="/cycles">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentCycles.map((cycle) => (
                <Link key={cycle.id} href={`/cycles/${cycle.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{cycle.name}</span>
                        <Badge className={CYCLE_STATUS_COLORS[cycle.status]}>
                          {CYCLE_STATUS_LABELS[cycle.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cycle.templateName} • {cycle.participantCount} participants
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Ends {formatDate(cycle.reviewEndDate)}
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

async function EmployeeDashboard({
  companyUserId,
  companyId,
}: {
  companyUserId: string;
  companyId: string;
}) {
  const [stats, pendingReviews, releasedReports, nominationCycles] = await Promise.all([
    getEmployeeDashboardStats(companyUserId, companyId),
    // Get pending reviews
    prisma.reviewAssignment.findMany({
      where: {
        reviewerId: companyUserId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        cycle: { companyId, status: "IN_PROGRESS" },
      },
      include: {
        cycle: true,
        reviewee: {
          include: { user: true },
        },
      },
      take: 5,
      orderBy: { cycle: { reviewEndDate: "asc" } },
    }),
    // Get released reports
    prisma.cycleParticipant.findMany({
      where: {
        companyUserId,
        releasedAt: { not: null },
        cycle: { companyId },
      },
      include: {
        cycle: true,
      },
      take: 5,
      orderBy: { releasedAt: "desc" },
    }),
    // Get nomination cycles
    prisma.cycle.findMany({
      where: {
        companyId,
        status: "NOMINATION",
        participants: {
          some: { companyUserId },
        },
      },
      take: 3,
    }),
  ]);

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          description="Need your feedback"
        />
        <StatCard
          title="Completed"
          value={stats.completedReviews}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description="Reviews submitted"
        />
        <StatCard
          title="Reports Available"
          value={stats.releasedReports}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          description="Feedback reports"
        />
        <StatCard
          title="Nominations Due"
          value={stats.pendingNominations}
          icon={<UserCheck className="h-5 w-5 text-purple-500" />}
          description="Peer selections"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Reviews waiting for your feedback</CardDescription>
            </div>
            {pendingReviews.length > 0 && (
              <Link href="/my-reviews">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
                title="All caught up!"
                description="You have no pending reviews at the moment."
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
                          <AvatarImage src={review.reviewee.user.image || undefined} />
                          <AvatarFallback>
                            {getInitials(review.reviewee.user.name || review.reviewee.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {review.reviewerType === "SELF"
                              ? "Self Review"
                              : review.reviewee.user.name || review.reviewee.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {review.cycle.name}
                          </p>
                        </div>
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                        >
                          {isOverdue ? "Overdue" : `${daysLeft}d left`}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Feedback Reports</CardTitle>
              <CardDescription>Reports released to you</CardDescription>
            </div>
            {releasedReports.length > 0 && (
              <Link href="/my-feedback">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {releasedReports.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No reports yet"
                description="Your feedback reports will appear here once released."
              />
            ) : (
              <div className="space-y-4">
                {releasedReports.map((report) => (
                  <Link key={report.id} href={`/my-feedback/${report.cycleId}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{report.cycle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Released {formatDate(report.releasedAt!)}
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

      {/* Nomination Alerts */}
      {nominationCycles.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-500" />
              Peer Nominations Open
            </CardTitle>
            <CardDescription>
              Select colleagues to review your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nominationCycles.map((cycle) => (
                <Link key={cycle.id} href={`/nominations/${cycle.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    <span className="font-medium">{cycle.name}</span>
                    <Button size="sm">
                      Nominate Peers
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

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const isAdmin = session.companyUser.role === "ADMIN";
  const userName = session.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's what's happening with your team"
      />

      <Suspense fallback={<OverviewLoading />}>
        {isAdmin ? (
          <AdminDashboard companyId={session.companyUser.companyId} />
        ) : (
          <EmployeeDashboard
            companyUserId={session.companyUser.id}
            companyId={session.companyUser.companyId}
          />
        )}
      </Suspense>
    </div>
  );
}
