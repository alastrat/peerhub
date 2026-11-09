import { describe, it, expect } from "vitest";
import { answerWindowError, answerWindowState } from "@/lib/climate/answer-window";

const start = new Date("2026-11-10T13:00:00Z");
const end = new Date("2026-11-20T22:00:00Z");
const survey = { status: "ACTIVE", accessStartDate: start, accessEndDate: end };

describe("answerWindowState", () => {
  it("is open between the start and the end", () => {
    expect(answerWindowState(survey, new Date("2026-11-15T12:00:00Z"))).toBe("open");
    expect(answerWindowState(survey, start)).toBe("open");
  });

  it("isn't open before the start, nor from the end on", () => {
    expect(answerWindowState(survey, new Date("2026-11-10T12:59:00Z"))).toBe("not_started");
    expect(answerWindowState(survey, end)).toBe("ended");
  });

  it("has no limits without dates, but needs an active survey", () => {
    const open = { status: "ACTIVE", accessStartDate: null, accessEndDate: null };
    expect(answerWindowState(open, new Date())).toBe("open");
    expect(answerWindowState({ ...open, status: "CLOSED" }, new Date())).toBe("not_active");
    expect(answerWindowState({ ...open, status: "DRAFT" }, new Date())).toBe("not_active");
  });
});

describe("answerWindowError", () => {
  it("names the reason, or null when open", () => {
    expect(answerWindowError(survey, new Date("2026-11-15T12:00:00Z"))).toBeNull();
    expect(answerWindowError(survey, new Date("2026-11-01T00:00:00Z"))).toBe("survey_not_started");
    expect(answerWindowError(survey, new Date("2026-11-21T00:00:00Z"))).toBe("survey_ended");
  });
});
