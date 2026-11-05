"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SurveyResults } from "@/lib/queries/climate-reports";
import type { ReportSurvey } from "@/lib/queries/climate-report";
import { CLIMATE_SCALES } from "@/lib/constants/climate-scales";
import { BandBadge, ScoreBar, SuppressedNote, formatMean } from "../climate-score-ui";
import { ClimateHeatmap } from "../climate-heatmap";
import { ReportCover } from "./report-cover";
import {
  BandLegend,
  IndexSummary,
  QuestionResults,
  ReportHeading,
  ReportSection,
  ReportSheet,
  ReportShell,
  StatTiles,
  type ReportQuestion,
} from "./report-parts";

interface ClimateReportProps {
  survey: ReportSurvey;
  /** Null while the survey has no results yet (draft or archived). */
  results: SurveyResults | null;
  generatedOn: string;
  /** Omitted on the shared link, which has no dashboard to go back to. */
  backHref?: string;
}

/** Share of promoters, passives and detractors across the survey's NPS answers. */
function npsBreakdown(results: SurveyResults) {
  const counts = { promoters: 0, passives: 0, detractors: 0 };
  for (const q of results.questionResults.filter((x) => x.type === "NPS")) {
    for (const [rating, count] of Object.entries(q.distribution)) {
      const r = Number(rating);
      if (r >= 9) counts.promoters += count;
      else if (r >= 7) counts.passives += count;
      else counts.detractors += count;
    }
  }
  const total = counts.promoters + counts.passives + counts.detractors;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  return { promoters: pct(counts.promoters), passives: pct(counts.passives), detractors: pct(counts.detractors) };
}

