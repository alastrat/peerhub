"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, RotateCcw, ClipboardCheck } from "lucide-react";

const CYCLE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  NOMINATION: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface HealthContentProps {
  stats: {
    companies: number;
    users: number;
    activeCycles: number;
    completedReviews: number;
  };
  cycleDistribution: { status: string; count: number }[];
  topCompanies: { name: string; usersCount: number }[];
}

export function HealthContent({
  stats,
  cycleDistribution,
  topCompanies,
}: HealthContentProps) {
  const t = useTranslations("dashboard.settings_pages");

  const statCards = [
    {
      title: t("health_companies"),
      value: stats.companies,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: t("health_users"),
      value: stats.users,
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: t("health_active_cycles"),
      value: stats.activeCycles,
      icon: RotateCcw,
      color: "text-amber-600",
    },
    {
      title: t("health_completed_reviews"),
      value: stats.completedReviews,
      icon: ClipboardCheck,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("health_title")}
        description={t("health_description")}
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="mt-1 text-3xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cycle distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("health_cycle_distribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cycleDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("health_no_cycles")}
              </p>
            ) : (
              <div className="space-y-3">
                {cycleDistribution.map((d) => (
                  <div
                    key={d.status}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      className={
                        CYCLE_STATUS_COLORS[d.status] ||
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {d.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top companies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("health_top_companies")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("health_no_companies")}
              </p>
            ) : (
              <div className="space-y-3">
                {topCompanies.map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {c.usersCount}{" "}
                      {c.usersCount === 1
                        ? t("health_user")
                        : t("health_users_plural")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
