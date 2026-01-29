import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users, Search } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NominationList } from "@/components/nominations/nomination-list";
import { ApprovalActions } from "@/components/nominations/approval-actions";
import { StatCard } from "@/components/design-system/stat-card";
import { getInitials } from "@/lib/utils/formatting";

interface PageProps {
  params: Promise<{ cycleId: string }>;
}

function ApprovalLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function ApprovalContent({ cycleId }: { cycleId: string }) {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const role = session.companyUser.role;
  const companyId = session.companyUser.companyId;
  const companyUserId = session.companyUser.id;

  // Only admins and managers can access this page
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/nominations");
  }

  // Get cycle
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId },
    include: {
      participants: {
        include: {
          companyUser: {
            include: {
              user: true,
              manager: true,
            },
          },
        },
      },
    },
  });

  if (!cycle) {
    notFound();
  }

  // Get nominations - for managers, only show their direct reports
  const nominationWhere: Record<string, unknown> = { cycleId };
  if (role === "MANAGER") {
    const directReportIds = cycle.participants
      .filter((p) => p.companyUser.managerId === companyUserId)
      .map((p) => p.companyUserId);
    nominationWhere.revieweeId = { in: directReportIds };
  }

  const nominations = await prisma.nomination.findMany({
    where: nominationWhere,
    include: {
      nominator: { include: { user: true } },
      nominee: { include: { user: true } },
      reviewee: { include: { user: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Calculate stats
  const pendingCount = nominations.filter((n) => n.status === "PENDING").length;
  const approvedCount = nominations.filter((n) => n.status === "APPROVED").length;
  const rejectedCount = nominations.filter((n) => n.status === "REJECTED").length;

  // Group nominations by reviewee
  const nominationsByReviewee = nominations.reduce(
    (acc, nomination) => {
      const revieweeId = nomination.revieweeId;
      if (!acc[revieweeId]) {
        acc[revieweeId] = {
          reviewee: nomination.reviewee,
          nominations: [],
        };
      }
      acc[revieweeId].nominations.push(nomination);
      return acc;
    },
    {} as Record<string, { reviewee: typeof nominations[0]["reviewee"]; nominations: typeof nominations }>
  );

  const pendingIds = nominations
    .filter((n) => n.status === "PENDING")
    .map((n) => n.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/cycles/${cycleId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{cycle.name}</h1>
            <p className="text-muted-foreground">
              Review and approve peer nominations
            </p>
          </div>
        </div>

        <ApprovalActions pendingIds={pendingIds} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Nominations"
          value={nominations.length}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={<span className="text-yellow-500">⏳</span>}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={<span className="text-green-500">✓</span>}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={<span className="text-red-500">✗</span>}
        />
      </div>

      {/* Main content */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="by-employee">By Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Nominations</CardTitle>
                  <CardDescription>
                    Review all peer nominations for this cycle
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <NominationList
                  nominations={nominations}
                  showReviewee
                  showApprovalActions
                  emptyMessage="No nominations to review"
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Nominations</CardTitle>
              <CardDescription>
                Nominations awaiting your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <NominationList
                  nominations={nominations.filter((n) => n.status === "PENDING")}
                  showReviewee
                  showApprovalActions
                  emptyMessage="No pending nominations"
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-employee" className="mt-6">
          <div className="space-y-6">
            {Object.entries(nominationsByReviewee).map(([revieweeId, data]) => {
              const pendingForEmployee = data.nominations.filter(
                (n) => n.status === "PENDING"
              ).length;
              const approvedForEmployee = data.nominations.filter(
                (n) => n.status === "APPROVED"
              ).length;

              return (
                <Card key={revieweeId}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={data.reviewee.user.image || undefined}
                        />
                        <AvatarFallback>
                          {getInitials(
                            data.reviewee.user.name || data.reviewee.user.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {data.reviewee.user.name || data.reviewee.user.email}
                        </CardTitle>
                        <CardDescription>
                          {data.nominations.length} nomination
                          {data.nominations.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={approvedForEmployee >= cycle.minPeers ? "default" : "secondary"}
                          className={
                            approvedForEmployee >= cycle.minPeers
                              ? "bg-green-500/10 text-green-600"
                              : ""
                          }
                        >
                          {approvedForEmployee}/{cycle.minPeers} min approved
                        </Badge>
                        {pendingForEmployee > 0 && (
                          <Badge variant="outline">{pendingForEmployee} pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <NominationList
                      nominations={data.nominations}
                      showApprovalActions
                      emptyMessage="No nominations"
                    />
                  </CardContent>
                </Card>
              );
            })}

            {Object.keys(nominationsByReviewee).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No nominations to review
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default async function NominationApprovePage({ params }: PageProps) {
  const { cycleId } = await params;

  return (
    <Suspense fallback={<ApprovalLoading />}>
      <ApprovalContent cycleId={cycleId} />
    </Suspense>
  );
}
