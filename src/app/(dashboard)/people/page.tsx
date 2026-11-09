import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleContent } from "@/components/dashboard/people-content";
import { listPeople } from "@/lib/queries/people";

function PeopleLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-[140px] rounded-lg" />
        <Skeleton className="h-10 w-[180px] rounded-lg" />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(8)].map((_, i) => (
              <TableRow key={i} className="bg-background">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

async function PeopleLoader({ companyId }: { companyId: string }) {
  const [people, company] = await Promise.all([
    listPeople(companyId),
    prisma.company.findUnique({ where: { id: companyId }, select: { featureHubs: true } }),
  ]);

  // Sede is also filled by the import, which creates hubs even with the hubs
  // feature off: show it whenever someone has one
  const showHubs = (company?.featureHubs ?? false) || people.some((p) => p.hub);

  return <PeopleContent people={people} showHubs={showHubs} />;
}

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <Suspense fallback={<PeopleLoading />}>
      <PeopleLoader companyId={session.companyUser.companyId} />
    </Suspense>
  );
}
