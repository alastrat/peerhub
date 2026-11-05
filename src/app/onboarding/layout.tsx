import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Logo } from "@/components/design-system/logo";
import { getPlatformTheme } from "@/lib/queries/platform-theme";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding runs before the user has selected a company, so we don't yet
  // have a tenant-scoped locale. The default (es) is set in i18n/routing.ts
  // and resolved by getMessages via the request config.
  const messages = await getMessages();
  // The Kultiva theme puts this header on the purple backdrop.
  const platformTheme = await getPlatformTheme();

  return (
    <NextIntlClientProvider messages={messages}>
      <div data-app-shell="onboarding" className="flex min-h-screen flex-col">
        <header data-app-header className="flex h-16 items-center justify-center border-b">
          <Logo variant={platformTheme === "kultiva" ? "white" : "color"} />
        </header>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