/** The general climate report: cover, then the same results as the Análisis tab, laid out for print. */
export function ClimateReport({ survey, results, generatedOn, backHref }: ClimateReportProps) {
  const t = useTranslations("climate_report.sections");
  const ti = useTranslations("dashboard.climate.detail.insights_tab");
  const ts = useTranslations("climate_scoring");
  const td = useTranslations("demographics");
  const { cover } = survey;
  const demographicLabel = (type: "gender" | "generation" | "tenure") => (s: { segmentName: string }) =>
    td(`${type}.${s.segmentName}`);

  const k = results?.anonymityThreshold ?? 0;
  const dimensionColumns = results?.dimensionScores.map((d) => ({ id: d.dimensionId, name: d.dimensionName })) ?? [];
  const sortedDimensions = [...(results?.dimensionScores ?? [])].sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));
  const scored: ReportQuestion[] = (results?.questionResults ?? [])
    .filter((q) => q.type !== "TEXT")
    .map((q) => ({
      questionId: q.questionId,
      text: q.text,
      itemCode: q.itemCode,
      dimensionId: q.dimensionId,
      scaleKey: q.scaleKey,
      mean: q.average,
      favorability: q.favorability,
      distribution: q.distribution,
    }));
  const openQuestions = (results?.questionResults ?? []).filter((q) => q.type === "TEXT");
  const nps = results && results.npsScore != null ? npsBreakdown(results) : null;

  const heatmaps = results
    ? [
        { key: "department", title: ts("heatmap_department"), segments: results.departmentBreakdown },
        { key: "team", title: ts("heatmap_team"), segments: results.teamBreakdown },
        ...(survey.featureHubs ? [{ key: "hub", title: ts("heatmap_hub"), segments: results.hubBreakdown }] : []),
        { key: "leader", title: ts("heatmap_leader"), segments: results.leaderBreakdown },
        {
          key: "gender",
          title: ts("heatmap_gender"),
          segments: results.genderBreakdown,
          label: demographicLabel("gender"),
        },
        {
          key: "generation",
          title: ts("heatmap_generation"),
          segments: results.generationBreakdown,
          label: demographicLabel("generation"),
        },
        {
          key: "tenure",
          title: ts("heatmap_tenure"),
          segments: results.tenureBreakdown,
          label: demographicLabel("tenure"),
        },
      ].filter((h) => h.segments.length > 0)
    : [];

  return (
    <ReportShell accent={cover.colors.accent} backHref={backHref}>
      <ReportSheet cover>
        <ReportCover cover={cover} generatedOn={generatedOn} />
      </ReportSheet>

      <ReportSheet>
        <ReportHeading eyebrow={`${cover.companyName} · ${cover.typeLabel}`} title={cover.surveyName} />
        {!results ? (
          <p className="mb-0 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">{t("no_results")}</p>
        ) : (
          <div className="space-y-8">
            <StatTiles
              items={[
                { label: t("invited"), value: results.totalInvited },
                { label: t("responded"), value: results.totalResponded },
                { label: t("rate"), value: `${results.completionRate}%` },
                { label: t("dimensions"), value: cover.dimensions.length },
              ]}
            />

            {results.suppressed ? (
              <ReportSection title={ts("suppressed_title")}>
                <SuppressedNote min={k} count={results.totalResponded} />
              </ReportSection>
            ) : (
              <>
                <ReportSection title={t("summary")}>
                  <IndexSummary index={results.index} isInstrument={results.isInstrument} goalBand={results.goalBand} />
                  {nps && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border px-5 py-3 text-sm break-inside-avoid">
                      <span className="font-semibold text-gray-900">{ti("enps_score", { score: results.npsScore! })}</span>
                      <span className="text-red-600">{ti("detractors", { pct: nps.detractors })}</span>
                      <span className="text-yellow-600">{ti("passives", { pct: nps.passives })}</span>
                      <span className="text-green-600">{ti("promoters", { pct: nps.promoters })}</span>
                    </div>
                  )}
                  {results.isInstrument && <BandLegend />}
                </ReportSection>

                {sortedDimensions.length > 0 && (
                  <ReportSection
                    title={t("dimensions_title")}
                    description={results.isInstrument ? ts("dimensions_desc_instrument") : ti("scores_by_dimension_desc")}
                  >
                    <div className="space-y-4">
                      {sortedDimensions.map((dim) => (
                        <div key={dim.dimensionId} className="break-inside-avoid">
                          <ScoreBar
                            label={dim.dimensionName}
                            mean={dim.mean}
                            scaleMax={CLIMATE_SCALES[dim.scaleKey].max}
                            percent={dim.percent}
                            band={dim.band}
                            favorability={dim.favorability}
                          />
                        </div>
                      ))}
                    </div>
                  </ReportSection>
                )}

                {results.isInstrument && (
                  <ReportSection
                    title={ts("attention_title")}
                    description={ts("attention_desc", { band: ts(`bands.${results.goalBand}`) })}
                  >
                    {results.gaps.length === 0 && results.attentionSegments.length === 0 ? (
                      <p className="mb-0 text-sm text-muted-foreground">{ts("attention_none")}</p>
                    ) : (
                      <div className="space-y-4">
                        {results.gaps.length > 0 && (
                          <div className="space-y-2 break-inside-avoid">
                            <p className="mb-0 flex items-center gap-1.5 text-sm font-medium">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              {ts("attention_dimensions")}
                            </p>
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
                          <div className="space-y-2 break-inside-avoid">
                            <p className="mb-0 text-sm font-medium">{ts("attention_groups")}</p>
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
                      </div>
                    )}
                  </ReportSection>
                )}

                {heatmaps.length > 0 && dimensionColumns.length > 0 && (
                  <ReportSection title={t("groups_title")}>
                    <div className="space-y-4">
                      {heatmaps.map((h) => (
                        <div key={h.key} className="break-inside-avoid">
                          <ClimateHeatmap
                            title={h.title}
                            segments={h.segments}
                            dimensions={dimensionColumns}
                            minGroupSize={k}
                            segmentLabel={h.label}
                          />
                        </div>
                      ))}
                    </div>
                  </ReportSection>
                )}

                {scored.length > 0 && (
                  <ReportSection title={t("questions_title")}>
                    <QuestionResults questions={scored} dimensions={cover.dimensions} />
                  </ReportSection>
                )}

                {openQuestions.length > 0 && (
                  <ReportSection title={t("open_title")} description={t("open_desc")}>
                    <div className="space-y-4">
                      {openQuestions.map((q) => (
                        <div key={q.questionId} className="space-y-2">
                          <p className="mb-0 break-after-avoid text-sm font-medium text-gray-900">{q.text}</p>
                          {q.textResponses.length === 0 ? (
                            <p className="mb-0 text-sm text-muted-foreground">{t("open_none")}</p>
                          ) : (
                            q.textResponses.map((text, i) => (
                              <p key={i} className="mb-0 border-l-2 pl-3 text-sm text-muted-foreground break-inside-avoid">
                                {text}
                              </p>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  </ReportSection>
                )}
              </>
            )}
          </div>
        )}
      </ReportSheet>
    </ReportShell>
  );
}
