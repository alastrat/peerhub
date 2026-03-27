import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Copy, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  SURVEY_QUESTION_TYPE_LABELS,
} from "@/lib/constants/climate-survey";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClimateTemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const template = await prisma.climateSurveyTemplate.findFirst({
    where: {
      id,
      OR: [{ companyId }, { companyId: null, isDefault: true }],
    },
    include: {
      questions: {
        include: { dimension: { select: { name: true } } },
        orderBy: { order: "asc" },
      },
      _count: { select: { surveys: true } },
    },
  });

  if (!template) notFound();

  const isOwned = template.companyId === companyId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/surveys/climate/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={template.name}
          description={template.description || "No description"}
        />
        {isOwned && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/surveys/climate/templates/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <Badge variant="secondary">
              {CLIMATE_SURVEY_TYPE_LABELS[template.type]}
            </Badge>
            <p className="mt-1 text-sm text-muted-foreground">Survey Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{template.questions.length}</div>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{template._count.surveys}</div>
            <p className="text-sm text-muted-foreground">Surveys Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>{template.questions.length} questions in this template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {template.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{q.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                    </Badge>
                    {q.dimension && (
                      <Badge variant="secondary" className="text-xs">
                        {q.dimension.name}
                      </Badge>
                    )}
                    {q.isRequired && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
