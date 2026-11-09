"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/design-system/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestPortalAccess } from "@/lib/actions/portal";

export default function PortalLoginPage() {
  const t = useTranslations("portal.sign_in");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(
    error === "invalid-token" ? t("invalid_link") : null
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError(t("email_required"));
      return;
    }

    startTransition(async () => {
      const result = await requestPortalAccess(
        email.trim().toLowerCase(),
        redirectTo || undefined,
      );

      if (result.success) {
        setSent(true);
      } else {
        // The action's only error is a generic server failure
        setFormError(t("generic_error"));
      }
    });
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("check_email_title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.rich("check_email_body", {
                    email,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                {t("use_different_email")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("email_label")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("email_placeholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {t("hint")}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                {t("no_email_hint")}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
