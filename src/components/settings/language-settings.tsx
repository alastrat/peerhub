"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateCompanyLocale } from "@/lib/actions/platform";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "en", label: "English", flag: "🇺🇸" },
] as const;

interface LanguageSettingsProps {
  currentLocale: string;
}

export function LanguageSettings({ currentLocale }: LanguageSettingsProps) {
  const t = useTranslations("dashboard.settings.language");
  const [isPending, startTransition] = useTransition();

  function handleChange(locale: string) {
    if (locale === currentLocale) return;

    startTransition(async () => {
      const result = await updateCompanyLocale(locale);

      if (result.success) {
        toast.success(t("updated"));
        window.location.reload();
      } else {
        toast.error(result.error || t("error"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={currentLocale} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {isPending
                ? t("saving")
                : `${LANGUAGES.find((l) => l.value === currentLocale)?.flag} ${LANGUAGES.find((l) => l.value === currentLocale)?.label}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
