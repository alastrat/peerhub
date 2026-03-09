import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal information"
      />
      <ProfileForm user={user} />
    </div>
  );
}
