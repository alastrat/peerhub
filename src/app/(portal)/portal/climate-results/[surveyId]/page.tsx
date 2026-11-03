import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth/portal-session";
import { getLeaderTeamView } from "@/lib/queries/action-plans";
import { LeaderResultsView } from "@/components/climate/plans/leader-results-view";

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

  return <LeaderResultsView view={view} leaderEmployeeId={session.employeeId} />;
}
