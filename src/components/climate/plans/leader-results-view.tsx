"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveLeaderContext } from "@/lib/actions/action-plans";
import type { LeaderTeamView } from "@/lib/queries/action-plans";
import { BUSINESS_TIME_ZONE } from "@/lib/constants/business-time";
import { CLIMATE_SCALES, getScaleAnchor, getScaleValues } from "@/lib/constants/climate-scales";
import { BandBadge, ScoreBar, SuppressedNote, formatMean, formatPct } from "../climate-score-ui";
import { CreatePlanDialog } from "./create-plan-dialog";
import { PlanStatusBadge, ProgressBar, formatDay } from "./plan-ui";

const CONTEXT_KEYS = ["q1", "q2", "q3", "q4"] as const;

export function LeaderResultsView({ view, leaderEmployeeId }: { view: LeaderTeamView; leaderEmployeeId: string }) {
  const t = useTranslations("climate_plans.leader");
  const tp = useTranslations("climate_plans");
  const ts = useTranslations("climate_scoring");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [context, setContext] = useState<Record<string, string>>(view.context ?? {});
  const { survey, gaps } = view;
  const required = gaps.required;
  const planDimensions = gaps.dimensions
    .filter((d) => d.isInstrument && d.band != null)
    .map((d) => ({ dimensionId: d.dimensionId, dimensionName: d.dimensionName, mean: d.mean, band: d.band }));

  return (
    <div className="space-y-6">
      <Link href="/portal/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {tp("back")}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t("title", { survey: survey.name })}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { count: gaps.respondents, date: formatDay(survey.releasedAt, locale, BUSINESS_TIME_ZONE) })}
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{t("confidential")}</div>

      {gaps.suppressed ? (
        <SuppressedNote min={survey.anonymityThreshold} count={gaps.respondents} />
      ) : (
        <>
          {required > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Flag className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("minimum", { required, done: view.submittedOnGaps })}
                {survey.planDueDate && ` ${t("deadline", { date: formatDay(survey.planDueDate, locale) })}`}
              </span>
            </div>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{ts("index_title")}</CardTitle>
              <CardDescription>{t("index_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {gaps.index && (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-4xl font-bold tabular-nums">{formatMean(gaps.index.mean)}</span>
                  <span className="text-sm text-muted-foreground">{ts("out_of", { max: 4 })}</span>
                  <BandBadge band={gaps.index.band} className="text-sm" />
                  {gaps.index.favorability != null && (
                    <span className="text-sm text-muted-foreground">
                      {ts("favorable_pct", { pct: Math.round(gaps.index.favorability * 100) })}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">{ts("goal", { band: ts(`bands.${survey.goalBand}`) })}</span>
                </div>
              )}
              <div className="space-y-4">
                {gaps.dimensions
                  .filter((d) => d.isInstrument)
                  .map((d) => (
                    <ScoreBar
                      key={d.dimensionId}
                      label={d.dimensionName}
                      mean={d.mean}
                      scaleMax={4}
                      percent={d.percent}
                      band={d.band}
                      favorability={d.favorability}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("gaps_title")}
              </CardTitle>
              <CardDescription>{t("gaps_desc", { band: ts(`bands.${survey.goalBand}`) })}</CardDescription>
            </CardHeader>
            <CardContent>
              {gaps.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_gaps")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gaps.gaps.map((g) => {
                    const count = view.plans.filter((p) => p.dimensionId === g.dimensionId).length;
                    return (
                      <div key={g.dimensionId} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{g.dimensionName}</p>
                          <BandBadge band={g.band} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatMean(g.mean)} · {ts("favorable_pct", { pct: Math.round((g.favorability ?? 0) * 100) })}
                        </p>
                        {count > 0 && <p className="text-xs text-muted-foreground">{t("plans_for_dim", { count })}</p>}
                        <CreatePlanDialog
                          surveyId={survey.id}
                          dimensions={planDimensions}
                          defaultDimensionId={g.dimensionId}
                          fixedScope={{ scope: "LEADER", scopeRefId: leaderEmployeeId }}
                          planHref={(id) => `/portal/climate-plans/${id}`}
                          trigger={
                            <Button size="sm" variant="outline" className="w-full">
                              <Plus className="mr-1.5 h-4 w-4" />
                              {count > 0 ? t("add_another") : t("create_plan")}
                            </Button>
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plans */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{t("plans_title")}</CardTitle>
                <CardDescription>{t("plans_desc")}</CardDescription>
              </div>
              {planDimensions.length > 0 && (
                <CreatePlanDialog
                  surveyId={survey.id}
                  dimensions={planDimensions}
                  defaultDimensionId={gaps.gaps[0]?.dimensionId}
                  fixedScope={{ scope: "LEADER", scopeRefId: leaderEmployeeId }}
                  planHref={(id) => `/portal/climate-plans/${id}`}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {view.plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_plans")}</p>
              ) : (
                view.plans.map((p) => (
                  <Link
                    key={p.id}
                    href={`/portal/climate-plans/${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.dimensionName} · {tp("until", { date: formatDay(p.endDate, locale) })}
                      </p>
                    </div>
                    <div className="flex w-56 items-center gap-2">
                      <ProgressBar pct={p.progress.pct} />
                      <PlanStatusBadge status={p.status} />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Team context */}
          <Card>
            <CardHeader>
              <CardTitle>{t("context_title")}</CardTitle>
              <CardDescription>{t("context_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CONTEXT_KEYS.map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`ctx-${k}`}>{t(`context.${k}`)}</Label>
                  <Textarea
                    id={`ctx-${k}`}
                    rows={2}
                    value={context[k] ?? ""}
                    onChange={(e) => setContext({ ...context, [k]: e.target.value })}
                  />
                </div>
              ))}
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await saveLeaderContext(survey.id, context);
                    if (!res.success) toast.error(res.error ?? tp("error_generic"));
                    else {
                      toast.success(tp("saved"));
                      router.refresh();
                    }
                  })
                }
              >
                {tp("save")}
              </Button>
            </CardContent>
          </Card>

          {/* Item detail */}
          <Card>
            <CardHeader>
              <CardTitle>{t("items_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {gaps.dimensions
                .filter((d) => d.isInstrument)
                .map((d) => (
                  <div key={d.dimensionId} className="space-y-2">
                    <p className="text-sm font-semibold">{d.dimensionName}</p>
                    {view.items
                      .filter((i) => i.dimensionId === d.dimensionId && i.itemCode)
                      .map((i) => {
                        const scale = CLIMATE_SCALES[i.scaleKey ?? "FREQ_4"];
                        const answered = Object.values(i.distribution).reduce((s, c) => s + c, 0);
                        return (
                          <div key={i.questionId} className="space-y-1 rounded-md bg-muted/40 p-2">
                            <div className="flex items-start justify-between gap-3 text-sm">
                              <span>{i.text}</span>
                              <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                                {formatMean(i.mean)} · {formatPct(i.favorability)}
                              </span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                              {getScaleValues(scale).map((v) => {
                                const share = answered ? (i.distribution[v] ?? 0) / answered : 0;
                                const color = ["bg-red-400", "bg-amber-400", "bg-lime-400", "bg-green-500"][v - 1] ?? "bg-primary";
                                return (
                                  <div
                                    key={v}
                                    className={color}
                                    style={{ width: `${share * 100}%` }}
                                    title={`${getScaleAnchor(scale, v, locale)}: ${Math.round(share * 100)}%`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
