import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Calendar, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";

function NominationsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function NominationCyclesList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const companyUserId = session.companyUser.id;
  const companyId = session.companyUser.companyId;

  // Get cycles in nomination phase where user is a participant
  const participants = await prisma.cycleParticipant.findMany({
    where: {
      companyUserId,
      cycle: {
        companyId,
        status: "NOMINATION",
      },
    },
    include: {
      cycle: {
        include: {
          _count: {
            select: { participants: true },
          },
        },
      },
    },
  });

  // Get nomination stats for each cycle
  const cyclesWithStats = await Promise.all(
    participants.map(async (p) => {
      const nominations = await prisma.nomination.findMany({
        where: {
          cycleId: p.cycleId,
          revieweeId: companyUserId,
        },
      });

      const approved = nominations.filter((n) => n.status === "APPROVED").length;
      const pending = nominations.filter((n) => n.status === "PENDING").length;
      const rejected = nominations.filter((n) => n.status === "REJECTED").length;
      const active = nominations.length - rejected;

      return {
        cycle: p.cycle,
        stats: {
          total: nominations.length,
          approved,
          pending,
          rejected,
          active,
          progress: Math.min((active / p.cycle.minPeers) * 100, 100),
          isComplete: approved >= p.cycle.minPeers,
        },
      };
    })
  );

  if (cyclesWithStats.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-muted-foreground" />}
        title="No active nominations"
        description="You'll see review cycles here when peer nomination is open."
      />
    );
  }

  return (
    <div className="space-y-4">
      {cyclesWithStats.map(({ cycle, stats }) => {
        const daysLeft = cycle.nominationEndDate
          ? daysUntil(cycle.nominationEndDate)
          : null;
        const isOverdue =
          cycle.nominationEndDate && isDateInPast(cycle.nominationEndDate);

        return (
          <Link key={cycle.id} href={`/nominations/${cycle.id}`}>
            <Card className="transition-all hover:shadow-md hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{cycle.name}</h3>
                      {stats.isComplete ? (
                        <Badge className="bg-green-500/10 text-green-600">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {stats.active} of {cycle.minPeers} min
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{cycle._count.participants} participants</span>
                      </div>
                      {cycle.nominationEndDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span
                            className={isOverdue ? "text-destructive" : ""}
                          >
                            {isOverdue
                              ? "Overdue"
                              : daysLeft !== null && daysLeft <= 3
                                ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
                                : `Due ${formatDate(cycle.nominationEndDate)}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={stats.progress} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {stats.approved} approved, {stats.pending} pending
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function NominationsPage() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peer Nominations"
        description="Select colleagues to provide feedback for your review cycles"
      />

      <Suspense fallback={<NominationsLoading />}>
        <NominationCyclesList />
      </Suspense>
    </div>
  );
}
