import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BarChart3, ClipboardCheck, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyPlans, getMyTasks, listLeaderSurveys } from "@/lib/queries/action-plans";
import { formatDay } from "./plan-ui";

/** Portal home: team results for leaders, plus their plans and tasks. */
export async function PortalHomeClimateSection({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const [surveys, tasks, plans] = await Promise.all([
    listLeaderSurveys(employeeId, companyId),
    getMyTasks(employeeId, companyId),
    getMyPlans(employeeId, companyId),
  ]);
  if (surveys.length === 0 && tasks.length === 0 && plans.length === 0) return null;

  const t = await getTranslations("climate_plans.home");
  const locale = await getLocale();
  const overdue = tasks.filter((x) => x.overdue).length;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        {t("title")}
      </h2>
      <div className="grid gap-3">
        {surveys.map((s) => (
          <Card key={s.surveyId}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  {t("team_results", { survey: s.name })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {s.suppressed
                    ? t("too_few")
                    : s.required > 0
                      ? t("plans_progress", { done: s.submitted, required: s.required, gaps: s.gapCount })
                      : t("no_gaps")}
                  {s.planDueDate && s.required > s.submitted && ` · ${t("due", { date: formatDay(s.planDueDate, locale) })}`}
                </p>
              </div>
              <Link
                href={`/portal/climate-results/${s.surveyId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t("open")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
        {(tasks.length > 0 || plans.length > 0) && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  {t("tasks", { count: tasks.length })}
                  {overdue > 0 && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      {t("overdue", { count: overdue })}
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{t("plans", { count: plans.length })}</p>
              </div>
              <Link href="/portal/my-tasks" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {t("open")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
