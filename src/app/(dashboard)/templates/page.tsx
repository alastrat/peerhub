import { Suspense } from "react";
import Link from "next/link";
import { Plus, FileText, MoreHorizontal, Copy, Trash2, Archive } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/utils/dates";
import { redirect } from "next/navigation";

async function getTemplates(companyId: string) {
  return prisma.template.findMany({
    where: { companyId, isArchived: false },
    include: {
      sections: {
        include: {
          questions: true,
        },
      },
      _count: {
        select: { cycles: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function TemplatesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function TemplatesList() {
  const session = await auth();
  if (!session?.companyUser) {
    redirect("/login");
  }

  const templates = await getTemplates(session.companyUser.companyId);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 text-muted-foreground" />}
        title="No templates yet"
        description="Create your first review template with questions and rating scales."
        action={{
          label: "Create Template",
          onClick: () => {},
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const questionCount = template.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        );

        return (
          <Card key={template.id} className="group relative transition-shadow hover:shadow-md">
            <Link href={`/templates/${template.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{template.sections.length} sections</span>
                  <span>•</span>
                  <span>{questionCount} questions</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {template._count.cycles > 0 && (
                    <Badge variant="secondary">
                      Used in {template._count.cycles} cycle{template._count.cycles > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {template.isDefault && <Badge>Default</Badge>}
                </div>
              </CardContent>
            </Link>
            <div className="absolute right-4 top-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Create and manage review templates for your feedback cycles"
      >
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </PageHeader>

      <Suspense fallback={<TemplatesLoading />}>
        <TemplatesList />
      </Suspense>
    </div>
  );
}
