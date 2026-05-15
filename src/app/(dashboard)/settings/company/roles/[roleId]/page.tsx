import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { RoleEditor } from "@/components/settings/role-editor";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("dashboard.roles_page");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const role = await prisma.companyRoleConfig.findUnique({
    where: { id: roleId },
    include: { _count: { select: { members: true } } },
  });

  if (!role || role.companyId !== companyId) notFound();

  const canEdit = !role.isSystem || isSuperAdmin;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      featureAts: true,
      featureOnboarding: true,
      featureWorkEnv: true,
    },
  });

  // Other roles for reassignment on delete
  const otherRoles = await prisma.companyRoleConfig.findMany({
    where: { companyId, id: { not: roleId } },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/company/roles">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={t("edit_heading", { name: role.name })}
          description={
            role.isSystem
              ? t("system_role_hint")
              : t(
                  role._count.members === 1
                    ? "custom_role_members_one"
                    : "custom_role_members_other",
                  { count: role._count.members },
                )
          }
          className="mb-0"
        />
      </div>
      <RoleEditor
        role={{
          id: role.id,
          name: role.name,
          description: role.description,
          color: role.color || "#6b7280",
          baseRole: role.baseRole,
          isSystem: role.isSystem,
          permissions: role.permissions as Record<string, string>,
          membersCount: role._count.members,
        }}
        featureFlags={{
          featureAts: company?.featureAts || false,
          featureOnboarding: company?.featureOnboarding || false,
          featureWorkEnv: company?.featureWorkEnv || false,
        }}
        otherRoles={otherRoles}
        readOnly={!canEdit}
      />
    </div>
  );
}
