import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditEmployeeForm } from "@/components/people/edit-employee-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getEmployee(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
    include: {
      department: true,
      manager: true,
      companyUser: true,
    },
  });
}

async function getDepartments(companyId: string) {
  return prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

async function getManagers(companyId: string, excludeId: string) {
  return prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      id: { not: excludeId },
    },
    orderBy: { name: "asc" },
  });
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const companyId = session.companyUser.companyId;
  const [employee, departments, managers, hubs, company] = await Promise.all([
    getEmployee(companyId, id),
    getDepartments(companyId),
    getManagers(companyId, id),
    prisma.hub.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { featureHubs: true } }),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/people/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Edit ${employee.name || "Employee"}`}
          description="Update employee information"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>
            Update the employee's role, department, and other information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditEmployeeForm
            employee={employee}
            departments={departments}
            managers={managers}
            hubs={hubs}
            featureHubs={company?.featureHubs ?? false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
