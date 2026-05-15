import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* The auth shell is intentionally minimal — the login/signup pages
          own their own full-bleed layouts (logo, two-panel split, etc.) so
          they can render edge-to-edge without a global header. */}
      <div className="min-h-screen bg-muted/30">{children}</div>
    </NextIntlClientProvider>
  );
}
