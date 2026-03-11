import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { MembersTable } from "@/components/settings/members-table";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const [members, invitations] = await Promise.all([
    prisma.companyUser.findMany({
      where: {
        companyId,
        user: { globalRole: { not: "SUPER_ADMIN" } },
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        employee: {
          include: { department: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { companyId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage company members and their roles"
      />
      <MembersTable
        companyId={companyId}
        currentUserId={session.user.id}
        members={members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          role: m.role,
          title: m.employee?.title || null,
          department: m.employee?.department?.name || null,
          isActive: m.isActive,
          createdAt: m.createdAt.toISOString(),
        }))}
        invitations={invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
