import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getSurveyLeaders, listPlanSurveys, type SurveyLeaderRow } from "@/lib/queries/action-plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatMean } from "@/lib/utils/climate-scoring";
import { SurveySwitcher } from "@/components/climate/plans/survey-switcher";

interface PageProps {
  params: Promise<{ surveyId: string }>;
}

function badge(row: SurveyLeaderRow, t: Awaited<ReturnType<typeof getTranslations>>, k: number) {
  if (row.suppressed) return { label: t("too_few_badge", { k }), tone: "bg-muted text-muted-foreground" };
  if (row.gapCount === 0) return { label: t("no_gaps_badge"), tone: "bg-lime-100 text-lime-800" };
  return {
    label: t("gaps_badge", { count: row.gapCount }),
    tone: row.indexBand === "MUY_DESFAVORABLE" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800",
  };
}

/** Leaders of one survey, most gaps first (admins). Leaders go straight to their own page. */
export default async function SurveyLeadersPage({ params }: PageProps) {
  const { surveyId } = await params;
  const session = await auth();
  const cu = session?.companyUser;
  if (!cu) redirect("/login");
  if (cu.role !== "ADMIN") {
    if (cu.employeeId) redirect(`/action-plans/${surveyId}/${cu.employeeId}`);
    redirect("/action-plans");
  }

  const [data, surveys] = await Promise.all([getSurveyLeaders(surveyId, cu.companyId), listPlanSurveys(cu.companyId)]);
  if (!data) notFound();
  const t = await getTranslations("climate_plans.leaders");
  const ts = await getTranslations("climate_scoring");
  const { survey, leaders } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-lime-600">{t("eyebrow", { company: cu.companyName })}</p>
          <h1 className="text-2xl font-semibold">{survey.name}</h1>
          <p className="text-muted-foreground">{t("description", { goal: ts("favorable_pct", { pct: survey.goalPct }) })}</p>
        </div>
        <SurveySwitcher surveys={surveys} currentId={survey.id} basePath="/action-plans" label={t("survey_label")} />
      </div>

      {!survey.resultsReleasedAt && (
        <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{t("not_released")}</p>
      )}

      {leaders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no_leaders")}</p>
      ) : (
        <div className="space-y-3">
          {leaders.map((row) => {
            const b = badge(row, t, survey.anonymityThreshold);
            return (
              <div key={row.leaderEmployeeId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      row.department,
                      t("responses", { count: row.respondents }),
                      row.indexMean != null ? t("index", { mean: formatMean(row.indexMean) }) : null,
                      row.planCount > 0 ? t("plans", { count: row.planCount }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", b.tone)}>{b.label}</span>
                  <Button asChild size="sm" className="rounded-full">
                    <Link href={`/action-plans/${survey.id}/${row.leaderEmployeeId}`}>{t("view")}</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
