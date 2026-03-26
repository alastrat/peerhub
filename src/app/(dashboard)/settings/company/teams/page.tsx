import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { TeamsManager } from "@/components/settings/teams-manager";

export default async function TeamsSettingsPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const [teams, departments, hubs, employees, company] = await Promise.all([
    prisma.team.findMany({
      where: { companyId },
      include: {
        department: { select: { id: true, name: true } },
        hub: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.hub.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { featureHubs: true },
    }),
  ]);

  return (
    <TeamsManager
      teams={teams}
      departments={departments}
      hubs={hubs}
      employees={employees}
      featureHubs={company?.featureHubs ?? false}
    />
  );
}
