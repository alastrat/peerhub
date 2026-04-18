"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, RotateCcw, Calendar } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, daysUntil, isDateInPast } from "@/lib/utils/dates";
import { CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";

interface CycleData {
  id: string;
  name: string;
  status: string;
  reviewStartDate: Date;
  reviewEndDate: Date;
  templateName: string;
  participantCount: number;
  completedCount: number;
  totalCount: number;
  statusLabel: string;
}

interface CyclesContentProps {
  cycles: CycleData[];
}

export function CyclesContent({ cycles }: CyclesContentProps) {
  const t = useTranslations("dashboard.cycles");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Link href="/surveys/360/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("create_cycle")}
          </Button>
        </Link>
      </PageHeader>

      {cycles.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-8 w-8 text-muted-foreground" />}
          title={t("no_cycles_yet")}
          description={t("no_cycles_desc")}
          action={
            <Link href="/surveys/360/new">
              <Button>{t("create_cycle")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const completionRate =
              cycle.totalCount > 0
                ? (cycle.completedCount / cycle.totalCount) * 100
                : 0;
            const daysLeft = daysUntil(cycle.reviewEndDate);
            const isOverdue =
              isDateInPast(cycle.reviewEndDate) &&
              cycle.status === "IN_PROGRESS";

            return (
              <Link key={cycle.id} href={`/surveys/360/${cycle.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {cycle.name}
                        </CardTitle>
                        <CardDescription>
                          {cycle.templateName} • {cycle.participantCount}{" "}
                          {t("participants")}
                        </CardDescription>
                      </div>
                      <Badge
                        className={
                          CYCLE_STATUS_COLORS[
                            cycle.status as keyof typeof CYCLE_STATUS_COLORS
                          ]
                        }
                      >
                        {cycle.statusLabel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cycle.totalCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("completion")}
                          </span>
                          <span className="font-medium">
                            {cycle.completedCount} / {cycle.totalCount}{" "}
                            {t("reviews")} ({Math.round(completionRate)}
                            %)
                          </span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(cycle.reviewStartDate)} -{" "}
                          {formatDate(cycle.reviewEndDate)}
                        </span>
                      </div>
                      {cycle.status === "IN_PROGRESS" && (
                        <div
                          className={
                            isOverdue
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {isOverdue ? (
                            <span>{t("overdue")}</span>
                          ) : daysLeft <= 7 ? (
                            <span>
                              {daysLeft === 1
                                ? t("day_left", { days: daysLeft })
                                : t("days_left_plural", { days: daysLeft })}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
