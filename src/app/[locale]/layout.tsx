import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: {
    template: "%s | Kultiva",
    default: "Kultiva | Consultoría Organizacional",
  },
  description:
    "Agencia de consultoría organizacional en Colombia. Sembrando ideas para recoger grandes resultados. Expertos en cultura, cambio, selección y comunicación.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Kultiva",
    title: "Kultiva | Consultoría Organizacional",
    description:
      "Transformamos organizaciones a través de estrategias innovadoras. +15 años de experiencia, +200 clientes satisfechos en Colombia y Latinoamérica.",
    images: [
      {
        url: "/images/team/conference-1.jpg",
        width: 1200,
        height: 630,
        alt: "Kultiva - Consultoría Organizacional",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kultiva | Consultoría Organizacional",
    description:
      "Transformamos organizaciones a través de estrategias innovadoras en cultura, cambio, selección y comunicación interna.",
    images: ["/images/team/conference-1.jpg"],
  },
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
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
