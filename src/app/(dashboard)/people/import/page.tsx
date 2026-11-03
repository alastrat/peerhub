import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/design-system/page-header";
import { CSVImportWizard } from "@/components/people/csv-import-wizard";

export default async function ImportPeoplePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  // Dashboard routes have no locale segment: follow the company's language
  const t = await getTranslations({ locale: session.companyUser.locale ?? "es", namespace: "people_import" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        description={t("page_description")}
      />

      <CSVImportWizard />
    </div>
  );
}
