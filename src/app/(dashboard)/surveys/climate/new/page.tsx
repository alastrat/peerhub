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

  // Fetch dimensions (company-specific + global defaults)
  const dimensions = await prisma.climateDimension.findMany({
    where: {
      OR: [{ companyId }, { companyId: null, isDefault: true }],
    },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Survey"
        description="Build a new work environment survey"
      />
      <SurveyWizard dimensions={dimensions} />
    </div>
  );
}
