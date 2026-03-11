import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { CycleWizard } from "@/components/cycles/cycle-wizard";

async function getTemplates(companyId: string) {
  return prisma.template.findMany({
    where: { companyId, isArchived: false },
    orderBy: { name: "asc" },
  });
}

async function getEmployees(companyId: string) {
  return prisma.employee.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export default async function NewCyclePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const [templates, employees] = await Promise.all([
    getTemplates(session.companyUser.companyId),
    getEmployees(session.companyUser.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Review Cycle"
        description="Set up a new 360° feedback review cycle"
      />

      <CycleWizard templates={templates} employees={employees} />
    </div>
  );
}
