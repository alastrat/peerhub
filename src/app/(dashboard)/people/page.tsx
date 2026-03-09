import { Suspense } from "react";
import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { PeopleTable } from "@/components/people/people-table";

async function getPeople(companyId: string) {
  return prisma.companyUser.findMany({
    where: { companyId, isActive: true },
    include: {
      user: true,
      department: true,
      manager: {
        include: { user: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

function PeopleLoading() {
  return (
    <div className="space-y-4">
      {/* Filter skeletons */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-[140px] rounded-lg" />
        <Skeleton className="h-10 w-[180px] rounded-lg" />
      </div>
      {/* Table skeleton */}
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

async function PeopleList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const people = await getPeople(session.companyUser.companyId);

  if (people.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-muted-foreground" />}
        title="No employees yet"
        description="Add your first team member to get started with 360° feedback."
        action={{
          label: "Add Employee",
          onClick: () => {},
        }}
      />
    );
  }

  const rows = people.map((p) => ({
    id: p.id,
    role: p.role,
    title: p.title,
    user: { name: p.user.name, image: p.user.image },
    department: p.department ? { name: p.department.name } : null,
    manager: p.manager ? { user: { name: p.manager.user.name } } : null,
  }));

  return <PeopleTable data={rows} />;
}

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Manage your team members and organizational structure"
      >
        <div className="flex gap-2">
          <Link href="/people/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Link href="/people/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </PageHeader>

      <Suspense fallback={<PeopleLoading />}>
        <PeopleList />
      </Suspense>
    </div>
  );
}
