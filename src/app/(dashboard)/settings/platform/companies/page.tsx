import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getPlatformCompanies } from "@/lib/queries/platform";
import { PageHeader } from "@/components/design-system/page-header";
import { CompaniesTable } from "@/components/settings/companies-table";

export default async function CompaniesPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const companies = await getPlatformCompanies();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage all companies on the platform"
      />
      <CompaniesTable
        companies={companies.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
