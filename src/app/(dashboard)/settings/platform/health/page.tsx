import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import {
  getPlatformStats,
  getCycleStatusDistribution,
  getTopCompaniesBySize,
} from "@/lib/queries/platform";
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

export default async function HealthPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const [stats, cycleDistribution, topCompanies] = await Promise.all([
    getPlatformStats(),
    getCycleStatusDistribution(),
    getTopCompaniesBySize(),
  ]);

  const statCards = [
    {
      title: "Companies",
      value: stats.companies,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Users",
      value: stats.users,
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Active Cycles",
      value: stats.activeCycles,
      icon: RotateCcw,
      color: "text-amber-600",
    },
    {
      title: "Completed Reviews",
      value: stats.completedReviews,
      icon: ClipboardCheck,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Health"
        description="Overview of platform-wide metrics and statistics"
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
            <CardTitle className="text-base">Cycle Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {cycleDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cycles yet</p>
            ) : (
              <div className="space-y-3">
                {cycleDistribution.map((d) => (
                  <div
                    key={d.status}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      className={
                        CYCLE_STATUS_COLORS[d.status] || "bg-gray-100 text-gray-700"
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
            <CardTitle className="text-base">Top Companies by Size</CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No companies yet
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
                      {c.usersCount} {c.usersCount === 1 ? "user" : "users"}
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
