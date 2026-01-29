import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getCycleReportSummary } from "@/lib/queries/reports";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/design-system/stat-card";
import { ReleaseControls } from "@/components/reports/release-controls";
import { getInitials } from "@/lib/utils/formatting";
import { formatDate } from "@/lib/utils/dates";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";

interface PageProps {
  params: Promise<{ cycleId: string }>;
}

function ParticipantsLoading() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function CycleReportContent({ cycleId }: { cycleId: string }) {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const summary = await getCycleReportSummary({
    cycleId,
    companyId: session.companyUser.companyId,
  });

  if (!summary) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{summary.cycleName}</h1>
            <Badge className={CYCLE_STATUS_COLORS[summary.status]}>
              {CYCLE_STATUS_LABELS[summary.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Anonymity threshold: {summary.anonymityThreshold} responses
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Participants"
          value={summary.stats.total}
          icon={<span className="text-primary">👥</span>}
        />
        <StatCard
          title="Reports Released"
          value={summary.stats.released}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          description={`${Math.round((summary.stats.released / summary.stats.total) * 100)}%`}
        />
        <StatCard
          title="Ready to Release"
          value={summary.stats.ready}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          description="Sufficient responses"
        />
        <StatCard
          title="Not Ready"
          value={summary.stats.notReady}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          description="Needs more responses"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Release Controls */}
        <div className="lg:col-span-1">
          <ReleaseControls
            cycleId={cycleId}
            isReleased={false}
            canRelease={summary.stats.ready > 0}
            readyCount={summary.stats.ready}
            totalCount={summary.stats.total}
          />
        </div>

        {/* Participants List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  Individual report status and actions
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search participants..."
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {summary.participants.map((participant) => {
                  const completionRate =
                    participant.totalReviews > 0
                      ? (participant.completedReviews / participant.totalReviews) * 100
                      : 0;

                  return (
                    <div
                      key={participant.participantId}
                      className="flex items-center gap-4 p-4 rounded-lg border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(participant.participantName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.participantName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {participant.completedReviews}/{participant.totalReviews}{" "}
                            reviews
                          </span>
                          <Progress value={completionRate} className="h-1 w-16" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {participant.releasedAt ? (
                          <Badge className="bg-green-500/10 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Released {formatDate(participant.releasedAt)}
                          </Badge>
                        ) : participant.hasMinimumResponses ? (
                          <Badge variant="outline" className="text-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Needs more responses
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/reports/${cycleId}/${participant.participantId}`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {summary.participants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No participants in this cycle
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function CycleReportsPage({ params }: PageProps) {
  const { cycleId } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<ParticipantsLoading />}>
      <CycleReportContent cycleId={cycleId} />
    </Suspense>
  );
}
