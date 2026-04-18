"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, Users, CheckCircle2, Send } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils/dates";
import { CYCLE_STATUS_COLORS } from "@/lib/constants/cycle-status";

interface CycleReport {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  templateName: string;
  reviewEndDate: Date;
  participantCount: number;
  completedReviews: number;
  totalReviews: number;
  releasedCount: number;
}

interface ReportsContentProps {
  cycles: CycleReport[];
}

export function ReportsContent({ cycles }: ReportsContentProps) {
  const t = useTranslations("dashboard.reports_page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {cycles.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-muted-foreground" />}
          title={t("no_reports")}
          description={t("no_reports_desc")}
          action={
            <Button asChild>
              <Link href="/surveys/360">{t("view_cycles")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const completionRate =
              cycle.totalReviews > 0
                ? (cycle.completedReviews / cycle.totalReviews) * 100
                : 0;
            const releaseRate =
              cycle.participantCount > 0
                ? (cycle.releasedCount / cycle.participantCount) * 100
                : 0;

            return (
              <Link key={cycle.id} href={`/reports/${cycle.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">
                            {cycle.name}
                          </h3>
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
                        <p className="text-sm text-muted-foreground mb-4">
                          {cycle.templateName} •{" "}
                          {t("ended", {
                            date: formatDate(cycle.reviewEndDate),
                          })}
                        </p>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {t("participants")}
                              </span>
                            </div>
                            <p className="font-medium">
                              {cycle.participantCount}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {t("reviews_completed")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {cycle.completedReviews}/{cycle.totalReviews}
                              </span>
                              <Progress
                                value={completionRate}
                                className="h-2 w-20"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Send className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {t("reports_released")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {cycle.releasedCount}/{cycle.participantCount}
                              </span>
                              <Progress
                                value={releaseRate}
                                className="h-2 w-20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm">
                        {t("manage_reports")}
                      </Button>
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
