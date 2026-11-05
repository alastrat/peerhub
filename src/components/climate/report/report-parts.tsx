"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { CLIMATE_SCALES, getScaleAnchor, getScaleValues, type ScaleKey } from "@/lib/constants/climate-scales";
import { CLIMATE_BANDS, type ClimateBand, type IndexScore } from "@/lib/utils/climate-scoring";
import { BAND_STYLES, BandBadge, formatMean, formatPct } from "../climate-score-ui";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Root of a report page: a grey desk with A4 sheets on screen, plain pages in print. */
export function ReportShell({
  accent,
  backHref,
  children,
}: {
  accent: string;
  backHref?: string;
  children: ReactNode;
}) {
  const t = useTranslations("climate_report.toolbar");
  return (
    <div
      data-climate-report
      // Resets bizzen's body line-height (30px) and light weight for the whole report
      className="min-h-screen bg-muted/60 text-base font-normal print:bg-white"
      style={{ "--report-accent": accent } as CSSProperties}
    >
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          {backHref ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={backHref}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {t("back")}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{t("hint")}</span>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              {t("print")}
            </Button>
          </div>
        </div>
      </div>
      {/* "block": bizzen makes <main> inline-block, which mx-auto can't center */}
      <main className="mx-auto block max-w-[210mm] space-y-6 px-4 py-8 print:max-w-none print:space-y-0 print:p-0">
        {children}
      </main>
    </div>
  );
}

/** One sheet. The cover fills its own printed page; the results flow on. */
export function ReportSheet({ cover, children }: { cover?: boolean; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-xl bg-white p-10 shadow-sm print:rounded-none print:p-0 print:shadow-none",
        cover && "flex min-h-[267mm] flex-col break-after-page print:min-h-[265mm]",
      )}
    >
      {children}
    </section>
  );
}

export function ReportSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div
        className="break-inside-avoid break-after-avoid space-y-1 border-l-4 pl-3"
        style={{ borderColor: "var(--report-accent)" }}
      >
        <h2 className="mb-0 text-lg font-bold text-gray-900">{title}</h2>
        {description && <p className="mb-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Report heading after the cover: eyebrow and survey name, like the POC's results header. */
export function ReportHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 space-y-1">
      <p className="mb-0 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--report-accent)" }}>
        {eyebrow}
      </p>
      <h2 className="mb-0 text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mb-0 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function StatTiles({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4 print:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-muted/30 px-4 py-3">
          <div className="text-2xl font-bold tabular-nums text-gray-900">{item.value}</div>
          <p className="mb-0 text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

/** Mean ranges of each band on the 1–4 instrument scale (bandForMean, rounded to one decimal). */
const BAND_RANGES: Record<ClimateBand, string> = {
  MUY_FAVORABLE: "3.6 – 4.0",
  FAVORABLE: "3.1 – 3.5",
  DESFAVORABLE: "2.6 – 3.0",
  MUY_DESFAVORABLE: "1.0 – 2.5",
};

export function BandLegend() {
  const t = useTranslations("climate_report.sections");
  const tb = useTranslations("climate_scoring.bands");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span>{t("band_legend")}</span>
      {[...CLIMATE_BANDS].reverse().map((band) => (
        <span key={band} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", BAND_STYLES[band].bar)} />
          {tb(band)} ({BAND_RANGES[band]})
        </span>
      ))}
    </div>
  );
}

