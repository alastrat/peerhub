import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { CompanyDomainForm } from "@/components/settings/company-domain-form";

export default async function CompanyDomainPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, domain: true },
  });

  if (!company) redirect("/settings/profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Domain"
        description={`Email domain for ${company.name}. Users with this domain can auto-join the company.`}
      />
      <CompanyDomainForm
        companyId={company.id}
        currentDomain={company.domain}
      />
    </div>
  );
}
