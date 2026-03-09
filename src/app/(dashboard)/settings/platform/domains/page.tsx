import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getSuperAdminDomains } from "@/lib/queries/platform";
import { PageHeader } from "@/components/design-system/page-header";
import { DomainsManager } from "@/components/settings/domains-manager";

export default async function DomainsPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const domains = await getSuperAdminDomains();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Domains"
        description="Email domains that automatically grant Super Admin access to new users"
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
