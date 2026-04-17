import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { SurveyWizard } from "@/components/climate/survey-wizard";

export default async function NewSurveyPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  // Fetch dimensions (company-specific + global defaults) and available templates
  const [dimensions, templates] = await Promise.all([
    prisma.climateDimension.findMany({
      where: {
        OR: [{ companyId }, { companyId: null, isDefault: true }],
      },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.climateSurveyTemplate.findMany({
      where: {
        isArchived: false,
        OR: [{ companyId }, { companyId: null, isDefault: true }],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    }),
  ]);

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type,
    isDefault: t.isDefault,
    questionCount: t.questions.length,
    questions: t.questions.map((q) => ({
      text: q.text,
      type: q.type as "LIKERT" | "TEXT" | "NPS" | "RATING",
      dimensionId: q.dimensionId ?? "",
      isRequired: q.isRequired,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Survey"
        description="Build a new work environment survey"
      />
      <SurveyWizard dimensions={dimensions} templates={templateOptions} />
    </div>
  );
}
