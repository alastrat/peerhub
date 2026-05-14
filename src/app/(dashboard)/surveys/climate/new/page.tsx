import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/design-system/page-header";
import { SurveyWizard } from "@/components/climate/survey-wizard";

export default async function NewSurveyPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const t = await getTranslations("dashboard.climate.create_survey_page");

  const companyId = session.companyUser.companyId;

  // Fetch dimensions, templates, and the rosters needed for the
  // Participants step (employees, departments, teams, hubs + the hubs
  // feature flag).
  const [dimensions, templates, employees, departments, teams, hubs, company] =
    await Promise.all([
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
      prisma.employee.findMany({
        where: { companyId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, title: true, departmentId: true },
      }),
      prisma.department.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.team.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.hub.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { featureHubs: true },
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
      <PageHeader title={t("title")} description={t("description")} />
      <SurveyWizard
        dimensions={dimensions}
        templates={templateOptions}
        employees={employees}
        departments={departments}
        teams={teams}
        hubs={hubs}
        featureHubs={company?.featureHubs ?? false}
      />
    </div>
  );
}