/** Índice de Clima (instrument) or overall mean, with its band and the survey's goal. */
export function IndexSummary({
  index,
  isInstrument,
  goalBand,
}: {
  index: IndexScore | null;
  isInstrument: boolean;
  goalBand: ClimateBand;
}) {
  const ts = useTranslations("climate_scoring");
  const scale = index ? CLIMATE_SCALES[index.scaleKey] : null;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-5 py-4 break-inside-avoid">
      <div>
        <p className="mb-0 text-sm font-semibold text-gray-900">
          {isInstrument ? ts("index_title") : ts("overall_title")}
        </p>
        <p className="mb-0 text-xs text-muted-foreground">
          {isInstrument
            ? ts("index_desc")
            : scale
              ? ts("overall_desc", { min: scale.min, max: scale.max })
              : ts("overall_mixed")}
        </p>
      </div>
      {index && scale && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-gray-900">{formatMean(index.mean)}</span>
            <span className="text-sm text-muted-foreground">{ts("out_of", { max: scale.max })}</span>
          </div>
          <BandBadge band={index.band} className="text-sm" />
          {index.favorability != null && (
            <span className="text-sm text-muted-foreground">
              {ts("favorable_pct", { pct: Math.round(index.favorability * 100) })}
            </span>
          )}
          {isInstrument && (
            <span className="text-sm text-muted-foreground">{ts("goal", { band: ts(`bands.${goalBand}`) })}</span>
          )}
        </>
      )}
    </div>
  );
}

export interface ReportQuestion {
  questionId: string;
  text: string;
  itemCode: string | null;
  dimensionId: string | null;
  scaleKey: ScaleKey | null;
  mean: number | null;
  favorability: number | null;
  distribution: Record<number, number>;
}

function QuestionRow({ q, number }: { q: ReportQuestion; number: number }) {
  const t = useTranslations("climate_report.sections");
  const ts = useTranslations("climate_scoring");
  const locale = useLocale();
  const scale = q.scaleKey ? CLIMATE_SCALES[q.scaleKey] : null;
  const answered = Object.values(q.distribution).reduce((s, c) => s + c, 0);
  return (
    <div className="space-y-2 rounded-lg border px-4 py-3 break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="text-sm font-medium text-muted-foreground">{number}.</span>
          <div className="space-y-1">
            <p className="mb-0 text-sm font-medium text-gray-900">{q.text}</p>
            <div className="flex flex-wrap gap-1.5">
              {q.itemCode && (
                <Badge variant="outline" className="text-[10px]">
                  {ts("validated_item")} · {q.itemCode}
                </Badge>
              )}
              {answered > 0 && <span className="text-xs text-muted-foreground">{t("responses", { count: answered })}</span>}
            </div>
          </div>
        </div>
        {q.mean != null && (
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold tabular-nums text-gray-900">{formatMean(q.mean)}</span>
            {q.favorability != null && (
              <p className="mb-0 text-xs text-muted-foreground">
                {ts("favorable_pct", { pct: Math.round(q.favorability * 100) })}
              </p>
            )}
          </div>
        )}
      </div>
      {scale && scale.kind !== "nps" && answered > 0 && (
        <div className="ml-7 grid gap-1">
          {getScaleValues(scale).map((v) => {
            const count = q.distribution[v] ?? 0;
            const pct = count / answered;
            return (
              <div key={v} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 truncate text-muted-foreground">{getScaleAnchor(scale, v, locale) ?? v}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct * 100}%`, backgroundColor: "var(--report-accent)", opacity: 0.7 }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                  {count} ({formatPct(pct)})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Scored questions grouped under their dimension, in survey order. */
export function QuestionResults({
  questions,
  dimensions,
}: {
  questions: ReportQuestion[];
  dimensions: { id: string; name: string }[];
}) {
  const t = useTranslations("climate_report.sections");
  const groups = [
    ...dimensions.map((d) => ({ key: d.id, name: d.name, items: questions.filter((q) => q.dimensionId === d.id) })),
    {
      key: "none",
      name: t("other_questions"),
      items: questions.filter((q) => !q.dimensionId || !dimensions.some((d) => d.id === q.dimensionId)),
    },
  ].filter((g) => g.items.length > 0);
  const numbers = new Map(groups.flatMap((g) => g.items).map((q, i) => [q.questionId, i + 1]));

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <h3 className="mb-0 break-after-avoid text-sm font-bold uppercase tracking-wide text-gray-700">{g.name}</h3>
          {g.items.map((q) => (
            <QuestionRow key={q.questionId} q={q} number={numbers.get(q.questionId)!} />
          ))}
        </div>
      ))}
    </div>
  );
}
