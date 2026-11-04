import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getCompanyPlans } from "@/lib/queries/action-plans";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactBadge } from "@/components/climate/plans/plan-ui";
import { PlansTable } from "@/components/climate/plans/plans-table";

/** Every action plan in the company, across climate surveys. */
export default async function CompanyPlansPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }
  const t = await getTranslations("climate_plans");
  const { plans, surveys, dimensions, summary } = await getCompanyPlans(session.companyUser.companyId);

  const stats = [
    { label: t("all.stat_total"), value: summary.total },
    { label: t("all.stat_active"), value: summary.active },
    { label: t("all.stat_completed"), value: summary.completed },
    { label: t("all.stat_overdue"), value: summary.withOverdueTasks },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("all.title")} description={t("all.description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold tabular-nums">{s.value}</div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("impact_title")}</CardTitle>
          <CardDescription>{t("impact_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(["IMPROVED", "UNCHANGED", "WORSENED", "NOT_EVALUABLE", "PENDING"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <ImpactBadge impact={k === "PENDING" ? null : k} />
              <span className="font-semibold tabular-nums">{summary.impact[k]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("plans_title")}</CardTitle>
          <CardDescription>{t("all.plans_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PlansTable plans={plans} dimensions={dimensions} surveys={surveys} emptyText={t("all.empty")} planLinks="action-plans" />
        </CardContent>
      </Card>
    </div>
  );
}
