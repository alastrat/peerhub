"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ClipboardList, Smile } from "lucide-react";
import { Logo } from "@/components/design-system/logo";
import type { ReportCoverData } from "@/lib/queries/climate-report";
import { introParagraphs } from "@/lib/utils/climate-report";

function CoverCard({
  icon,
  title,
  accent,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  accent: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative rounded-2xl border bg-white px-4 pb-4 pt-8 shadow-sm print:shadow-none ${className ?? ""}`}>
      <div
        className="absolute -top-5 left-5 flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-sm print:shadow-none"
        style={{ color: accent }}
      >
        {icon}
      </div>
      <p className="mb-2 font-semibold leading-snug text-gray-900">{title}</p>
      <div className="text-sm leading-relaxed text-gray-600">{children}</div>
    </div>
  );
}

/**
 * First page of a climate report, after Kultiva's POC: title and intro on the
 * left; when the survey ran, its response scale and dimensions on the right.
 */
export function ReportCover({
  cover,
  eyebrow,
  subtitle,
  generatedOn,
}: {
  cover: ReportCoverData;
  /** Defaults to "company · survey type". */
  eyebrow?: string;
  /** Shown under the title, e.g. whose team a leader report covers. */
  subtitle?: string;
  generatedOn: string;
}) {
  const t = useTranslations("climate_report.cover");
  const { colors, schedule } = cover;
  const intro = cover.intro ?? introParagraphs(t("default_intro"));

  return (
    <div className="flex flex-1 flex-col gap-8" style={{ color: colors.text }}>
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="mb-0 text-xs font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
            {eyebrow ?? `${cover.companyName} · ${cover.typeLabel}`}
          </p>
          <div className="h-1 w-16 rounded-full" style={{ backgroundColor: colors.accent }} />
        </div>
        {/* The client's logo (white label); Kultiva's when the client has none */}
        {cover.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.logoUrl}
            alt={t("logo_alt", { company: cover.companyName })}
            className="max-h-16 max-w-[180px] object-contain"
          />
        ) : (
          <Logo className="h-14" />
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] print:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-5">
          <h1 className="mb-0 text-4xl font-extrabold leading-tight text-balance" style={{ color: colors.accent }}>
            {cover.surveyName}
          </h1>
          {subtitle && <p className="mb-0 text-lg font-semibold" style={{ color: colors.title }}>{subtitle}</p>}
          <p className="mb-0 font-bold" style={{ color: colors.title }}>
            {t("subtitle")}
          </p>
          <div className="space-y-3 text-sm leading-relaxed">
            {intro.map((p, i) => (
              <p key={i} className="mb-0 whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-10 pt-5">
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 print:grid-cols-2">
            <CoverCard icon={<CalendarDays className="h-5 w-5" />} title={t("date_title")} accent={colors.accent}>
              {schedule ? (
                <div className="space-y-1.5">
                  <p className="mb-0 font-semibold text-gray-900">{schedule.range}</p>
                  {(schedule.startTime || schedule.endTime) && (
                    <p className="mb-0">
                      {[
                        schedule.startTime && t("starts", { time: schedule.startTime }),
                        schedule.endTime && t("ends", { time: schedule.endTime }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="mb-0">{t("days", { count: schedule.days })}</p>
                  {cover.extraDuration && <p className="mb-0">+ {cover.extraDuration}</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="mb-0 italic">{t("date_missing")}</p>
                  {cover.extraDuration && <p className="mb-0">{cover.extraDuration}</p>}
                </div>
              )}
            </CoverCard>
            <CoverCard icon={<Smile className="h-5 w-5" />} title={t("scale_title")} accent={colors.accent}>
              {cover.scaleItems.length > 0 ? (
                <ul className="mb-0 list-disc space-y-0.5 pl-4">
                  {cover.scaleItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mb-0 italic">{t("scale_missing")}</p>
              )}
            </CoverCard>
          </div>
          <CoverCard icon={<ClipboardList className="h-5 w-5" />} title={t("dimensions_title")} accent={colors.accent}>
            <p className="mb-2">
              {t("dimensions_count", { dimensions: cover.dimensions.length, questions: cover.questionCount })}
            </p>
            {cover.dimensions.length > 0 && (
              <ol className="mb-0 list-decimal gap-x-8 space-y-0.5 pl-6 sm:columns-2 print:columns-2">
                {cover.dimensions.map((d) => (
                  <li key={d.id} className="break-inside-avoid">
                    {d.name}
                  </li>
                ))}
              </ol>
            )}
          </CoverCard>
        </div>
      </div>

      <footer className="mt-auto flex items-end justify-between gap-4 text-xs text-gray-500">
        <span>{t("generated", { date: generatedOn })}</span>
        {cover.logoUrl && <Logo className="h-7" />}
      </footer>
    </div>
  );
}
