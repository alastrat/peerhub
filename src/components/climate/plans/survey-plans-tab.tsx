"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  evaluateSurveyImpact,
  releaseSurveyResults,
  retractSurveyResults,
} from "@/lib/actions/action-plans";
import type { SurveyPlansOverview } from "@/lib/queries/action-plans";
import { BUSINESS_TIME_ZONE } from "@/lib/constants/business-time";
import { BandBadge, formatMean } from "../climate-score-ui";
import { CreatePlanDialog, type PlanDimensionOption } from "./create-plan-dialog";
import { ImpactBadge, NativeSelect, PlanStatusBadge, ProgressBar, formatDay } from "./plan-ui";

interface SurveyPlansTabProps {
  overview: SurveyPlansOverview;
  dimensions: PlanDimensionOption[];
  groups: {
    DEPARTMENT: { id: string; name: string }[];
    HUB: { id: string; name: string }[];
    TEAM: { id: string; name: string }[];
    LEADER: { id: string; name: string }[];
  };
  employees: { id: string; name: string }[];
}

export function SurveyPlansTab({ overview, dimensions, groups, employees }: SurveyPlansTabProps) {
  const t = useTranslations("climate_plans");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("");
  const [dimensionFilter, setDimensionFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { survey, leaders, plans, impactSummary } = overview;

  if (!survey.isInstrument) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("needs_instrument")}</CardContent>
      </Card>
    );
  }

  const released = !!survey.resultsReleasedAt;
  const missing = leaders.filter((l) => !l.meetsMinimum);
  const filtered = plans.filter(
    (p) =>
      (!statusFilter || p.status === statusFilter) &&
      (!dimensionFilter || p.dimensionId === dimensionFilter) &&
      (!overdueOnly || p.overdueTasks > 0),
  );

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: (r: never) => string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? t("error_generic"));
        return;
      }
      toast.success(ok(res as never));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Release ------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("release_title")}</CardTitle>
          <CardDescription>
            {released
              ? t("released_on", {
                  date: formatDay(survey.resultsReleasedAt, locale, BUSINESS_TIME_ZONE),
                  due: formatDay(survey.planDueDate, locale),
                })
              : t("release_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!released ? (
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => releaseSurveyResults(survey.id),
                  (r: { data: { leaders: number; leadersWithGaps: number } }) =>
                    t("released_toast", { leaders: r.data.leaders, gaps: r.data.leadersWithGaps }),
                )
              }
            >
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
              {t("release")}
            </Button>
          ) : (
            <Button variant="outline" disabled={pending} onClick={() => run(() => retractSurveyResults(survey.id), () => t("retracted"))}>
              <EyeOff className="mr-1.5 h-4 w-4" />
              {t("retract")}
            </Button>
          )}
          {survey.status === "CLOSED" && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => evaluateSurveyImpact(survey.id),
                  (r: { data: { evaluated: number } }) => t("evaluated_toast", { count: r.data.evaluated }),
                )
              }
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t("evaluate_impact")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Leaders ------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leaders_title")}</CardTitle>
          <CardDescription>
            {t("leaders_desc", { min: survey.planMinPerLeader, missing: missing.length, k: survey.anonymityThreshold })}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_leaders")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-2 font-medium">{t("col_leader")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_respondents")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_gaps")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_plans")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.leaderEmployeeId} className="border-t align-top">
                    <td className="px-2 py-2 font-medium">{l.name}</td>
                    <td className="px-2 py-2 tabular-nums">{l.respondents}</td>
                    <td className="px-2 py-2">
                      {l.suppressed ? (
                        <span className="text-xs text-muted-foreground">{t("too_few", { k: survey.anonymityThreshold })}</span>
                      ) : l.gapNames.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t("no_gaps")}</span>
                      ) : (
                        <span className="text-xs">{l.gapNames.join(", ")}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {l.submitted}/{l.required}
                      {l.drafts > 0 && <span className="ml-1 text-xs text-muted-foreground">({t("drafts", { count: l.drafts })})</span>}
                    </td>
                    <td className="px-2 py-2">
                      {l.required === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : l.meetsMinimum ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t("complete_status")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {t("missing_status")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Impact -------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("impact_title")}</CardTitle>
          <CardDescription>{t("impact_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(["IMPROVED", "UNCHANGED", "WORSENED", "NOT_EVALUABLE", "PENDING"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <ImpactBadge impact={k === "PENDING" ? null : k} />
              <span className="font-semibold tabular-nums">{impactSummary[k]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plans --------------------------------------------------------------- */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t("plans_title")}</CardTitle>
            <CardDescription>{t("plans_desc")}</CardDescription>
          </div>
          {released && dimensions.length > 0 && (
            <CreatePlanDialog
              surveyId={survey.id}
              dimensions={dimensions}
              groups={groups}
              employees={employees}
              planHref={(id) => `/surveys/climate/${survey.id}/plans/${id}`}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <p className="text-sm text-muted-foreground">{released ? t("no_plans") : t("no_plans_unreleased")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">{t("col_plan")}</th>
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
                        <Link href={`/surveys/climate/${survey.id}/plans/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.dimensionName}</p>
                      </td>
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
        </CardContent>
      </Card>
    </div>
  );
}
