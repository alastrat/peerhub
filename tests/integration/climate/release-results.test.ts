/**
 * Releasing results to leaders: they see them right away, but their results
 * email (Modelo 1) only goes out once the survey has closed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import type { ClimateActor } from "@/lib/auth/climate-actor";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

const admin: ClimateActor = { kind: "admin", companyId: "company-1", userId: "user-1", employeeId: null, name: "Ana" };
vi.mock("@/lib/auth/climate-actor", () => ({
  getClimateActor: vi.fn(async () => admin),
  requireClimateActor: vi.fn(async () => admin),
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));

const sendLeaderResultsEmails = vi.hoisted(() =>
  vi.fn(async () => ({ sent: 2, skipped: [], claimed: true, leaders: 3, leadersWithGaps: 1 })),
);
vi.mock("@/lib/climate/survey-finish", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/climate/survey-finish")>()),
  sendLeaderResultsEmails,
}));

import { releaseSurveyResults, sendSurveyResultsEmails } from "@/lib/actions/action-plans";

let survey: Record<string, unknown>;

function wireSurvey(overrides: Record<string, unknown> = {}) {
  survey = {
    id: "survey-1",
    name: "Clima 2026",
    status: "ACTIVE",
    instrumentVersion: "v1",
    resultsReleasedAt: null,
    resultsEmailedAt: null,
    planDueDate: null,
    planMinPerLeader: 1,
    ...overrides,
  };
  mockPrisma.climateSurvey.findFirst.mockImplementation(async () => ({ ...survey }));
  mockPrisma.climateSurvey.updateMany.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    Object.assign(survey, data);
    return { count: 1 };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockPrisma.company.findUnique.mockResolvedValue({ locale: "es" });
  wireSurvey();
});

describe("releaseSurveyResults", () => {
  it("releases an active survey's results without emailing the leaders yet", async () => {
    const res = await releaseSurveyResults("survey-1");

    expect(res).toEqual({ success: true, data: { leaders: 0, leadersWithGaps: 0, emailed: 0, emailOnClose: true } });
    expect(survey.resultsReleasedAt).toBeInstanceOf(Date);
    expect(survey.planDueDate).toBeInstanceOf(Date);
    expect(sendLeaderResultsEmails).not.toHaveBeenCalled();
  });

  it("emails the leaders right away for a closed survey", async () => {
    wireSurvey({ status: "CLOSED" });
    const res = await releaseSurveyResults("survey-1");

    expect(res).toEqual({ success: true, data: { leaders: 3, leadersWithGaps: 1, emailed: 2, emailOnClose: false } });
    expect(sendLeaderResultsEmails).toHaveBeenCalledWith("survey-1", "company-1", survey.resultsReleasedAt);
  });
});

describe("sendSurveyResultsEmails", () => {
  it("refuses while the survey is still active: the close sends it", async () => {
    wireSurvey({ resultsReleasedAt: new Date() });
    expect((await sendSurveyResultsEmails("survey-1")).error).toBe(
      "Los líderes reciben el correo de resultados cuando se cierra la encuesta",
    );
    expect(sendLeaderResultsEmails).not.toHaveBeenCalled();
  });

  it("sends it for a closed survey whose email didn't go out", async () => {
    wireSurvey({ status: "CLOSED", resultsReleasedAt: new Date() });
    expect(await sendSurveyResultsEmails("survey-1")).toEqual({ success: true, data: { emailed: 2 } });
    expect(sendLeaderResultsEmails).toHaveBeenCalledWith("survey-1", "company-1");
  });

  it("refuses when it already went out", async () => {
    wireSurvey({ status: "CLOSED", resultsReleasedAt: new Date(), resultsEmailedAt: new Date() });
    expect((await sendSurveyResultsEmails("survey-1")).error).toBe("El correo de resultados ya se envió");
  });
});
