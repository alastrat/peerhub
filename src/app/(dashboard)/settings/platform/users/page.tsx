import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getPlatformUsers } from "@/lib/queries/platform";
import { PageHeader } from "@/components/design-system/page-header";
import { UsersTable } from "@/components/settings/users-table";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const users = await getPlatformUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage all users across the platform"
      />
      <UsersTable
        currentUserId={session.user.id}
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
