"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmailSignature } from "@/lib/actions/email-signature";

export function EmailSignatureCard({ current, fallback }: { current: string; fallback: string }) {
  const t = useTranslations("dashboard.settings_pages.appearance.email_signature");
  const [saved, setSaved] = useState(current);
  const [value, setValue] = useState(current);
  const [isPending, startTransition] = useTransition();
  const shown = value.trim() || fallback;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateEmailSignature(value);
      if (result.success) {
        setSaved(value.trim());
        setValue(value.trim());
        toast.success(t("saved"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="email-signature">{t("label")}</Label>
          <Input
            id="email-signature"
            value={value}
            maxLength={80}
            placeholder={fallback}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{t("hint", { fallback })}</p>
        </div>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("preview")}</p>
          <p>
            {t("sign_off")}
            <br />
            {shown} · Kultiva SAS
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending || value.trim() === saved.trim()}>
          {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
