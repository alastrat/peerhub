// When a climate survey ends. Apart from survey-finish, which loads the
// results, so the results can use it too.

export interface EndDateSurvey {
  accessEndDate: Date | null;
  closedAt: Date | null;
  distributions: { dueDate: Date }[];
}

/**
 * A survey's end: its access end date (a moment, set with a time), else its
 * latest distribution due date (a calendar day, stored at UTC midnight).
 */
export function surveyEndsAt(survey: EndDateSurvey): Date | null {
  if (survey.accessEndDate) return survey.accessEndDate;
  if (survey.distributions.length === 0) return null;
  return new Date(Math.max(...survey.distributions.map((d) => d.dueDate.getTime())));
}

/**
 * When to measure the tenure of people who haven't answered: now while the
 * survey is open; once it's closed, when it closed, else its end date, so a
 * closed survey's numbers don't drift.
 */
export function notAnsweredAsOf(
  survey: EndDateSurvey & { status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED" },
  now: Date,
): Date {
  if (survey.status !== "CLOSED" && survey.status !== "ARCHIVED") return now;
  return survey.closedAt ?? surveyEndsAt(survey) ?? now;
}
