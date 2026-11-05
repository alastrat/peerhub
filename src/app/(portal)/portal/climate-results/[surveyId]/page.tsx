import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/db/prisma";
import { getLeaderTeamView } from "@/lib/queries/action-plans";
import { LeaderPlansPanel } from "@/components/climate/plans/leader-plans-panel";

interface PageProps {
  params: Promise<{ surveyId: string }>;
}

export default async function LeaderClimateResultsPage({ params }: PageProps) {
  const { surveyId } = await params;
  const session = await getPortalSession();
  if (!session) redirect(`/portal?redirect=${encodeURIComponent(`/portal/climate-results/${surveyId}`)}`);

  // Only the leader of at least one respondent sees this survey (after release)
  const view = await getLeaderTeamView(surveyId, session.employeeId, session.companyId);
  if (!view) notFound();
  const [t, company] = await Promise.all([
    getTranslations("climate_plans"),
    prisma.company.findUnique({ where: { id: session.companyId }, select: { name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-lime-600">
          {t("leaders.eyebrow", { company: company?.name ?? "" })}
        </p>
        <h1 className="text-2xl font-semibold">
          {view.leader.name}
          {view.leader.department && ` — ${view.leader.department}`}
        </h1>
        <p className="text-muted-foreground">{t("panel.subtitle", { survey: view.survey.name, count: view.gaps.respondents })}</p>
      </div>
      <LeaderPlansPanel
        view={view}
        canEdit
        canAnswerContext
        planDetailBase="/portal/climate-plans/"
        backHref="/portal/home"
        backLabel={t("back")}
      />
    </div>
  );
}
