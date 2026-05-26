"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadSurveyWallpaper } from "@/lib/actions/climate-surveys";
import type {
  WallpaperConfig,
  WallpaperStyle,
} from "@/lib/utils/wallpaper";
import {
  GRADIENT_PRESETS,
  PATTERN_OPTIONS,
  getWallpaperCSS,
} from "@/lib/utils/wallpaper";

const STYLE_KEYS: { key: WallpaperStyle; tKey: string }[] = [
  { key: "fill", tKey: "style_fill" },
  { key: "gradient", tKey: "style_gradient" },
  { key: "blur", tKey: "style_blur" },
  { key: "pattern", tKey: "style_pattern" },
  { key: "image", tKey: "style_image" },
];

const DIRECTION_KEYS = [
  { key: "linear-up" as const, tKey: "direction_up" },
  { key: "linear-down" as const, tKey: "direction_down" },
  { key: "radial" as const, tKey: "direction_radial" },
];

interface WallpaperPickerProps {
  value: WallpaperConfig | null;
  onChange: (config: WallpaperConfig) => void;
  defaultColor?: string;
}

export function WallpaperPicker({
  value,
  onChange,
  defaultColor = "#613171",
}: WallpaperPickerProps) {
  const t = useTranslations("dashboard.climate.wizard.wallpaper");
  const currentStyle: WallpaperStyle = value?.style ?? "fill";
  const currentColor =
    (value && "color" in value ? value.color : null) ?? defaultColor;

  const setStyle = (style: WallpaperStyle) => {
    switch (style) {
      case "fill":
        onChange({ style: "fill", color: currentColor });
        break;
      case "gradient":
        onChange({
          style: "gradient",
          color: currentColor,
          color2: currentColor + "88",
          direction: "linear-down",
        });
        break;
      case "blur":
        onChange({ style: "blur", color: currentColor });
        break;
      case "pattern":
        onChange({ style: "pattern", color: currentColor, pattern: "grid" });
        break;
      case "image":
        onChange({
          style: "image",
          url: (value?.style === "image" ? value.url : "") || "",
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Style selector — row of thumbnails */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          {t("style_label")}
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_KEYS.map((opt) => {
            const previewConfig: WallpaperConfig =
              opt.key === "fill"
                ? { style: "fill", color: currentColor }
                : opt.key === "gradient"
                  ? { style: "gradient", color: currentColor, color2: currentColor + "88", direction: "linear-down" }
                  : opt.key === "blur"
                    ? { style: "blur", color: currentColor }
                    : opt.key === "pattern"
                      ? { style: "pattern", color: currentColor, pattern: "grid" }
                      : { style: "image", url: "" };
            const css = getWallpaperCSS(previewConfig, currentColor);
            const isImage = opt.key === "image";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStyle(opt.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 transition-colors",
                  currentStyle === opt.key
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "h-12 w-full rounded-md",
                    isImage && "flex items-center justify-center bg-muted text-muted-foreground text-xs",
                  )}
                  style={isImage ? undefined : css.style}
                >
                  {isImage && "🖼"}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {t(opt.tKey as never)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-options based on selected style */}
      {currentStyle === "fill" && value?.style === "fill" && (
        <ColorInput
          label={t("background_color")}
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
        />
      )}

      {currentStyle === "gradient" && value?.style === "gradient" && (
        <div className="space-y-3">
          {/* Custom vs Pre-made toggle */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("gradient_style")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, preset: undefined })
                }
                className={cn(
                  "rounded-lg border py-2 text-sm font-medium transition-colors",
                  !value.preset
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                )}
              >
                {t("gradient_custom")}
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, preset: "rose-quartz" })
                }
                className={cn(
                  "rounded-lg border py-2 text-sm font-medium transition-colors",
                  value.preset
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                )}
              >
                {t("gradient_premade")}
              </button>
            </div>
          </div>

          {value.preset ? (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                {t("gradient")}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ ...value, preset: key })}
                    className={cn(
                      "h-12 rounded-lg border-2 transition-colors",
                      value.preset === key
                        ? "border-primary"
                        : "border-transparent hover:border-border",
                    )}
                    style={{ background: preset.css }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <ColorInput
                label={t("color_1")}
                value={value.color}
                onChange={(color) => onChange({ ...value, color })}
              />
              <ColorInput
                label={t("color_2")}
                value={value.color2}
                onChange={(color2) => onChange({ ...value, color2 })}
              />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  {t("direction")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {DIRECTION_KEYS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => onChange({ ...value, direction: d.key })}
                      className={cn(
                        "rounded-lg border py-2 text-sm font-medium transition-colors",
                        value.direction === d.key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {t(d.tKey as never)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {currentStyle === "blur" && value?.style === "blur" && (
        <ColorInput
          label={t("background_color")}
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
        />
      )}

      {currentStyle === "pattern" && value?.style === "pattern" && (
        <div className="space-y-3">
          <ColorInput
            label={t("background_color")}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("pattern")}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {PATTERN_OPTIONS.map((p) => {
                const previewCSS = getWallpaperCSS({
                  style: "pattern",
                  color: value.color,
                  pattern: p.key,
                });
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onChange({ ...value, pattern: p.key })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-colors",
                      value.pattern === p.key
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border",
                    )}
                  >
                    <div
                      className="h-10 w-full rounded-md"
                      style={previewCSS.style}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {currentStyle === "image" && value?.style === "image" && (
        <ImageUploadField
          value={value.url}
          onChange={(url) => onChange({ ...value, url })}
        />
      )}
    </div>
  );
}

function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("dashboard.climate.wizard.wallpaper");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadSurveyWallpaper(formData);
      if (res.success && res.data) {
        onChange(res.data.url);
      } else if (!res.success) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{t("image_upload_label")}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/30">
          <div className="relative aspect-[3/1] w-full">
            <Image
              src={value}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-background p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t("image_replace")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              disabled={uploading}
            >
              <X className="mr-2 h-4 w-4" />
              {t("image_remove")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
          <span className="font-medium text-foreground">
            {uploading ? t("image_uploading") : t("image_upload_cta")}
          </span>
          <span className="text-xs">{t("image_upload_hint")}</span>
        </button>
      )}
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#613171"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
