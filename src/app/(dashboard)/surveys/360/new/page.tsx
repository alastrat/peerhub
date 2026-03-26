import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { CycleWizard } from "@/components/cycles/cycle-wizard";

export default async function NewCyclePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const [templates, employees, departments, teams, hubs, company] = await Promise.all([
    prisma.template.findMany({ where: { companyId, isArchived: false }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.team.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.hub.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { featureHubs: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Review Cycle"
        description="Set up a new 360° feedback review cycle"
      />

      <CycleWizard
        templates={templates}
        employees={employees}
        departments={departments}
        teams={teams}
        hubs={hubs}
        featureHubs={company?.featureHubs ?? false}
      />
    </div>
  );
}
