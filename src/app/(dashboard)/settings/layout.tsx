import { auth } from "@/lib/auth/config";
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

  return (
    <div className="flex gap-8">
      <SettingsNav
        isCompanyAdmin={isCompanyAdmin}
        isSuperAdmin={isSuperAdmin}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
