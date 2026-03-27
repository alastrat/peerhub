import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin =
    isSuperAdmin || session.companyUser?.role === "ADMIN";

  let featureHubs = false;
  if (isCompanyAdmin && session.companyUser?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.companyUser.companyId },
      select: { featureHubs: true },
    });
    featureHubs = company?.featureHubs ?? false;
  }

  return (
    <div className="flex gap-8">
      <SettingsNav
        isCompanyAdmin={isCompanyAdmin}
        isSuperAdmin={isSuperAdmin}
        featureHubs={featureHubs}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
