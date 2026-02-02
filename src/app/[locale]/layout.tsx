import type { Metadata } from "next";
import { Kanit, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/kultiva/theme.css";
import "../globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--kultiva-font-heading",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--kultiva-font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Kultiva",
    default: "Kultiva | Consultoria Organizacional",
  },
  description:
    "Agencia de consultoria organizacional. Sembrando ideas para recoger grandes resultados.",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as "es" | "en")) {
    notFound();
  }

  // Load messages for the current locale
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${kanit.variable} ${plusJakarta.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
