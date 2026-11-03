"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { ImpactResult } from "@/lib/utils/climate-scoring";

const PLAN_STATUS_STYLE: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
  ACTIVE: "border-blue-200 bg-blue-100 text-blue-800",
  COMPLETED: "border-green-200 bg-green-100 text-green-800",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-500 line-through",
};

const TASK_STATUS_STYLE: Record<string, string> = {
  PENDING: "border-slate-200 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-blue-200 bg-blue-100 text-blue-800",
  DONE: "border-green-200 bg-green-100 text-green-800",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

const IMPACT_STYLE: Record<ImpactResult | "PENDING", string> = {
  IMPROVED: "border-green-200 bg-green-100 text-green-800",
  UNCHANGED: "border-slate-200 bg-slate-100 text-slate-700",
  WORSENED: "border-red-200 bg-red-100 text-red-800",
  NOT_EVALUABLE: "border-zinc-200 bg-zinc-100 text-zinc-600",
  PENDING: "border-dashed border-slate-300 bg-transparent text-muted-foreground",
};

export function PlanStatusBadge({ status }: { status: string }) {
  const t = useTranslations("climate_plans.plan_status");
  return (
    <Badge variant="outline" className={cn("font-medium", PLAN_STATUS_STYLE[status])}>
      {t(status)}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const t = useTranslations("climate_plans.task_status");
  return (
    <Badge variant="outline" className={cn("font-medium", TASK_STATUS_STYLE[status])}>
      {t(status)}
    </Badge>
  );
}

export function ImpactBadge({ impact }: { impact: ImpactResult | null }) {
  const t = useTranslations("climate_plans.impact");
  const key = impact ?? "PENDING";
  return (
    <Badge variant="outline" className={cn("font-medium", IMPACT_STYLE[key])}>
      {t(key)}
    </Badge>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full min-w-16 rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export { formatDay } from "@/lib/constants/business-time";

/** Native select styled like the shadcn inputs (works well for long lists). */
export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        props.className,
      )}
    />
  );
}
