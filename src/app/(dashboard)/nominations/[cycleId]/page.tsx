import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getNominationsForCycle, getNominationStats } from "@/lib/actions/nominations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeerSelector } from "@/components/nominations/peer-selector";
import { NominationList } from "@/components/nominations/nomination-list";
import { NominationStats } from "@/components/nominations/nomination-stats";
import { formatDate } from "@/lib/utils/dates";

interface PageProps {
  params: Promise<{ cycleId: string }>;
}

function NominationLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
        <div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

async function NominationContent({ cycleId }: { cycleId: string }) {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const companyUserId = session.companyUser.id;
  const companyId = session.companyUser.companyId;

  // Verify cycle exists and user is a participant
  const participant = await prisma.cycleParticipant.findFirst({
    where: {
      cycleId,
      companyUserId,
      cycle: { companyId },
    },
    include: {
      cycle: true,
      companyUser: {
        include: { user: true },
      },
    },
  });

  if (!participant) {
    notFound();
  }

  const cycle = participant.cycle;

  if (cycle.status !== "NOMINATION") {
    redirect(`/cycles/${cycleId}`);
  }

  // Get nominations and stats
  const [nominations, stats, colleagues] = await Promise.all([
    getNominationsForCycle(cycleId, companyUserId),
    getNominationStats(cycleId, companyUserId),
    prisma.companyUser.findMany({
      where: {
        companyId,
        isActive: true,
        id: { not: companyUserId },
      },
      include: {
        user: true,
        department: true,
      },
    }),
  ]);

  if (!stats) {
    notFound();
  }

  const existingNomineeIds = nominations.map((n) => n.nomineeId);
  const colleaguesList = colleagues.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
    image: c.user.image,
    title: c.title,
    department: c.department?.name || null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/nominations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cycle.name}</h1>
          <p className="text-muted-foreground">
            Nominate peers to review your performance
          </p>
        </div>
      </div>

      {/* Timeline info */}
      {cycle.nominationEndDate && (
        <div className="text-sm text-muted-foreground">
          Nomination deadline: {formatDate(cycle.nominationEndDate)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Peer Selector */}
        <div className="lg:col-span-2">
          <PeerSelector
            cycleId={cycleId}
            revieweeId={companyUserId}
            colleagues={colleaguesList}
            existingNomineeIds={existingNomineeIds}
            minPeers={cycle.minPeers}
            maxPeers={cycle.maxPeers}
            currentCount={stats.total - stats.rejected}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <NominationStats
            total={stats.total}
            approved={stats.approved}
            pending={stats.pending}
            rejected={stats.rejected}
            minRequired={stats.minRequired}
            maxAllowed={stats.maxAllowed}
          />

          {/* Current Nominations */}
          <Card>
            <CardHeader>
              <CardTitle>Your Nominations</CardTitle>
              <CardDescription>
                People you've nominated to review you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NominationList
                nominations={nominations}
                canRemove={true}
                emptyMessage="No nominations yet. Select colleagues from the list."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function NominationCyclePage({ params }: PageProps) {
  const { cycleId } = await params;

  return (
    <Suspense fallback={<NominationLoading />}>
      <NominationContent cycleId={cycleId} />
    </Suspense>
  );
}
