import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { TemplateBuilder } from "@/components/templates/template-builder";
import type { QuestionType, ReviewerType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
    },
  });
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const template = await getTemplate(session.companyUser.companyId, id);

  if (!template) {
    notFound();
  }

  // Transform to form data format
  const initialData = {
    id: template.id,
    name: template.name,
    description: template.description || "",
    sections: template.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description || "",
      order: section.order,
      reviewerTypes: section.reviewerTypes as ReviewerType[],
      questions: section.questions.map((question) => ({
        id: question.id,
        text: question.text,
        description: question.description || "",
        type: question.type as QuestionType,
        isRequired: question.isRequired,
        order: question.order,
        config: question.config as Record<string, unknown> | undefined,
      })),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/templates/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Edit: ${template.name}`}
          description="Modify the template sections and questions"
        />
      </div>

      <TemplateBuilder initialData={initialData} mode="edit" />
    </div>
  );
}
