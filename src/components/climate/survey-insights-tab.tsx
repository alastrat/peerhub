"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SurveyResults } from "@/lib/queries/climate-reports";

interface SurveyInsightsTabProps {
  results: SurveyResults;
  totalInvited: number;
  totalCompleted: number;
  totalPending: number;
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

function DimensionBar({
  name,
  average,
  maxScore,
}: {
  name: string;
  average: number;
  maxScore: number;
}) {
  const percent = (average / maxScore) * 100;
  const color =
    percent >= 80
      ? "bg-green-500"
      : percent >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">
          {average.toFixed(2)} / {maxScore}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
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
}: SurveyInsightsTabProps) {
  const t = useTranslations("dashboard.climate.detail.insights_tab");
  const hasNPS = results.questionResults.some((q) => q.type === "NPS");
  const maxScore = hasNPS ? 10 : 5;

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

  // Score distribution histogram (buckets of 10%)
  const scoreDistribution = (() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}-${(i + 1) * 10}%`,
      count: 0,
    }));
    for (const q of results.questionResults) {
      if (q.average == null) continue;
      const pct = (q.average / maxScore) * 100;
      const idx = Math.min(Math.floor(pct / 10), 9);
      buckets[idx].count++;
    }
    return buckets;
  })();

  const maxBucketCount = Math.max(...scoreDistribution.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* Top row: Breakdown + Rate Circles */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Response breakdown */}
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

        {/* Rate circles */}
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
                  style={{
                    width: `${(npsBreakdown.detractors / npsBreakdown.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-yellow-400"
                  style={{
                    width: `${(npsBreakdown.passives / npsBreakdown.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-green-400"
                  style={{
                    width: `${(npsBreakdown.promoters / npsBreakdown.total) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">
                  {t("detractors", {
                    pct: Math.round(
                      (npsBreakdown.detractors / npsBreakdown.total) * 100,
                    ),
                  })}
                </span>
                <span className="text-yellow-600">
                  {t("passives", {
                    pct: Math.round(
                      (npsBreakdown.passives / npsBreakdown.total) * 100,
                    ),
                  })}
                </span>
                <span className="text-green-600">
                  {t("promoters", {
                    pct: Math.round(
                      (npsBreakdown.promoters / npsBreakdown.total) * 100,
                    ),
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average rating & Score distribution */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("average_rating")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <span className="text-3xl font-bold">
                {results.overallAverage != null
                  ? results.overallAverage.toFixed(1)
                  : "—"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("out_of", { max: maxScore })}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {t("average_score", {
                pct:
                  results.overallAverage != null
                    ? Math.round((results.overallAverage / maxScore) * 100)
                    : 0,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {scoreDistribution.map((bucket) => (
                <div
                  key={bucket.label}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {bucket.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/70 transition-all"
                    style={{
                      height: `${(bucket.count / maxBucketCount) * 100}%`,
                      minHeight: bucket.count > 0 ? "4px" : "2px",
                      backgroundColor:
                        bucket.count > 0 ? "hsl(var(--primary))" : undefined,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Scores */}
      {results.dimensionScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("scores_by_dimension")}</CardTitle>
            <CardDescription>{t("scores_by_dimension_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.dimensionScores
              .sort((a, b) => b.average - a.average)
              .map((dim) => (
                <DimensionBar
                  key={dim.dimensionId}
                  name={dim.dimensionName}
                  average={dim.average}
                  maxScore={maxScore}
                />
              ))}
          </CardContent>
        </Card>
      )}

      {/* Question-level Results */}
      <Card>
        <CardHeader>
          <CardTitle>{t("question_results")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.questionResults.map((q, i) => (
            <div
              key={q.questionId}
              className="space-y-2 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {q.type}
                      </Badge>
                      {q.dimensionName && (
                        <Badge variant="secondary" className="text-xs">
                          {q.dimensionName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {q.average != null && (
                  <span className="text-lg font-bold">
                    {q.average.toFixed(2)}
                  </span>
                )}
              </div>
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
                    <p
                      key={j}
                      className="text-sm text-muted-foreground border-l-2 pl-3"
                    >
                      {text}
                    </p>
                  ))}
                  {q.textResponses.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      {t("more_responses", {
                        count: q.textResponses.length - 5,
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
