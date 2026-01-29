import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "@/components/people/employee-form";

async function getDepartments(companyId: string) {
  return prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

async function getManagers(companyId: string) {
  return prisma.companyUser.findMany({
    where: {
      companyId,
      isActive: true,
      role: { in: ["ADMIN", "MANAGER"] },
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
}

export default async function AddEmployeePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const [departments, managers] = await Promise.all([
    getDepartments(session.companyUser.companyId),
    getManagers(session.companyUser.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Employee"
        description="Add a new team member to your organization"
      />

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>
            Enter the employee's information. They will receive an invitation email to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            departments={departments}
            managers={managers}
            mode="invite"
          />
        </CardContent>
      </Card>
    </div>
  );
}
