import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { CSVImportWizard } from "@/components/people/csv-import-wizard";

async function getDepartments(companyId: string) {
  return prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export default async function ImportPeoplePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const departments = await getDepartments(session.companyUser.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Employees"
        description="Bulk import employees from a CSV file"
      />

      <CSVImportWizard departments={departments} />
    </div>
  );
}
