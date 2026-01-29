"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, TrendingUp, Lock } from "lucide-react";

interface TextFeedbackProps {
  strengths: string[];
  opportunities: string[];
  minResponses?: number;
}

export function TextFeedback({
  strengths,
  opportunities,
  minResponses = 3,
}: TextFeedbackProps) {
  const hasStrengths = strengths.length >= minResponses;
  const hasOpportunities = opportunities.length >= minResponses;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-green-500" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasStrengths ? (
            <ul className="space-y-3">
              {strengths.slice(0, 10).map((strength, index) => (
                <li
                  key={index}
                  className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900"
                >
                  <p className="text-sm">{strength}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Lock className="h-4 w-4" />
              <span className="text-sm">
                {strengths.length === 0
                  ? "No strength feedback provided"
                  : `Minimum ${minResponses} responses required for display`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Growth Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasOpportunities ? (
            <ul className="space-y-3">
              {opportunities.slice(0, 10).map((opportunity, index) => (
                <li
                  key={index}
                  className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900"
                >
                  <p className="text-sm">{opportunity}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Lock className="h-4 w-4" />
              <span className="text-sm">
                {opportunities.length === 0
                  ? "No growth opportunities provided"
                  : `Minimum ${minResponses} responses required for display`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
