"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ClimateBand } from "@/lib/utils/climate-scoring";

// Colour tokens per band (spec §3.4). Kept in one place so dashboard and
// portal read the same scale.
export const BAND_STYLES: Record<ClimateBand, { chip: string; bar: string; cell: string }> = {
  MUY_FAVORABLE: {
    chip: "border-green-200 bg-green-100 text-green-800",
    bar: "bg-green-600",
    cell: "bg-green-100 text-green-900",
  },
  FAVORABLE: {
    chip: "border-lime-200 bg-lime-100 text-lime-800",
    bar: "bg-lime-500",
    cell: "bg-lime-50 text-lime-900",
  },
  DESFAVORABLE: {
    chip: "border-amber-200 bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    cell: "bg-amber-100 text-amber-900",
  },
  MUY_DESFAVORABLE: {
    chip: "border-red-200 bg-red-100 text-red-800",
    bar: "bg-red-500",
    cell: "bg-red-100 text-red-900",
  },
};

// Plain helpers live outside this client module so server components can call them
import { formatMean, formatPct } from "@/lib/utils/climate-scoring";
export { formatMean, formatPct };

export function BandBadge({ band, className }: { band: ClimateBand | null; className?: string }) {
  const t = useTranslations("climate_scoring.bands");
  if (!band) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        BAND_STYLES[band].chip,
        className,
      )}
    >
      {t(band)}
    </span>
  );
}

/** Horizontal score bar: width = position within the scale, colour = band. */
export function ScoreBar({
  label,
  mean,
  scaleMax,
  percent,
  band,
  favorability,
  hint,
}: {
  label: string;
  mean: number | null;
  scaleMax: number;
  percent: number | null;
  band: ClimateBand | null;
  favorability?: number | null;
  hint?: string;
}) {
  const t = useTranslations("climate_scoring");
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {favorability != null && <span>{t("favorable_pct", { pct: Math.round(favorability * 100) })}</span>}
          <span className="tabular-nums">
            {formatMean(mean)} / {scaleMax}
          </span>
          <BandBadge band={band} />
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className={cn("h-3 rounded-full", band ? BAND_STYLES[band].bar : "bg-primary/70")}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SuppressedNote({ min, count }: { min: number; count?: number }) {
  const t = useTranslations("climate_scoring");
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {count != null ? t("suppressed_group", { count, min }) : t("suppressed_cell", { min })}
      </span>
    </div>
  );
}
