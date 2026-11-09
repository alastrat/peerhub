"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { LeaderTeamView } from "@/lib/queries/action-plans";
import type { ReportSurvey } from "@/lib/queries/climate-report";
import { CLIMATE_SCALES } from "@/lib/constants/climate-scales";
import { ScoreBar, SuppressedNote } from "../climate-score-ui";
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
} from "./report-parts";

interface LeaderReportProps {
  survey: ReportSurvey;
  view: LeaderTeamView;
  generatedOn: string;
  backHref: string;
}

/** One leader's team report: the survey's cover, then the team's results only (as in the leader view). */
export function LeaderReport({ survey, view, generatedOn, backHref }: LeaderReportProps) {
  const t = useTranslations("climate_report.sections");
  const tc = useTranslations("climate_report.cover");
  const ts = useTranslations("climate_scoring");
  const { cover } = survey;
  const { leader, gaps } = view;
  const leaderName = leader.department ? `${leader.name} — ${leader.department}` : leader.name;
  const gapIds = new Set(gaps.gaps.map((g) => g.dimensionId));
  const sortedDimensions = [...gaps.dimensions].sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));

  return (
    <ReportShell accent={cover.colors.accent} backHref={backHref}>
      <ReportSheet cover>
        <ReportCover
          cover={cover}
          eyebrow={`${cover.companyName} · ${tc("eyebrow_leader")}`}
          subtitle={tc("team_of", { name: leaderName })}
          generatedOn={generatedOn}
        />
      </ReportSheet>

      <ReportSheet>
        <ReportHeading
          eyebrow={`${cover.companyName} · ${tc("eyebrow_leader")}`}
          title={cover.surveyName}
          subtitle={tc("team_of", { name: leaderName })}
        />
        <div className="space-y-8">
          <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("leader_banner", { name: leader.name })}</span>
          </div>

          <StatTiles
            items={[
              { label: t("team_respondents"), value: gaps.respondents },
              { label: t("questions"), value: cover.questionCount },
              { label: t("dimensions"), value: cover.dimensions.length },
              { label: t("goal"), value: ts("favorable_pct", { pct: view.survey.goalPct }) },
            ]}
          />

          {gaps.suppressed ? (
            <ReportSection title={ts("suppressed_title")}>
              <SuppressedNote min={view.survey.anonymityThreshold} count={gaps.respondents} />
            </ReportSection>
          ) : (
            <>
              <ReportSection title={t("summary")}>
                <IndexSummary index={gaps.index} isInstrument goalPct={view.survey.goalPct} />
                <BandLegend />
              </ReportSection>

              {sortedDimensions.length > 0 && (
                <ReportSection title={t("dimensions_title")} description={ts("dimensions_desc_instrument")}>
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
                          hint={gapIds.has(dim.dimensionId) ? t("below_goal") : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {view.items.length > 0 && (
                <ReportSection title={t("questions_title")}>
                  <QuestionResults
                    questions={view.items}
                    dimensions={cover.dimensions}
                  />
                </ReportSection>
              )}
            </>
          )}
        </div>
      </ReportSheet>
    </ReportShell>
  );
}
