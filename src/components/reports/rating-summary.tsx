"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReviewerType } from "@prisma/client";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";

interface RatingSummaryProps {
  overallScore: number | null;
  byReviewerType: Record<
    ReviewerType,
    {
      average: number;
      count: number;
    } | null
  >;
  maxRating?: number;
}

export function RatingSummary({
  overallScore,
  byReviewerType,
  maxRating = 5,
}: RatingSummaryProps) {
  const visibleTypes = Object.entries(byReviewerType).filter(
    ([, data]) => data !== null
  ) as [ReviewerType, { average: number; count: number }][];

  if (visibleTypes.length === 0 && overallScore === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rating Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Not enough responses to display ratings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {overallScore !== null && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Score</span>
              <span className="text-2xl font-bold text-primary">
                {overallScore.toFixed(2)}
              </span>
            </div>
            <Progress
              value={(overallScore / maxRating) * 100}
              className="h-3"
            />
          </div>
        )}

        <div className="space-y-4">
          {visibleTypes.map(([type, data]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {REVIEWER_TYPE_LABELS[type]}
                </span>
                <span className="text-sm font-medium">
                  {data.average.toFixed(2)}
                  <span className="text-muted-foreground ml-1">
                    ({data.count} review{data.count !== 1 ? "s" : ""})
                  </span>
                </span>
              </div>
              <Progress
                value={(data.average / maxRating) * 100}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
