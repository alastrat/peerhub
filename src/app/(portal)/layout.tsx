import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Logo } from "@/components/design-system/logo";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { getPlatformTheme } from "@/lib/queries/platform-theme";
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
  // The Kultiva theme puts this header on the purple backdrop.
  const platformTheme = await getPlatformTheme();

  let displayName: string | null = null;
  let companyInactive = false;
  if (session) {
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { name: true, company: { select: { isActive: true } } },
    });
    displayName = employee?.name || null;
    companyInactive = employee?.company.isActive === false;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
    <div data-app-shell="portal" className="min-h-screen bg-muted/30 flex flex-col">
      <header data-app-header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/portal">
            <Logo variant={platformTheme === "kultiva" ? "white" : "color"} />
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

      <main data-app-main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {companyInactive ? (
          <div className="mx-auto max-w-md rounded-xl border bg-background p-8 text-center">
            <h1 className="text-lg font-semibold">{t("company_inactive_title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("company_inactive_body")}</p>
          </div>
        ) : (
          children
        )}
      </main>

      <footer data-app-footer className="border-t bg-background py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("powered_by")}</p>
        </div>
      </footer>
    </div>
    </NextIntlClientProvider>
  );
}
