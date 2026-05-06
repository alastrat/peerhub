import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding runs before the user has selected a company, so we don't yet
  // have a tenant-scoped locale. The default (es) is set in i18n/routing.ts
  // and resolved by getMessages via the request config.
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
