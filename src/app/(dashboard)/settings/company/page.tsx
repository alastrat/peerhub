import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { CompanySettingsContent } from "@/components/settings/company-settings-content";

export default async function CompanySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin =
    isSuperAdmin || session.companyUser?.role === "ADMIN";

  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: { users: true, cycles: true, departments: true },
      },
      departments: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!company) redirect("/settings/profile");

  return (
    <CompanySettingsContent
      company={{
        name: company.name,
        slug: company.slug,
        domain: company.domain,
        locale: company.locale,
        _count: company._count,
        departments: company.departments,
      }}
    />
  );
}
