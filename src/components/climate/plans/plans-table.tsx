"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PlanRow } from "@/lib/queries/action-plans";
import { BandBadge, formatMean } from "../climate-score-ui";
import { ImpactBadge, NativeSelect, PlanStatusBadge, ProgressBar } from "./plan-ui";

interface PlansTableProps {
  plans: PlanRow[];
  dimensions: { dimensionId: string; dimensionName: string }[];
  /** Adds a survey filter and column, for lists that span surveys. */
  surveys?: { id: string; name: string }[];
  emptyText: string;
  /** "action-plans" opens plans under /action-plans; the default opens them in their survey. */
  planLinks?: "survey" | "action-plans";
}

/** Filterable list of action plans; each title links to the plan. */
export function PlansTable({ plans, dimensions, surveys, emptyText, planLinks = "survey" }: PlansTableProps) {
  const t = useTranslations("climate_plans");
  const [surveyFilter, setSurveyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dimensionFilter, setDimensionFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filtered = plans.filter(
    (p) =>
      (!surveyFilter || p.surveyId === surveyFilter) &&
      (!statusFilter || p.status === statusFilter) &&
      (!dimensionFilter || p.dimensionId === dimensionFilter) &&
      (!overdueOnly || p.overdueTasks > 0),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {surveys && (
          <NativeSelect className="h-8 w-60" value={surveyFilter} onChange={(e) => setSurveyFilter(e.target.value)} aria-label={t("col_survey")}>
            <option value="">{t("all_surveys")}</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect className="h-8 w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t("col_status")}>
          <option value="">{t("all_statuses")}</option>
          {(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`plan_status.${s}`)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect className="h-8 w-56" value={dimensionFilter} onChange={(e) => setDimensionFilter(e.target.value)} aria-label={t("field_dimension")}>
          <option value="">{t("all_dimensions")}</option>
          {dimensions.map((d) => (
            <option key={d.dimensionId} value={d.dimensionId}>
              {d.dimensionName}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          {t("overdue_only")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{plans.length === 0 ? emptyText : t("no_plans")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">{t("col_plan")}</th>
                {surveys && <th className="px-2 py-2 font-medium">{t("col_survey")}</th>}
                <th className="px-2 py-2 font-medium">{t("field_scope")}</th>
                <th className="px-2 py-2 font-medium">{t("owner")}</th>
                <th className="px-2 py-2 font-medium">{t("col_level")}</th>
                <th className="px-2 py-2 font-medium">{t("col_progress")}</th>
                <th className="px-2 py-2 font-medium">{t("col_status")}</th>
                <th className="px-2 py-2 font-medium">{t("result")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-2 py-2">
                    <Link
                      href={planLinks === "action-plans" ? `/action-plans/${p.id}` : `/surveys/climate/${p.surveyId}/plans/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.dimensionName}</p>
                  </td>
                  {surveys && (
                    <td className="px-2 py-2 text-xs">
                      <Link href={`/surveys/climate/${p.surveyId}?tab=plans`} className="hover:underline">
                        {p.surveyName}
                      </Link>
                    </td>
                  )}
                  <td className="px-2 py-2 text-xs">
                    {t(`scope.${p.scope}`)}
                    {p.scopeName ? `: ${p.scopeName}` : ""}
                  </td>
                  <td className="px-2 py-2 text-xs">{p.ownerName}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="tabular-nums">{formatMean(p.baselineMean)}</span>
                      <BandBadge band={p.baselineBand} />→<BandBadge band={p.targetBand} />
                    </div>
                  </td>
                  <td className="min-w-28 px-2 py-2">
                    <div className="space-y-1">
                      <ProgressBar pct={p.progress.pct} />
                      <p className="text-xs text-muted-foreground">
                        {p.progress.done}/{p.progress.total}
                        {p.overdueTasks > 0 && <span className="ml-1 text-red-600">· {t("overdue_count", { count: p.overdueTasks })}</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <PlanStatusBadge status={p.status} />
                  </td>
                  <td className="px-2 py-2">
                    <ImpactBadge impact={p.impact} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
