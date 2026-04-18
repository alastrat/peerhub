import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getPlatformUsers } from "@/lib/queries/platform";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
import { UsersTable } from "@/components/settings/users-table";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const users = await getPlatformUsers();

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="users_title"
        descriptionKey="users_description"
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
