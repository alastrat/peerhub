"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, XCircle, Users } from "lucide-react";

interface NominationStatsProps {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  minRequired: number;
  maxAllowed: number;
}

export function NominationStats({
  total,
  approved,
  pending,
  rejected,
  minRequired,
  maxAllowed,
}: NominationStatsProps) {
  const active = total - rejected;
  const progressValue = Math.min((active / minRequired) * 100, 100);
  const isComplete = approved >= minRequired;
  const atMax = active >= maxAllowed;

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Peer Nominations</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {minRequired}-{maxAllowed} required
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className={isComplete ? "text-green-600 font-medium" : ""}>
            {active} of {minRequired} minimum
          </span>
        </div>
        <Progress
          value={progressValue}
          className={`h-2 ${isComplete ? "[&>div]:bg-green-500" : ""}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-2 rounded bg-background">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-bold">{approved}</span>
          </div>
          <span className="text-xs text-muted-foreground">Approved</span>
        </div>

        <div className="p-2 rounded bg-background">
          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="font-bold">{pending}</span>
          </div>
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>

        <div className="p-2 rounded bg-background">
          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="font-bold">{rejected}</span>
          </div>
          <span className="text-xs text-muted-foreground">Rejected</span>
        </div>
      </div>

      {!isComplete && (
        <p className="text-sm text-amber-600 text-center">
          {minRequired - approved > pending
            ? `Need ${minRequired - approved - pending} more nomination${minRequired - approved - pending !== 1 ? "s" : ""}`
            : `Waiting for ${pending} pending approval${pending !== 1 ? "s" : ""}`}
        </p>
      )}

      {atMax && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum nominations reached
        </p>
      )}
    </div>
  );
}
