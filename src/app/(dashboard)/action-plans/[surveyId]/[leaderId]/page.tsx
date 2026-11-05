import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getLeaderTeamView, listLeaderSurveys } from "@/lib/queries/action-plans";
import { LeaderPlansPanel } from "@/components/climate/plans/leader-plans-panel";
import { SurveySwitcher } from "@/components/climate/plans/survey-switcher";
import { ReportLinkButton } from "@/components/climate/report/report-link-button";

interface PageProps {
  params: Promise<{ surveyId: string; leaderId: string }>;
}

/** One leader's gaps and plans. Admins see any leader; anyone else only themselves, after release. */
export default async function LeaderPlansPage({ params }: PageProps) {
  const { surveyId, leaderId } = await params;
  const session = await auth();
  const cu = session?.companyUser;
  if (!cu) redirect("/login");
  const isAdmin = cu.role === "ADMIN";
  const isSelf = !!cu.employeeId && cu.employeeId === leaderId;
  if (!isAdmin && !isSelf) {
    redirect(cu.employeeId ? `/action-plans/${surveyId}/${cu.employeeId}` : "/action-plans");
  }

  const view = await getLeaderTeamView(surveyId, leaderId, cu.companyId, { requireRelease: !isAdmin });
  if (!view) notFound();
  const t = await getTranslations("climate_plans");
  const ownSurveys = isAdmin ? [] : await listLeaderSurveys(leaderId, cu.companyId);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-lime-600">
            {t("leaders.eyebrow", { company: cu.companyName })}
          </p>
          <h1 className="text-2xl font-semibold">
            {view.leader.name}
            {view.leader.department && ` — ${view.leader.department}`}
          </h1>
          <p className="text-muted-foreground">
            {t("panel.subtitle", { survey: view.survey.name, count: view.gaps.respondents })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isAdmin && (
            <SurveySwitcher
              surveys={ownSurveys.map((s) => ({ id: s.surveyId, name: s.name }))}
              currentId={surveyId}
              basePath="/action-plans"
              suffix={`/${leaderId}`}
              label={t("leaders.survey_label")}
            />
          )}
          <ReportLinkButton href={`/climate-report/${surveyId}/leaders/${leaderId}`} />
        </div>
      </div>

      <LeaderPlansPanel
        view={view}
        canEdit={isAdmin || isSelf}
        canAnswerContext={isSelf}
        planDetailBase={isAdmin ? `/action-plans/${surveyId}/plans/` : undefined}
        backHref={isAdmin ? `/action-plans/${surveyId}` : undefined}
        backLabel={t("leaders.back")}
      />
    </div>
  );
}
