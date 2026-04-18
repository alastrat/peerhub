"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateCompanyLocale } from "@/lib/actions/platform";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "en", label: "English", flag: "🇺🇸" },
] as const;

interface LanguageSettingsProps {
  currentLocale: string;
}

export function LanguageSettings({ currentLocale }: LanguageSettingsProps) {
  const [selected, setSelected] = useState(currentLocale);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasChanged = selected !== currentLocale;

  function handleSave() {
    startTransition(async () => {
      const result = await updateCompanyLocale(selected);

      if (result.success) {
        toast.success(
          `Idioma actualizado a ${LANGUAGES.find((l) => l.value === selected)?.label}`
        );
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar el idioma");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Idioma</CardTitle>
        </div>
        <CardDescription>
          Define el idioma predeterminado para todos los miembros de esta empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => setSelected(lang.value)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                selected === lang.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  selected === lang.value
                    ? "border-primary"
                    : "border-muted-foreground/30"
                }`}
              >
                {selected === lang.value && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-sm font-medium">{lang.label}</span>
              {currentLocale === lang.value && !hasChanged && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanged || isPending}
          className="w-full"
        >
          {isPending ? "Guardando..." : "Guardar Idioma"}
        </Button>
      </CardContent>
    </Card>
  );
}
