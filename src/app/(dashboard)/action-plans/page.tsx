import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { listLeaderSurveys, listPlanSurveys } from "@/lib/queries/action-plans";
import { EmptyState } from "@/components/design-system/empty-state";
import { ListChecks } from "lucide-react";

/** Opens the latest survey: its leaders for admins, the leader's own page otherwise. */
export default async function ActionPlansPage() {
  const session = await auth();
  const cu = session?.companyUser;
  if (!cu) redirect("/login");
  const t = await getTranslations("climate_plans.leaders");

  if (cu.role === "ADMIN") {
    // Latest survey with released results, else the latest one sent
    const surveys = await listPlanSurveys(cu.companyId);
    const latest = surveys.find((s) => s.resultsReleasedAt) ?? surveys[0];
    if (latest) redirect(`/action-plans/${latest.id}`);
    return <EmptyState icon={<ListChecks className="h-8 w-8 text-muted-foreground" />} title={t("title")} description={t("no_surveys")} />;
  }

  if (cu.employeeId) {
    const [latest] = await listLeaderSurveys(cu.employeeId, cu.companyId);
    if (latest) redirect(`/action-plans/${latest.surveyId}/${cu.employeeId}`);
  }
  return <EmptyState icon={<ListChecks className="h-8 w-8 text-muted-foreground" />} title={t("title")} description={t("no_own_surveys")} />;
}
