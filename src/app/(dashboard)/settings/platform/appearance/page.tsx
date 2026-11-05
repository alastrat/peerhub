import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { readPlatformTheme } from "@/lib/queries/platform-theme";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";
import { PlatformThemeSwitcher } from "@/components/settings/platform-theme-switcher";
import { EmailSignatureCard } from "@/components/settings/email-signature-card";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_EMAIL_SIGNATURE, EMAIL_SIGNATURE_SETTING_KEY } from "@/lib/email/email-constants";

export default async function AppearancePage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  // Uncached on purpose: this page shows what is saved right now.
  const [theme, signature] = await Promise.all([
    readPlatformTheme(),
    prisma.platformSetting.findUnique({ where: { key: EMAIL_SIGNATURE_SETTING_KEY }, select: { value: true } }),
  ]);

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="appearance_title"
        descriptionKey="appearance_description"
      />
      <PlatformThemeSwitcher currentTheme={theme} />
      <EmailSignatureCard current={signature?.value ?? ""} fallback={DEFAULT_EMAIL_SIGNATURE} />
    </div>
  );
}
