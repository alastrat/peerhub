import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getSuperAdminDomains } from "@/lib/queries/platform";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
import { DomainsManager } from "@/components/settings/domains-manager";

export default async function DomainsPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const domains = await getSuperAdminDomains();

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="admin_domains_title"
        descriptionKey="admin_domains_description"
      />
      <DomainsManager
        domains={domains.map((d) => ({
          id: d.id,
          domain: d.domain,
          createdAt: d.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
