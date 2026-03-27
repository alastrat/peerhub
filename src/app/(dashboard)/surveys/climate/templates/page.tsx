import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Plus } from "lucide-react";
import { CLIMATE_SURVEY_TYPE_LABELS } from "@/lib/constants/climate-survey";

function TemplatesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

async function TemplatesList() {
  const session = await auth();
  if (!session?.companyUser) redirect("/login");

  const companyId = session.companyUser.companyId;

  const templates = await prisma.climateSurveyTemplate.findMany({
    where: {
      OR: [
        { companyId, isArchived: false },
        { companyId: null, isDefault: true, isArchived: false },
      ],
    },
    include: {
      _count: { select: { questions: true, surveys: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title="No templates yet"
        description="Create reusable survey templates to quickly launch climate assessments."
        action={
          <Button asChild>
            <Link href="/surveys/climate/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => (
        <Link key={template.id} href={`/surveys/climate/templates/${template.id}`}>
          <Card className="transition-shadow hover:shadow-md h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    {template.isDefault && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Built-in
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {CLIMATE_SURVEY_TYPE_LABELS[template.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {template._count.questions} questions
                    </span>
                    {template._count.surveys > 0 && (
                      <span className="text-xs text-muted-foreground">
                        · {template._count.surveys} survey{template._count.surveys !== 1 ? "s" : ""} created
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function ClimateTemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Climate Templates"
        description="Reusable survey templates for organizational climate assessments"
      >
        <Button asChild>
          <Link href="/surveys/climate/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<TemplatesLoading />}>
        <TemplatesList />
      </Suspense>
    </div>
  );
}
