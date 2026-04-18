import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
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
      <TranslatedPageHeader
        titleKey="profile_title"
        descriptionKey="profile_description"
      />
      <ProfileForm user={user} />
    </div>
  );
}
