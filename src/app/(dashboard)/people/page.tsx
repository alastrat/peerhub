import { Suspense } from "react";
import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils/formatting";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { redirect } from "next/navigation";

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
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
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

  return (
    <div className="space-y-2">
      {people.map((person) => (
        <Link key={person.id} href={`/people/${person.id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.user.image || undefined} />
                <AvatarFallback>
                  {person.user.name ? getInitials(person.user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{person.user.name || "Unnamed"}</p>
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[person.role]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {person.title || "No title"}
                  {person.department && ` • ${person.department.name}`}
                </p>
              </div>
              <div className="hidden sm:block text-right text-sm text-muted-foreground">
                {person.manager ? (
                  <span>Reports to {person.manager.user.name}</span>
                ) : (
                  <span className="text-muted-foreground/60">No manager</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
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
