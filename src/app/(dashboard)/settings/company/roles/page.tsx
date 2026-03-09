import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { getCompanyRoles } from "@/lib/actions/roles";
import { RolesList } from "@/components/settings/roles-list";

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const roles = await getCompanyRoles(companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Company roles and their permissions"
      />
      <RolesList
        isSuperAdmin={isSuperAdmin}
        roles={roles.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description,
          baseRole: r.baseRole,
          isSystem: r.isSystem,
          color: r.color || "#6b7280",
          permissions: r.permissions as Record<string, string>,
          membersCount: r._count.members,
        }))}
      />
    </div>
  );
}
