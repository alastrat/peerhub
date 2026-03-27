import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { ClimateTemplateWizard } from "@/components/climate/climate-template-wizard";

export default async function NewClimateTemplatePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

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
        title="Create Template"
        description="Build a reusable climate survey template"
      />
      <ClimateTemplateWizard dimensions={dimensions} />
    </div>
  );
}
