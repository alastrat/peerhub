import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "@/components/people/employee-form";

export default async function AddEmployeePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;

  const [departments, managers, hubs, company] = await Promise.all([
    prisma.department.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.hub.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { featureHubs: true } }),
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
            Enter the employee&apos;s information. They will receive an invitation email to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            departments={departments}
            managers={managers}
            hubs={hubs}
            featureHubs={company?.featureHubs ?? false}
            mode="invite"
          />
        </CardContent>
      </Card>
    </div>
  );
}
