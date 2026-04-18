"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingPage } from "@/components/design-system/loading-spinner";

import esMessages from "@/messages/es.json";
import enMessages from "@/messages/en.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messages: Record<string, any> = {
  es: esMessages,
  en: enMessages,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <LoadingPage />;
  }

  if (!session) {
    redirect("/login");
  }

  // Super admins can access settings even without a company
  if (!session.companyUser && session.user?.globalRole !== "SUPER_ADMIN") {
    redirect("/onboarding");
  }

  const locale = session.companyUser?.locale ?? "es";

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale] ?? messages.es}>
      <div className="min-h-screen bg-muted">
        <Sidebar />
        <div className="flex min-h-screen flex-col pl-16">
          <Header />
          <main className="flex-1 rounded-tl-2xl bg-background p-6 shadow-sm">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
