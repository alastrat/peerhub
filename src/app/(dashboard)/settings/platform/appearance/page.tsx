import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { readPlatformTheme } from "@/lib/queries/platform-theme";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
import { PlatformThemeSwitcher } from "@/components/settings/platform-theme-switcher";

export default async function AppearancePage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  // Uncached on purpose: this page shows what is saved right now.
  const theme = await readPlatformTheme();

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="appearance_title"
        descriptionKey="appearance_description"
      />
      <PlatformThemeSwitcher currentTheme={theme} />
    </div>
  );
}
