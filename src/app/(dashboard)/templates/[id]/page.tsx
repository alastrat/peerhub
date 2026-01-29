import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Copy, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
import { formatRelativeTime } from "@/lib/utils/dates";

interface PageProps {
  params: Promise<{ id: string }>;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  RATING: "Rating (1-5)",
  TEXT: "Open Text",
  COMPETENCY_RATING: "Competency Rating",
  MULTIPLE_CHOICE: "Multiple Choice",
};

async function getTemplate(companyId: string, templateId: string) {
  return prisma.template.findFirst({
    where: {
      id: templateId,
      companyId,
      isArchived: false,
    },
    include: {
      sections: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: { cycles: true },
      },
    },
  });
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const template = await getTemplate(session.companyUser.companyId, id);

  if (!template) {
    notFound();
  }

  const totalQuestions = template.sections.reduce(
    (acc, s) => acc + s.questions.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={template.name}
          description={template.description || "No description"}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/templates/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{template.sections.length}</div>
            <p className="text-sm text-muted-foreground">Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-sm text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{template._count.cycles}</div>
            <p className="text-sm text-muted-foreground">Cycles Using</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatRelativeTime(template.updatedAt)}
            </div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Template Preview</h2>

        {template.sections.map((section, index) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {index + 1}. {section.title}
                  </CardTitle>
                  {section.description && (
                    <CardDescription>{section.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {section.reviewerTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {REVIEWER_TYPE_LABELS[type as keyof typeof REVIEWER_TYPE_LABELS]}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {qIndex + 1}.
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{question.text}</p>
                      {question.description && (
                        <p className="text-sm text-muted-foreground">
                          {question.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[question.type]}
                        </Badge>
                        {question.isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {section.questions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No questions in this section
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {template.sections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                This template has no sections yet.
              </p>
              <Button className="mt-4" asChild>
                <Link href={`/templates/${id}/edit`}>Add Sections</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
