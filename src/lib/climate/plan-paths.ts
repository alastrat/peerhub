// Dashboard URLs for action plans. Plans live under Planes de acción, next to
// their survey's leaders; next.config.ts redirects the old
// /surveys/climate/[id]/plans/[planId] URL here, for emails already sent.

/** A plan's full page: tasks, progress, evidence, baseline, goal and result. */
export function actionPlanPath(surveyId: string, planId: string) {
  return `/action-plans/${surveyId}/plans/${planId}`;
}

/** Where a plan's page goes back to: its leader's page, else the survey's leaders. */
export function actionPlanBackPath(plan: { surveyId: string; scope: string; scopeRefId: string | null }) {
  return plan.scope === "LEADER" && plan.scopeRefId
    ? `/action-plans/${plan.surveyId}/${plan.scopeRefId}`
    : `/action-plans/${plan.surveyId}`;
}
