import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { DepartmentsManager } from "@/components/settings/departments-manager";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const departments = await prisma.department.findMany({
    where: { companyId },
    include: {
      _count: { select: { employees: true } },
      parent: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage company departments and team structure"
      />
      <DepartmentsManager
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          parentId: d.parentId,
          parentName: d.parent?.name || null,
          membersCount: d._count.employees,
        }))}
      />
    </div>
  );
}
