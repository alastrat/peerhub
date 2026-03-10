"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CompetencyScore } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational",
  functional: "Functional",
  leadership: "Leadership",
};

interface CompetencyScoresProps {
  scores: CompetencyScore[];
}

export function CompetencyScores({ scores }: CompetencyScoresProps) {
  if (scores.length === 0) return null;

  // Sort by overall average descending
  const sorted = [...scores].sort((a, b) => {
    if (a.overallAverage === null) return 1;
    if (b.overallAverage === null) return -1;
    return b.overallAverage - a.overallAverage;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Competency Scores</CardTitle>
        </div>
        <CardDescription>
          Aggregated ratings by competency across all questions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((score) => (
          <div
            key={score.competencyId}
            className="flex items-center gap-4 p-3 rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {score.competencyName}
                </p>
                {score.category && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {CATEGORY_LABELS[score.category] || score.category}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress
                  value={score.overallAverage ? (score.overallAverage / 5) * 100 : 0}
                  className="h-2 flex-1"
                />
                <span className="text-sm font-semibold w-12 text-right">
                  {score.overallAverage?.toFixed(1) ?? "N/A"}
                </span>
              </div>
              {/* Reviewer type breakdown */}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {score.byReviewerType.SELF && (
                  <span>Self: {score.byReviewerType.SELF.average.toFixed(1)}</span>
                )}
                {score.byReviewerType.MANAGER && (
                  <span>Manager: {score.byReviewerType.MANAGER.average.toFixed(1)}</span>
                )}
                {score.byReviewerType.PEER && (
                  <span>Peers: {score.byReviewerType.PEER.average.toFixed(1)}</span>
                )}
                {score.byReviewerType.DIRECT_REPORT && (
                  <span>Direct Reports: {score.byReviewerType.DIRECT_REPORT.average.toFixed(1)}</span>
                )}
              </div>
            </div>

            {/* Self vs Others Gap indicator */}
            {score.selfVsOthersGap !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 shrink-0">
                    {score.selfVsOthersGap > 0.3 ? (
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    ) : score.selfVsOthersGap < -0.3 ? (
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-green-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        Math.abs(score.selfVsOthersGap) > 0.3
                          ? score.selfVsOthersGap > 0
                            ? "text-amber-500"
                            : "text-blue-500"
                          : "text-green-500"
                      }`}
                    >
                      {score.selfVsOthersGap > 0 ? "+" : ""}
                      {score.selfVsOthersGap.toFixed(1)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {score.selfVsOthersGap > 0.3
                      ? "Self-rating is higher than others' ratings"
                      : score.selfVsOthersGap < -0.3
                      ? "Self-rating is lower than others' ratings"
                      : "Self-rating is aligned with others' ratings"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
