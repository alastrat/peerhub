import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  Users,
  BarChart3,
  Send,
  Settings,
  UserCheck,
  Clock,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { getInitials } from "@/lib/utils/formatting";
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_COLORS,
} from "@/lib/constants/cycle-status";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
import { CycleActions } from "@/components/cycles/cycle-actions";
import { AddExternalRaterDialog } from "@/components/cycles/add-external-rater-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCycle(companyId: string, cycleId: string) {
  return prisma.cycle.findFirst({
    where: {
      id: cycleId,
      companyId,
    },
    include: {
      template: true,
      participants: {
        include: {
          companyUser: {
            include: { user: true },
          },
        },
      },
      assignments: {
        include: {
          reviewer: {
            include: { user: true },
          },
          reviewee: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      nominations: {
        include: {
          nominator: { include: { user: true } },
          nominee: { include: { user: true } },
          reviewee: { include: { user: true } },
        },
      },
      _count: {
        select: {
          participants: true,
          assignments: true,
          nominations: true,
        },
      },
    },
  });
}

export default async function CycleDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const cycle = await getCycle(session.companyUser.companyId, id);

  if (!cycle) {
    notFound();
  }

  const completedAssignments = cycle.assignments.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const completionRate =
    cycle.assignments.length > 0
      ? (completedAssignments / cycle.assignments.length) * 100
      : 0;

  const daysLeft = daysUntil(cycle.reviewEndDate);
  const isOverdue =
    isDateInPast(cycle.reviewEndDate) && cycle.status === "IN_PROGRESS";

  // Group assignments by reviewee
  const assignmentsByReviewee = cycle.assignments.reduce(
    (acc, assignment) => {
      const revieweeId = assignment.revieweeId;
      if (!acc[revieweeId]) {
        acc[revieweeId] = [];
      }
      acc[revieweeId].push(assignment);
      return acc;
    },
    {} as Record<string, typeof cycle.assignments>
  );

  // Calculate stats by reviewer type
  const statsByType = cycle.assignments.reduce(
    (acc, assignment) => {
      if (!acc[assignment.reviewerType]) {
        acc[assignment.reviewerType] = { total: 0, completed: 0 };
      }
      acc[assignment.reviewerType].total++;
      if (assignment.status === "COMPLETED") {
        acc[assignment.reviewerType].completed++;
      }
      return acc;
    },
    {} as Record<string, { total: number; completed: number }>
  );

  // Calculate nomination stats
  const nominationStats = {
    total: cycle.nominations.length,
    pending: cycle.nominations.filter((n) => n.status === "PENDING").length,
    approved: cycle.nominations.filter((n) => n.status === "APPROVED").length,
    rejected: cycle.nominations.filter((n) => n.status === "REJECTED").length,
  };

  // Group nominations by reviewee
  const nominationsByReviewee = cycle.nominations.reduce(
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
    {} as Record<string, { reviewee: typeof cycle.nominations[0]["reviewee"]; nominations: typeof cycle.nominations }>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cycles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cycle.name}</h1>
            <Badge className={CYCLE_STATUS_COLORS[cycle.status]}>
              {CYCLE_STATUS_LABELS[cycle.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {cycle.template.name} • {cycle._count.participants} participants
          </p>
        </div>
        <CycleActions cycle={cycle} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cycle._count.participants}</p>
                <p className="text-sm text-muted-foreground">Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cycle._count.assignments}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedAssignments}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`rounded-full p-3 ${
                  isOverdue ? "bg-destructive/10" : "bg-orange-500/10"
                }`}
              >
                <Calendar
                  className={`h-5 w-5 ${
                    isOverdue ? "text-destructive" : "text-orange-500"
                  }`}
                />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isOverdue ? "Overdue" : `${daysLeft}d`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOverdue ? "Past deadline" : "Days left"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {cycle.status === "IN_PROGRESS" && cycle.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completion Progress</CardTitle>
            <CardDescription>
              {completedAssignments} of {cycle.assignments.length} reviews completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completionRate} className="h-3" />
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(statsByType).map(([type, stats]) => (
                <div key={type} className="text-center">
                  <p className="text-sm font-medium">
                    {REVIEWER_TYPE_LABELS[type as keyof typeof REVIEWER_TYPE_LABELS]}
                  </p>
                  <p className="text-lg font-bold">
                    {stats.completed}/{stats.total}
                  </p>
                  <Progress
                    value={(stats.completed / stats.total) * 100}
                    className="h-1 mt-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8 text-sm">
            {cycle.nominationStartDate && (
              <div>
                <p className="text-muted-foreground">Nomination Period</p>
                <p className="font-medium">
                  {formatDate(cycle.nominationStartDate)} -{" "}
                  {cycle.nominationEndDate
                    ? formatDate(cycle.nominationEndDate)
                    : "TBD"}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Review Period</p>
              <p className="font-medium">
                {formatDate(cycle.reviewStartDate)} -{" "}
                {formatDate(cycle.reviewEndDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          {(cycle.status === "NOMINATION" || cycle.nominations.length > 0) && (
            <TabsTrigger value="nominations">
              Nominations
              {nominationStats.pending > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {nominationStats.pending}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="assignments">All Reviews</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Participants</CardTitle>
                  <CardDescription>
                    Employees being reviewed in this cycle
                  </CardDescription>
                </div>
                {cycle.status === "DRAFT" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cycles/${id}/participants`}>
                      Manage Participants
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {cycle.participants.map((participant) => {
                    const assignments = assignmentsByReviewee[
                      participant.companyUserId
                    ] || [];
                    const completed = assignments.filter(
                      (a) => a.status === "COMPLETED"
                    ).length;
                    const progress =
                      assignments.length > 0
                        ? (completed / assignments.length) * 100
                        : 0;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={participant.companyUser.user.image || undefined}
                          />
                          <AvatarFallback>
                            {participant.companyUser.user.name
                              ? getInitials(participant.companyUser.user.name)
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {participant.companyUser.user.name ||
                              participant.companyUser.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignments.length} reviewers assigned
                          </p>
                        </div>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {completed}/{assignments.length}
                            </span>
                            <span className="font-medium">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </div>
                      </div>
                    );
                  })}

                  {cycle.participants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No participants added yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {(cycle.status === "NOMINATION" || cycle.nominations.length > 0) && (
          <TabsContent value="nominations" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Peer Nominations</CardTitle>
                    <CardDescription>
                      {cycle.status === "NOMINATION"
                        ? "Review and approve peer nominations"
                        : "Peer nominations for this cycle"}
                    </CardDescription>
                  </div>
                  {cycle.status === "NOMINATION" && nominationStats.pending > 0 && (
                    <Button asChild>
                      <Link href={`/nominations/${id}/approve`}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Review Nominations ({nominationStats.pending})
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Nomination Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{nominationStats.total}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold">{nominationStats.pending}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Approved</span>
                    </div>
                    <p className="text-2xl font-bold">{nominationStats.approved}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Rejected</span>
                    </div>
                    <p className="text-2xl font-bold">{nominationStats.rejected}</p>
                  </div>
                </div>

                {/* Nominations by Employee */}
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {Object.entries(nominationsByReviewee).map(([revieweeId, data]) => {
                      const approved = data.nominations.filter((n) => n.status === "APPROVED").length;
                      const pending = data.nominations.filter((n) => n.status === "PENDING").length;

                      return (
                        <div key={revieweeId} className="p-4 rounded-lg border">
                          <div className="flex items-center gap-4 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={data.reviewee.user.image || undefined} />
                              <AvatarFallback>
                                {getInitials(data.reviewee.user.name || data.reviewee.user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {data.reviewee.user.name || data.reviewee.user.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {approved}/{cycle.minPeers} min peers approved
                                {pending > 0 && ` • ${pending} pending`}
                              </p>
                            </div>
                            <Badge
                              variant={approved >= cycle.minPeers ? "default" : "secondary"}
                              className={approved >= cycle.minPeers ? "bg-green-500/10 text-green-600" : ""}
                            >
                              {approved >= cycle.minPeers ? "Complete" : "In Progress"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {data.nominations.map((nomination) => (
                              <Badge
                                key={nomination.id}
                                variant="outline"
                                className={
                                  nomination.status === "APPROVED"
                                    ? "border-green-500/50"
                                    : nomination.status === "REJECTED"
                                      ? "border-red-500/50"
                                      : ""
                                }
                              >
                                {nomination.nominee.user.name || nomination.nominee.user.email}
                                {nomination.status === "PENDING" && (
                                  <Clock className="h-3 w-3 ml-1 text-yellow-500" />
                                )}
                                {nomination.status === "APPROVED" && (
                                  <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                                )}
                                {nomination.status === "REJECTED" && (
                                  <XCircle className="h-3 w-3 ml-1 text-red-500" />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {Object.keys(nominationsByReviewee).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No nominations yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Review Assignments</CardTitle>
                  <CardDescription>
                    Track the status of individual reviews
                  </CardDescription>
                </div>
                {cycle.externalEnabled && (cycle.status === "IN_PROGRESS" || cycle.status === "NOMINATION") && (
                  <AddExternalRaterDialog
                    cycleId={cycle.id}
                    participants={cycle.participants}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {cycle.assignments.map((assignment) => {
                    const reviewerName = assignment.reviewerType === "EXTERNAL"
                      ? assignment.externalName || assignment.externalEmail || "External"
                      : assignment.reviewer?.user.name || assignment.reviewer?.user.email;

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={assignment.reviewer?.user.image || undefined}
                          />
                          <AvatarFallback>
                            {reviewerName ? getInitials(reviewerName) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{reviewerName}</span>
                            <span className="text-muted-foreground"> reviewing </span>
                            <span className="font-medium">
                              {assignment.reviewee.user.name}
                            </span>
                          </p>
                          {assignment.reviewerType === "EXTERNAL" && assignment.externalEmail && (
                            <p className="text-xs text-muted-foreground">
                              {assignment.externalEmail}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {REVIEWER_TYPE_LABELS[assignment.reviewerType]}
                        </Badge>
                        <Badge className={ASSIGNMENT_STATUS_COLORS[assignment.status]}>
                          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        </Badge>
                      </div>
                    );
                  })}

                  {cycle.assignments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No assignments created yet. Launch the cycle to create
                      assignments.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cycle Settings</CardTitle>
              <CardDescription>
                Review configuration for this cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Reviewer Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Self Review</span>
                      <Badge variant={cycle.selfReviewEnabled ? "default" : "secondary"}>
                        {cycle.selfReviewEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Manager Review</span>
                      <Badge
                        variant={cycle.managerReviewEnabled ? "default" : "secondary"}
                      >
                        {cycle.managerReviewEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Peer Review</span>
                      <Badge variant={cycle.peerReviewEnabled ? "default" : "secondary"}>
                        {cycle.peerReviewEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Upward Review</span>
                      <Badge
                        variant={cycle.directReportEnabled ? "default" : "secondary"}
                      >
                        {cycle.directReportEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Peer Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Min Peers</span>
                      <span className="font-medium">{cycle.minPeers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Peers</span>
                      <span className="font-medium">{cycle.maxPeers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Anonymity Threshold
                      </span>
                      <span className="font-medium">
                        {cycle.anonymityThreshold} reviewers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
