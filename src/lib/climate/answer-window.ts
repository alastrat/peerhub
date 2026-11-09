// When a survey takes answers: while it's ACTIVE and inside its access window
// ("Fecha y hora de inicio / finalización"). The end-date job closes it later
// (once a day), so the end is enforced here at the minute it passes.

export type AnswerWindowState = "open" | "not_active" | "not_started" | "ended";

interface WindowSurvey {
  status: string;
  accessStartDate: Date | null;
  accessEndDate: Date | null;
  /** Last close; an admin reopening the survey after its end keeps it open */
  closedAt: Date | null;
}

export function answerWindowState(survey: WindowSurvey, now: Date = new Date()): AnswerWindowState {
  if (survey.status !== "ACTIVE") return "not_active";
  if (survey.accessStartDate && now.getTime() < survey.accessStartDate.getTime()) return "not_started";
  const end = survey.accessEndDate;
  // Like the end-date job: a survey reopened after its end stays open until the end moves past that close
  const reopened = !!end && !!survey.closedAt && end.getTime() <= survey.closedAt.getTime();
  if (end && !reopened && now.getTime() >= end.getTime()) return "ended";
  return "open";
}

/** Error key for an answer outside the window, null when it's open. */
export function answerWindowError(survey: WindowSurvey, now: Date = new Date()): string | null {
  const state = answerWindowState(survey, now);
  return state === "open" ? null : `survey_${state}`;
}
