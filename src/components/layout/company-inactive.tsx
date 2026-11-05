"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/email/email-constants";

/** Shown instead of the dashboard to members whose only company was deactivated. */
export function CompanyInactiveNotice() {
  const t = useTranslations("dashboard.company_inactive");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="max-w-md space-y-4 rounded-2xl border bg-background p-8 text-center shadow-sm">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("body", { email: SUPPORT_EMAIL })}</p>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-1.5 h-4 w-4" />
          {t("sign_out")}
        </Button>
      </div>
    </div>
  );
}

/** Reminds a super admin that the company they're looking at is deactivated. */
export function CompanyInactiveBanner({ companyName }: { companyName: string }) {
  const t = useTranslations("dashboard.company_inactive");
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{t("banner", { company: companyName })}</p>
    </div>
  );
}
