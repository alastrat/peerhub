import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { ClimateTemplateWizard } from "@/components/climate/climate-template-wizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClimateTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const [template, dimensions] = await Promise.all([
    prisma.climateSurveyTemplate.findFirst({
      where: { id, companyId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    }),
    prisma.climateDimension.findMany({
      where: {
        OR: [{ companyId }, { companyId: null, isDefault: true }],
      },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!template) notFound();

  const initialData = {
    id: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    questions: template.questions.map((q) => ({
      text: q.text,
      type: q.type as "LIKERT" | "TEXT" | "NPS" | "RATING",
      dimensionId: q.dimensionId,
      isRequired: q.isRequired,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/surveys/climate/templates/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Edit: ${template.name}`}
          description="Modify this climate survey template"
        />
      </div>
      <ClimateTemplateWizard
        dimensions={dimensions}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}
