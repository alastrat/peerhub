import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getPlatformCompanies } from "@/lib/queries/platform";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
import { CompaniesTable } from "@/components/settings/companies-table";

export default async function CompaniesPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const companies = await getPlatformCompanies();

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="companies_title"
        descriptionKey="companies_description"
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
