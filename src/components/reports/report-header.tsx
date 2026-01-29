"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getInitials } from "@/lib/utils/formatting";
import { formatDate } from "@/lib/utils/dates";
import { CheckCircle2, Clock } from "lucide-react";
import type { ReviewerType } from "@prisma/client";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";

interface ReportHeaderProps {
  participantName: string;
  participantEmail?: string;
  participantImage?: string | null;
  cycleName: string;
  overallScore: number | null;
  responseCounts: Record<ReviewerType, number>;
  releasedAt: Date | null;
  maxRating?: number;
}

export function ReportHeader({
  participantName,
  participantEmail,
  participantImage,
  cycleName,
  overallScore,
  responseCounts,
  releasedAt,
  maxRating = 5,
}: ReportHeaderProps) {
  const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={participantImage || undefined} />
            <AvatarFallback className="text-xl">
              {getInitials(participantName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold truncate">{participantName}</h1>
              {releasedAt ? (
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Released
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Not Released
                </Badge>
              )}
            </div>
            {participantEmail && (
              <p className="text-muted-foreground">{participantEmail}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{cycleName}</p>
          </div>

          {overallScore !== null && (
            <div className="text-center px-6 py-4 bg-primary/5 rounded-lg">
              <p className="text-4xl font-bold text-primary">
                {overallScore.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">
                out of {maxRating}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Overall Score
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-medium mb-3">Feedback Sources</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(responseCounts).map(([type, count]) => {
              if (count === 0) return null;
              return (
                <Badge key={type} variant="outline">
                  {REVIEWER_TYPE_LABELS[type as ReviewerType]}: {count}
                </Badge>
              );
            })}
            <Badge variant="secondary" className="font-medium">
              Total: {totalResponses}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
