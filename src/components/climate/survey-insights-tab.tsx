"use client";

import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SurveyResults } from "@/lib/queries/climate-reports";
import { CLIMATE_SCALES, getScaleAnchor, getScaleValues } from "@/lib/constants/climate-scales";
import {
  BandBadge,
  ScoreBar,
  SuppressedNote,
  formatMean,
  formatPct,
} from "./climate-score-ui";
import { ClimateHeatmap } from "./climate-heatmap";

interface SurveyInsightsTabProps {
  results: SurveyResults;
  totalInvited: number;
  totalCompleted: number;
  totalPending: number;
  featureHubs?: boolean;
}

/* ---------- Small helper components ---------- */

function RateCircle({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold">{value}%</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {count} ({Math.round(percent)}%)
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export function SurveyInsightsTab({
  results,
  totalInvited,
  totalCompleted,
  totalPending,
  featureHubs = false,
}: SurveyInsightsTabProps) {
  const t = useTranslations("dashboard.climate.detail.insights_tab");
  const ts = useTranslations("climate_scoring");
  const td = useTranslations("demographics");
  const locale = useLocale();
  const demographicLabel = (type: "gender" | "generation" | "tenure") => (s: { segmentName: string }) =>
    td(`${type}.${s.segmentName}`);
  const hasNPS = results.questionResults.some((q) => q.type === "NPS");
  const k = results.anonymityThreshold;

  // NPS breakdown
  const npsBreakdown = (() => {
    if (!hasNPS) return null;
    const npsResults = results.questionResults.filter((q) => q.type === "NPS");
    const allRatings = npsResults.flatMap((q) =>
      Object.entries(q.distribution).flatMap(([rating, count]) =>
        Array(count).fill(Number(rating))
      )
    );
    const total = allRatings.length;
    if (total === 0) return null;
    const promoters = allRatings.filter((r: number) => r >= 9).length;
    const passives = allRatings.filter(
      (r: number) => r >= 7 && r <= 8
    ).length;
    const detractors = allRatings.filter((r: number) => r <= 6).length;
    return { promoters, passives, detractors, total };
  })();

  const index = results.index;
  const indexScale = index ? CLIMATE_SCALES[index.scaleKey] : null;
  const dimensionColumns = results.dimensionScores.map((d) => ({ id: d.dimensionId, name: d.dimensionName }));
  const sortedDimensions = [...results.dimensionScores].sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));

  return (
    <div className="space-y-6">
      {/* Top row: Breakdown + Rate Circles */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {t("response_breakdown", { total: totalInvited })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBar
              label={t("completed")}
              count={totalCompleted}
              total={totalInvited}
              color="#22c55e"
            />
            <StatusBar
              label={t("pending")}
              count={totalPending}
              total={totalInvited}
              color="#eab308"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-6 pt-6">
            <div className="relative">
              <RateCircle
                label={t("completion_rate")}
                value={results.completionRate}
                color="#22c55e"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {results.suppressed ? (
        <Card>
          <CardHeader>
            <CardTitle>{ts("suppressed_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SuppressedNote min={k} count={results.totalResponded} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Índice de Clima / overall mean */}
          <Card>
            <CardHeader>
              <CardTitle>{results.isInstrument ? ts("index_title") : ts("overall_title")}</CardTitle>
              <CardDescription>
                {results.isInstrument
                  ? ts("index_desc")
                  : indexScale
                    ? ts("overall_desc", { min: indexScale.min, max: indexScale.max })
                    : ts("overall_mixed")}
              </CardDescription>
            </CardHeader>
            {index && indexScale && (
              <CardContent className="flex flex-wrap items-center gap-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums">{formatMean(index.mean)}</span>
                  <span className="text-sm text-muted-foreground">{ts("out_of", { max: indexScale.max })}</span>
                </div>
                <BandBadge band={index.band} className="text-sm" />
                {index.favorability != null && (
                  <span className="text-sm text-muted-foreground">
                    {ts("favorable_pct", { pct: Math.round(index.favorability * 100) })}
                  </span>
                )}
                {results.isInstrument && (
                  <span className="text-sm text-muted-foreground">
                    {ts("goal", { band: ts(`bands.${results.goalBand}`) })}
                  </span>
                )}
              </CardContent>
            )}
          </Card>

          {/* NPS Breakdown */}
          {npsBreakdown && results.npsScore != null && (
            <Card>
              <CardHeader>
                <CardTitle>{t("enps_score", { score: results.npsScore })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex h-6 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-red-400"
                      style={{ width: `${(npsBreakdown.detractors / npsBreakdown.total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-400"
                      style={{ width: `${(npsBreakdown.passives / npsBreakdown.total) * 100}%` }}
                    />
                    <div
                      className="bg-green-400"
                      style={{ width: `${(npsBreakdown.promoters / npsBreakdown.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">
                      {t("detractors", { pct: Math.round((npsBreakdown.detractors / npsBreakdown.total) * 100) })}
                    </span>
                    <span className="text-yellow-600">
                      {t("passives", { pct: Math.round((npsBreakdown.passives / npsBreakdown.total) * 100) })}
                    </span>
                    <span className="text-green-600">
                      {t("promoters", { pct: Math.round((npsBreakdown.promoters / npsBreakdown.total) * 100) })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dimension Scores */}
          {sortedDimensions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("scores_by_dimension")}</CardTitle>
                <CardDescription>
                  {results.isInstrument ? ts("dimensions_desc_instrument") : t("scores_by_dimension_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedDimensions.map((dim) => (
                  <ScoreBar
                    key={dim.dimensionId}
                    label={dim.dimensionName}
                    mean={dim.mean}
                    scaleMax={CLIMATE_SCALES[dim.scaleKey].max}
                    percent={dim.percent}
                    band={dim.band}
                    favorability={dim.favorability}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Puntos de atención */}
          {results.isInstrument && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {ts("attention_title")}
                </CardTitle>
                <CardDescription>
                  {ts("attention_desc", { band: ts(`bands.${results.goalBand}`) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.gaps.length === 0 && results.attentionSegments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ts("attention_none")}</p>
                ) : (
                  <>
                    {results.gaps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{ts("attention_dimensions")}</p>
                        <div className="flex flex-wrap gap-2">
                          {results.gaps.map((g) => (
                            <div key={g.dimensionId} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                              <span className="font-medium">{g.dimensionName}</span>
                              <span className="tabular-nums text-muted-foreground">{formatMean(g.mean)}</span>
                              <BandBadge band={g.band} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {results.attentionSegments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{ts("attention_groups")}</p>
                        <div className="flex flex-wrap gap-2">
                          {results.attentionSegments.map((s) => (
                            <div
                              key={`${s.type}-${s.segmentId}`}
                              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                            >
                              <Badge variant="outline" className="text-xs">
                                {ts(`segment_types.${s.type}`)}
                              </Badge>
                              <span className="font-medium">
                                {s.type === "gender" || s.type === "generation" || s.type === "tenure"
                                  ? td(`${s.type}.${s.segmentName}`)
                                  : s.segmentName}
                              </span>
                              <span className="tabular-nums text-muted-foreground">{formatMean(s.mean)}</span>
                              <BandBadge band={s.band} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Heatmaps */}
          <ClimateHeatmap
            title={ts("heatmap_department")}
            segments={results.departmentBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
          />
          <ClimateHeatmap
            title={ts("heatmap_team")}
            segments={results.teamBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
          />
          {featureHubs && (
            <ClimateHeatmap
              title={ts("heatmap_hub")}
              segments={results.hubBreakdown}
              dimensions={dimensionColumns}
              minGroupSize={k}
            />
          )}
          <ClimateHeatmap
            title={ts("heatmap_leader")}
            segments={results.leaderBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
          />
          <ClimateHeatmap
            title={ts("heatmap_gender")}
            segments={results.genderBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
            segmentLabel={demographicLabel("gender")}
          />
          <ClimateHeatmap
            title={ts("heatmap_generation")}
            segments={results.generationBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
            segmentLabel={demographicLabel("generation")}
          />
          <ClimateHeatmap
            title={ts("heatmap_tenure")}
            segments={results.tenureBreakdown}
            dimensions={dimensionColumns}
            minGroupSize={k}
            segmentLabel={demographicLabel("tenure")}
          />

          {/* Question-level Results */}
          <Card>
            <CardHeader>
              <CardTitle>{t("question_results")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.questionResults.map((q, i) => {
                const scale = q.scaleKey ? CLIMATE_SCALES[q.scaleKey] : null;
                const answered = Object.values(q.distribution).reduce((s, c) => s + c, 0);
                return (
                  <div key={q.questionId} className="space-y-2 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                        <div>
                          <p className="font-medium">{q.text}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {q.type}
                              {scale && scale.kind !== "nps" && ` ${scale.min}–${scale.max}`}
                            </Badge>
                            {q.dimensionName && (
                              <Badge variant="secondary" className="text-xs">
                                {q.dimensionName}
                              </Badge>
                            )}
                            {q.itemCode && (
                              <Badge variant="outline" className="text-xs">
                                {ts("validated_item")} · {q.itemCode}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {q.average != null && (
                        <div className="text-right">
                          <span className="text-lg font-bold tabular-nums">{formatMean(q.average)}</span>
                          {q.favorability != null && (
                            <p className="text-xs text-muted-foreground">
                              {ts("favorable_pct", { pct: Math.round(q.favorability * 100) })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {scale && scale.kind !== "nps" && answered > 0 && (
                      <div className="ml-9 grid gap-1">
                        {getScaleValues(scale).map((v) => {
                          const count = q.distribution[v] ?? 0;
                          const pct = answered > 0 ? count / answered : 0;
                          return (
                            <div key={v} className="flex items-center gap-2 text-xs">
                              <span className="w-28 shrink-0 truncate text-muted-foreground">
                                {getScaleAnchor(scale, v, locale) ?? v}
                              </span>
                              <div className="h-2 flex-1 rounded-full bg-muted">
                                <div className="h-2 rounded-full bg-primary/60" style={{ width: `${pct * 100}%` }} />
                              </div>
                              <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                                {count} ({formatPct(pct)})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.count > 0 && (
                      <div className="ml-9">
                        <p className="text-xs text-muted-foreground">
                          {t("responses_count", { count: q.count })}
                        </p>
                      </div>
                    )}
                    {q.textResponses.length > 0 && (
                      <div className="ml-9 space-y-1">
                        {q.textResponses.slice(0, 5).map((text, j) => (
                          <p key={j} className="border-l-2 pl-3 text-sm text-muted-foreground">
                            {text}
                          </p>
                        ))}
                        {q.textResponses.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            {t("more_responses", { count: q.textResponses.length - 5 })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
