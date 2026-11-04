import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Logo } from "@/components/design-system/logo";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  const locale = await getPortalLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "portal.layout" });

  let displayName: string | null = null;
  if (session) {
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { name: true },
    });
    displayName = employee?.name || null;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/portal">
            <Logo />
          </Link>
          {session && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {displayName || session.email}
              </span>
              <Link href="/portal/sign-out">
                <Button variant="ghost" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("sign_out")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>

      <footer className="border-t bg-background py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("powered_by")}</p>
        </div>
      </footer>
    </div>
    </NextIntlClientProvider>
  );
}
