"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { updatePlatformTheme } from "@/lib/actions/platform-theme";
import { PLATFORM_THEMES, type PlatformTheme } from "@/lib/constants/platform-theme";

export function PlatformThemeSwitcher({ currentTheme }: { currentTheme: PlatformTheme }) {
  const t = useTranslations("dashboard.settings_pages.appearance");
  const [savedTheme, setSavedTheme] = useState(currentTheme);
  const [selected, setSelected] = useState(currentTheme);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    startTransition(async () => {
      const result = await updatePlatformTheme(selected);
      if (result.success) {
        setSavedTheme(selected);
        toast.success(t("applied"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t("scope_note")}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("themes_label")}
        className="grid gap-4 md:grid-cols-2"
      >
        {PLATFORM_THEMES.map((theme) => {
          const isSelected = selected === theme;
          return (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(theme)}
              disabled={isPending}
              // border-solid: bizzen/style.css strips <button> borders.
              className={cn(
                "group rounded-xl border-2 border-solid bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70",
                isSelected ? "border-primary" : "border-border hover:border-primary/40"
              )}
            >
              <ThemePreview theme={theme} />
              <div className="mt-3 flex items-start justify-between gap-3 px-1 pb-1">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{t(`${theme}.name`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`${theme}.description`)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                    aria-hidden
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  {savedTheme === theme && <Badge variant="secondary">{t("current")}</Badge>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleApply} disabled={isPending || selected === savedTheme}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? t("applying") : t("apply")}
        </Button>
      </div>
    </div>
  );
}

/**
 * A miniature of the app shell (rail, top bar, page with cards) drawn in each
 * theme's own colors, so both previews look right whichever theme is active.
 */
function ThemePreview({ theme }: { theme: PlatformTheme }) {
  const kultiva = theme === "kultiva";
  const p = kultiva
    ? {
        backdrop:
          "radial-gradient(120% 90% at 50% 15%, #7c3584, transparent 62%), linear-gradient(165deg, #39114f, #1c0930)",
        railIcon: "rgba(255,255,255,.55)",
        railActive: "#ffffff",
        bar: "rgba(255,255,255,.12)",
        surface: "#ffffff",
        surfaceRadius: 10,
        surfaceShadow: "0 10px 24px rgba(20,6,34,.4)",
        title: "#241238",
        text: "#c9c2d6",
        eyebrow: "#6da233",
        tile: "#eef0fb",
        tileBorder: "transparent",
        accent: "#4d1c68",
        buttonRadius: 999,
      }
    : {
        backdrop: "#efebe5",
        railIcon: "#b5ada3",
        railActive: "#613171",
        bar: "#f8f6f3",
        surface: "#faf8f5",
        surfaceRadius: 8,
        surfaceShadow: "0 1px 2px rgba(0,0,0,.06)",
        title: "#2b231c",
        text: "#d8d2ca",
        eyebrow: "#a69d93",
        tile: "#ffffff",
        tileBorder: "#e3ddd5",
        accent: "#613171",
        buttonRadius: 4,
      };

  return (
    <div
      aria-hidden
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg"
      style={{ background: p.backdrop }}
    >
      {/* Rail */}
      <div className="absolute inset-y-0 left-0 flex w-[9%] flex-col items-center gap-[6%] pt-[4%]">
        <div className="h-[5%] w-[45%] rounded-full" style={{ background: kultiva ? "#8bc34a" : "#73973a" }} />
        <div className="mt-[10%] aspect-square w-[50%] rounded" style={{ background: p.railActive }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-square w-[34%] rounded-sm" style={{ background: p.railIcon }} />
        ))}
      </div>
      {/* Top bar */}
      <div className="absolute left-[12%] right-[3%] top-[4%] flex h-[7%] items-center justify-between">
        <div className="h-[45%] w-[18%] rounded-full" style={{ background: kultiva ? "rgba(255,255,255,.7)" : "#8a8077" }} />
        <div className="h-full w-[38%] rounded-full" style={{ background: p.bar }} />
        <div className="aspect-square h-full rounded-full" style={{ background: kultiva ? "rgba(255,255,255,.25)" : "#ddd6cd" }} />
      </div>
      {/* Page surface */}
      <div
        className="absolute bottom-[4%] left-[12%] right-[3%] top-[15%] p-[4%]"
        style={{ background: p.surface, borderRadius: p.surfaceRadius, boxShadow: p.surfaceShadow }}
      >
        <div className="h-[5%] w-[16%] rounded-full" style={{ background: p.eyebrow }} />
        <div className="mt-[2%] h-[9%] w-[45%] rounded" style={{ background: p.title }} />
        <div className="mt-[6%] grid grid-cols-3 gap-[4%]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[5/3] rounded-md p-[10%]"
              style={{ background: p.tile, border: `1px solid ${p.tileBorder}` }}
            >
              <div className="h-[22%] w-[60%] rounded-sm" style={{ background: p.accent }} />
              <div className="mt-[12%] h-[14%] w-[80%] rounded-sm" style={{ background: p.text }} />
            </div>
          ))}
        </div>
        <div className="mt-[6%] h-[7%] w-full rounded" style={{ background: p.text, opacity: 0.5 }} />
        <div className="mt-[3%] h-[7%] w-[80%] rounded" style={{ background: p.text, opacity: 0.5 }} />
        <div
          className="absolute bottom-[8%] right-[5%] h-[11%] w-[22%]"
          style={{ background: p.accent, borderRadius: p.buttonRadius }}
        />
      </div>
    </div>
  );
}
