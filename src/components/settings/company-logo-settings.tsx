"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImageIcon, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { removeCompanyLogo, updateCompanyLogo } from "@/lib/actions/platform";

// Mirrors the server-side checks in updateCompanyLogo, so users get instant
// feedback instead of waiting for the upload to fail.
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

interface CompanyLogoSettingsProps {
  currentLogo: string | null;
}

export function CompanyLogoSettings({ currentLogo }: CompanyLogoSettingsProps) {
  const t = useTranslations("dashboard.settings.logo");
  const router = useRouter();
  const [logo, setLogo] = useState(currentLogo);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice re-fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("invalid_type"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("too_large"));
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await updateCompanyLogo(formData);
      if (result.success && result.data) {
        setLogo(result.data.logo);
        toast.success(t("updated"));
        router.refresh();
      } else {
        toast.error(t("error"));
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeCompanyLogo();
      if (result.success) {
        setLogo(null);
        toast.success(t("removed"));
        router.refresh();
      } else {
        toast.error(t("error"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={t("alt")}
              className="h-16 w-40 shrink-0 rounded-lg border bg-white object-contain p-2"
            />
          ) : (
            <div className="flex h-16 w-40 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
              <ImagePlus className="h-5 w-5" />
              {t("empty")}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isPending ? t("saving") : logo ? t("replace") : t("upload")}
            </Button>
            {logo && (
              <Button type="button" variant="ghost" onClick={handleRemove} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
                {t("remove")}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}
