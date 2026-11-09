// When a survey takes answers: while it's ACTIVE and inside its access window
// ("Fecha y hora de inicio / finalización"). The end-date job closes it later
// (once a day), so the end is enforced here at the minute it passes.

export type AnswerWindowState = "open" | "not_active" | "not_started" | "ended";

export function answerWindowState(
  survey: { status: string; accessStartDate: Date | null; accessEndDate: Date | null },
  now: Date = new Date(),
): AnswerWindowState {
  if (survey.status !== "ACTIVE") return "not_active";
  if (survey.accessStartDate && now.getTime() < survey.accessStartDate.getTime()) return "not_started";
  if (survey.accessEndDate && now.getTime() >= survey.accessEndDate.getTime()) return "ended";
  return "open";
}

/** Error key for an answer outside the window, null when it's open. */
export function answerWindowError(
  survey: { status: string; accessStartDate: Date | null; accessEndDate: Date | null },
  now: Date = new Date(),
): string | null {
  const state = answerWindowState(survey, now);
  return state === "open" ? null : `survey_${state}`;
}
