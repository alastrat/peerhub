"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  evaluateSurveyImpact,
  releaseSurveyResults,
  retractSurveyResults,
  sendSurveyResultsEmails,
} from "@/lib/actions/action-plans";
import type { SurveyPlansOverview } from "@/lib/queries/action-plans";
import { BUSINESS_TIME_ZONE } from "@/lib/constants/business-time";
import { CreatePlanDialog, type PlanDimensionOption } from "./create-plan-dialog";
import { ImpactBadge, formatDay } from "./plan-ui";
import { PlansTable } from "./plans-table";

interface SurveyPlansTabProps {
  overview: SurveyPlansOverview;
  dimensions: PlanDimensionOption[];
  groups: {
    DEPARTMENT: { id: string; name: string }[];
    HUB: { id: string; name: string }[];
    TEAM: { id: string; name: string }[];
    LEADER: { id: string; name: string }[];
  };
  employees: { id: string; name: string }[];
}

export function SurveyPlansTab({ overview, dimensions, groups, employees }: SurveyPlansTabProps) {
  const t = useTranslations("climate_plans");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { survey, leaders, plans, impactSummary } = overview;

  if (!survey.isInstrument) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("needs_instrument")}</CardContent>
      </Card>
    );
  }

  const released = !!survey.resultsReleasedAt;
  const missing = leaders.filter((l) => !l.meetsMinimum);

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: (r: never) => string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? t("error_generic"));
        return;
      }
      toast.success(ok(res as never));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Release ------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("release_title")}</CardTitle>
          <CardDescription>
            {released
              ? t("released_on", {
                  date: formatDay(survey.resultsReleasedAt, locale, BUSINESS_TIME_ZONE),
                  due: formatDay(survey.planDueDate, locale),
                })
              : t("release_desc")}
            {released && !survey.resultsEmailedAt && <span className="block">{t("results_not_emailed")}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!released ? (
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => releaseSurveyResults(survey.id),
                  (r: { data: { leaders: number; emailed: number } }) =>
                    t("released_toast", { leaders: r.data.leaders, emailed: r.data.emailed }),
                )
              }
            >
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
              {t("release")}
            </Button>
          ) : (
            <>
              {!survey.resultsEmailedAt && (
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => sendSurveyResultsEmails(survey.id),
                      (r: { data: { emailed: number } }) => t("results_emails_sent", { count: r.data.emailed }),
                    )
                  }
                >
                  {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
                  {t("send_results_emails")}
                </Button>
              )}
              <Button variant="outline" disabled={pending} onClick={() => run(() => retractSurveyResults(survey.id), () => t("retracted"))}>
                <EyeOff className="mr-1.5 h-4 w-4" />
                {t("retract")}
              </Button>
            </>
          )}
          {survey.status === "CLOSED" && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => evaluateSurveyImpact(survey.id),
                  (r: { data: { evaluated: number } }) => t("evaluated_toast", { count: r.data.evaluated }),
                )
              }
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t("evaluate_impact")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Leaders ------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leaders_title")}</CardTitle>
          <CardDescription>
            {t("leaders_desc", { min: survey.planMinPerLeader, missing: missing.length, k: survey.anonymityThreshold })}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_leaders")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-2 font-medium">{t("col_leader")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_respondents")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_gaps")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_plans")}</th>
                  <th className="px-2 py-2 font-medium">{t("col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.leaderEmployeeId} className="border-t align-top">
                    <td className="px-2 py-2 font-medium">{l.name}</td>
                    <td className="px-2 py-2 tabular-nums">{l.respondents}</td>
                    <td className="px-2 py-2">
                      {l.suppressed ? (
                        <span className="text-xs text-muted-foreground">{t("too_few", { k: survey.anonymityThreshold })}</span>
                      ) : l.gapNames.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t("no_gaps")}</span>
                      ) : (
                        <span className="text-xs">{l.gapNames.join(", ")}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {l.submitted}/{l.required}
                      {l.drafts > 0 && <span className="ml-1 text-xs text-muted-foreground">({t("drafts", { count: l.drafts })})</span>}
                    </td>
                    <td className="px-2 py-2">
                      {l.required === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : l.meetsMinimum ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t("complete_status")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {t("missing_status")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Impact -------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("impact_title")}</CardTitle>
          <CardDescription>{t("impact_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(["IMPROVED", "UNCHANGED", "WORSENED", "NOT_EVALUABLE", "PENDING"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <ImpactBadge impact={k === "PENDING" ? null : k} />
              <span className="font-semibold tabular-nums">{impactSummary[k]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plans --------------------------------------------------------------- */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t("plans_title")}</CardTitle>
            <CardDescription>{t("plans_desc")}</CardDescription>
          </div>
          {released && dimensions.length > 0 && (
            <CreatePlanDialog
              surveyId={survey.id}
              dimensions={dimensions}
              groups={groups}
              employees={employees}
              planHref={(id) => `/surveys/climate/${survey.id}/plans/${id}`}
            />
          )}
        </CardHeader>
        <CardContent>
          <PlansTable plans={plans} dimensions={dimensions} emptyText={released ? t("no_plans") : t("no_plans_unreleased")} />
        </CardContent>
      </Card>
    </div>
  );
}
