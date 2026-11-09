/**
 * Finishing a climate survey (by hand, on its end date or once everyone has
 * answered): results to leaders (Modelo 1) and the closing report to admins
 * (Modelo 3), each once. Leaders are only emailed once the survey has closed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;
const sendEmail = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));
vi.mock("@/lib/queries/climate-reports", () => ({ loadSurveyForScoring: vi.fn(async () => ({ id: "survey-1", anonymityThreshold: 5 })) }));
const evaluateAndNotifyPlanOutcomes = vi.fn(async () => 0);
vi.mock("@/lib/queries/action-plans", () => ({
  evaluateAndNotifyPlanOutcomes: (...args: unknown[]) => evaluateAndNotifyPlanOutcomes(...(args as [])),
  leaderIdsOf: () => ["lina", "nora", "marco"],
  // Lina has a gap, Marco none, Nora's team is too small to show
  leaderGaps: (_s: unknown, id: string, min: number) =>
    id === "nora"
      ? { suppressed: true, gaps: [], required: 0 }
      : id === "lina"
        ? { suppressed: false, gaps: [{ dimensionId: "d1" }], required: Math.min(min, 1) }
        : { suppressed: false, gaps: [], required: 0 },
}));
vi.mock("@/lib/climate/leader-links", () => ({
  getLeaderLink: vi.fn(async (e: { id: string }) => `https://app.test/portal/verify/${e.id}-token`),
}));

import {
  finishIfEveryoneAnswered,
  finishSurvey,
  finishSurveysPastEndDate,
  isPastEndDate,
  sendLeaderResultsEmails,
} from "@/lib/climate/survey-finish";

const NOW = new Date("2026-12-10T15:00:00Z");
let survey: Record<string, unknown>;

const employees: Record<string, { name: string; email: string }> = {
  lina: { name: "Lina Pérez", email: "lina@acme.com" },
  nora: { name: "Nora Díaz", email: "nora@acme.com" },
  marco: { name: "Marco Ruiz", email: "marco@acme.com" },
};

/** A survey row that conditional updates really check, like the database would. */
function wireSurvey(overrides: Record<string, unknown> = {}) {
  survey = {
    id: "survey-1",
    companyId: "company-1",
    name: "Clima 2026",
    status: "ACTIVE",
    instrumentVersion: "v1",
    anonymityThreshold: 5,
    resultsReleasedAt: null,
    resultsEmailedAt: null,
    closingReportSentAt: null,
    closedAt: null,
    reportToken: null,
    planMinPerLeader: 1,
    planDueDate: new Date("2026-12-22T00:00:00Z"),
    followUpUserIds: ["hr-1"],
    followUpEmails: [],
    ...overrides,
  };
  const read = async () => ({ ...survey, company: { name: "Acme", locale: "es" } });
  mockPrisma.climateSurvey.findFirst.mockImplementation(read);
  mockPrisma.climateSurvey.findUnique.mockImplementation(read);
  mockPrisma.climateSurvey.findUniqueOrThrow.mockImplementation(read);
  mockPrisma.climateSurvey.updateMany.mockImplementation(
    async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      for (const [key, value] of Object.entries(where)) {
        if (key !== "id" && key !== "companyId" && survey[key] !== value) return { count: 0 };
      }
      Object.assign(survey, data);
      return { count: 1 };
    },
  );
}

const emailsTo = (to: string) => sendEmail.mock.calls.map(([o]) => o).filter((o) => o.to === to);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  sendEmail.mockResolvedValue({ success: true });
  wireSurvey();
  mockPrisma.employee.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
    employees[where.id] ? { id: where.id, companyId: "company-1", ...employees[where.id] } : null,
  );
  mockPrisma.surveyResponse.count.mockImplementation(async ({ where }: { where: { isComplete?: boolean } }) =>
    where.isComplete === true ? 45 : where.isComplete === false ? 15 : 60,
  );
  mockPrisma.companyUser.findMany.mockResolvedValue([
    { user: { email: "carlos@acme.com", name: "Carlos Ruiz", firstName: null } },
    // The same person twice (two memberships) gets one email
    { user: { email: "CARLOS@acme.com", name: "Carlos Ruiz", firstName: null } },
    { user: { email: "maria@acme.com", name: "María José Rojas", firstName: "María José" } },
  ]);
  mockPrisma.user.findMany.mockResolvedValue([{ name: "Ana Gómez", email: "ana@acme.com" }]);
  mockPrisma.platformSetting.findUnique.mockResolvedValue({ value: "Consultores Kultiva" });
});

describe("finishSurvey", () => {
  it("closes the survey, releases results and emails leaders and admins once each", async () => {
    const result = await finishSurvey("survey-1", "company-1", NOW);

    expect(result.closed).toBe(true);
    expect(survey).toMatchObject({ status: "CLOSED", closedAt: NOW, resultsReleasedAt: NOW, resultsEmailedAt: NOW, closingReportSentAt: NOW });
    expect(evaluateAndNotifyPlanOutcomes).toHaveBeenCalledWith("survey-1", "company-1");

    // Modelo 1: every leader with a visible report, the plans block only with gaps
    const [lina] = emailsTo("lina@acme.com");
    expect(lina.subject).toBe("Ya puedes ver los resultados de tu equipo y registrar tu plan de acción — Clima 2026");
    expect(lina.text).toContain("Hola Lina:");
    expect(lina.text).toContain("Ana Gómez será notificado");
    expect(lina.text).toContain("22 de diciembre de 2026");
    expect(lina.text).toContain("https://app.test/portal/verify/lina-token");
    expect(lina.text).toContain("Consultores Kultiva · Kultiva SAS");
    expect(lina).toMatchObject({ fromName: "Kultiva Encuestas", replyTo: "comercial@kultiva.com.co" });
    expect(emailsTo("marco@acme.com")[0].subject).toBe("Ya puedes ver los resultados de tu equipo — Clima 2026");
    expect(emailsTo("nora@acme.com")).toHaveLength(0);

    // Modelo 3: each admin once, with the shared report link
    expect(emailsTo("carlos@acme.com")).toHaveLength(1);
    const [maria] = emailsTo("maria@acme.com");
    expect(maria.text).toContain("Hola María José:");
    expect(maria.text).toContain("45 de 60 personas respondieron (75 %).");
    expect(maria.text).toContain(`/climate-report/shared/${survey.reportToken}`);
    expect(maria.text).toContain("El 10 de diciembre cada líder recibió su enlace personal");
    expect(maria.text).toContain("Recibirás un correo en ana@acme.com");
    expect(String(survey.reportToken).length).toBeGreaterThanOrEqual(24);
    expect(sendEmail).toHaveBeenCalledTimes(4);
  });

  it("does nothing the second time, or for a survey that isn't active", async () => {
    await finishSurvey("survey-1", "company-1", NOW);
    sendEmail.mockClear();

    expect((await finishSurvey("survey-1", "company-1", NOW)).closed).toBe(false);
    // A release racing the close can't send the results again either
    expect((await sendLeaderResultsEmails("survey-1", "company-1", NOW)).claimed).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the release and plan deadline an admin already set", async () => {
    const releasedAt = new Date("2026-12-01T12:00:00Z");
    wireSurvey({ resultsReleasedAt: releasedAt, resultsEmailedAt: releasedAt });
    await finishSurvey("survey-1", "company-1", NOW);

    expect(survey.resultsReleasedAt).toBe(releasedAt);
    expect(emailsTo("lina@acme.com")).toHaveLength(0); // already had their results
    expect(emailsTo("maria@acme.com")[0].text).toContain("El 1 de diciembre cada líder recibió");
  });

  it("emails the leaders at the close when results were released while it was active", async () => {
    const releasedAt = new Date("2026-12-01T12:00:00Z");
    wireSurvey({ resultsReleasedAt: releasedAt });
    const result = await finishSurvey("survey-1", "company-1", NOW);

    // The earlier release and its deadline stay; the email goes out now
    expect(survey).toMatchObject({ status: "CLOSED", resultsReleasedAt: releasedAt, resultsEmailedAt: NOW });
    expect(result.leaderEmails.sent).toBe(2);
    expect(emailsTo("lina@acme.com")).toHaveLength(1);
    expect(emailsTo("marco@acme.com")).toHaveLength(1);
    expect(emailsTo("maria@acme.com")[0].text).toContain("El 10 de diciembre cada líder recibió");
  });

  it("sets the default plan deadline when leaders get their email: 15 days after the close", async () => {
    // Released while active: no deadline until the results email goes out
    wireSurvey({ resultsReleasedAt: new Date("2026-12-01T12:00:00Z"), planDueDate: null });
    await finishSurvey("survey-1", "company-1", NOW);

    expect(survey.planDueDate).toEqual(new Date("2026-12-25T00:00:00Z"));
    expect(emailsTo("lina@acme.com")[0].text).toContain("25 de diciembre de 2026");
  });

  it("undoes the results email when every send failed, so it can be retried", async () => {
    sendEmail.mockImplementation(async ({ to }: { to: string }) => {
      if (to !== "lina@acme.com" && to !== "marco@acme.com") return { success: true };
      throw new Error("provider down");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await finishSurvey("survey-1", "company-1", NOW);
    spy.mockRestore();

    expect(result.leaderEmails.sent).toBe(0);
    expect(survey.resultsEmailedAt).toBeNull();
    // The admins aren't told the leaders got it
    expect(emailsTo("maria@acme.com")[0].text).not.toContain("cada líder recibió");
  });

  it("just closes a survey without the validated instrument", async () => {
    wireSurvey({ instrumentVersion: null });
    expect((await finishSurvey("survey-1", "company-1", NOW)).closed).toBe(true);
    expect(survey.status).toBe("CLOSED");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips a leader with an empty field and still emails the rest", async () => {
    employees.marco.name = " ";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await finishSurvey("survey-1", "company-1", NOW);
    spy.mockRestore();
    employees.marco.name = "Marco Ruiz";

    expect(result.leaderEmails.skipped).toEqual([{ name: " ", reason: "missing nombre_lider" }]);
    expect(emailsTo("lina@acme.com")).toHaveLength(1);
  });
});

describe("sendLeaderResultsEmails", () => {
  it("waits for the close: released results of an active survey email nobody", async () => {
    wireSurvey({ resultsReleasedAt: new Date("2026-12-01T12:00:00Z") });

    const early = await sendLeaderResultsEmails("survey-1", "company-1", NOW);
    expect(early.claimed).toBe(false);
    expect(survey.resultsEmailedAt).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();

    survey.status = "CLOSED";
    expect((await sendLeaderResultsEmails("survey-1", "company-1", NOW)).sent).toBe(2);
    // Claimed once: a second run (a double click, the close racing it) sends nothing
    expect((await sendLeaderResultsEmails("survey-1", "company-1", NOW)).claimed).toBe(false);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("only claims the email for a closed survey", async () => {
    wireSurvey({ status: "CLOSED", resultsReleasedAt: NOW });
    await sendLeaderResultsEmails("survey-1", "company-1", NOW);
    expect(mockPrisma.climateSurvey.updateMany).toHaveBeenCalledWith({
      where: { id: "survey-1", status: "CLOSED", resultsEmailedAt: null },
      data: { resultsEmailedAt: NOW },
    });
  });

  it("does nothing before results are released", async () => {
    wireSurvey({ status: "CLOSED" });
    expect((await sendLeaderResultsEmails("survey-1", "company-1", NOW)).claimed).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("finishIfEveryoneAnswered", () => {
  it("waits while someone hasn't answered", async () => {
    expect(await finishIfEveryoneAnswered("survey-1", "company-1")).toBe(false);
    expect(survey.status).toBe("ACTIVE");
  });

  it("closes when every invited person has answered", async () => {
    mockPrisma.surveyResponse.count.mockImplementation(async ({ where }: { where: { isComplete?: boolean } }) =>
      where.isComplete === false ? 0 : 60,
    );
    expect(await finishIfEveryoneAnswered("survey-1", "company-1")).toBe(true);
    expect(survey.status).toBe("CLOSED");
    expect(emailsTo("lina@acme.com")).toHaveLength(1);
  });
});

describe("isPastEndDate", () => {
  const due = (day: string) => ({ accessEndDate: null, closedAt: null, distributions: [{ dueDate: new Date(`${day}T00:00:00Z`) }] });

  it("closes the day after the last due date, in business time", () => {
    // 18:00 in Bogotá on the due day: still open
    expect(isPastEndDate(due("2026-12-09"), new Date("2026-12-09T23:00:00Z"))).toBe(false);
    expect(isPastEndDate(due("2026-12-09"), new Date("2026-12-10T13:00:00Z"))).toBe(true);
    expect(isPastEndDate({ accessEndDate: null, closedAt: null, distributions: [] }, NOW)).toBe(false);
  });

  it("uses the access end date, a moment, when there is one", () => {
    const at = (end: string) => ({ accessEndDate: new Date(end), closedAt: null, distributions: [] });
    expect(isPastEndDate(at("2026-12-10T14:00:00Z"), NOW)).toBe(true);
    expect(isPastEndDate(at("2026-12-10T16:00:00Z"), NOW)).toBe(false);
  });

  it("leaves a reopened survey open until its end date moves past the last close", () => {
    const reopened = { ...due("2026-12-05"), closedAt: new Date("2026-12-06T13:00:00Z") };
    expect(isPastEndDate(reopened, NOW)).toBe(false);
    expect(isPastEndDate({ ...reopened, distributions: [{ dueDate: new Date("2026-12-09T00:00:00Z") }] }, NOW)).toBe(true);
  });

  it("ignores surveys that ended long ago", () => {
    expect(isPastEndDate(due("2026-11-20"), NOW)).toBe(false);
  });
});

describe("finishSurveysPastEndDate", () => {
  it("closes only the active surveys past their end date", async () => {
    mockPrisma.climateSurvey.findMany.mockResolvedValue([
      { id: "survey-1", companyId: "company-1", accessEndDate: null, closedAt: null, distributions: [{ dueDate: new Date("2026-12-09T00:00:00Z") }] },
      { id: "survey-2", companyId: "company-1", accessEndDate: null, closedAt: null, distributions: [{ dueDate: new Date("2026-12-20T00:00:00Z") }] },
    ]);
    expect(await finishSurveysPastEndDate(NOW)).toEqual({ checked: 2, closed: 1 });
    expect(mockPrisma.climateSurvey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "survey-1", companyId: "company-1", status: "ACTIVE" } }),
    );
  });

  it("emails the leaders of a survey whose results were released before its end date", async () => {
    wireSurvey({ resultsReleasedAt: new Date("2026-12-01T12:00:00Z") });
    mockPrisma.climateSurvey.findMany.mockResolvedValue([
      { id: "survey-1", companyId: "company-1", accessEndDate: null, closedAt: null, distributions: [{ dueDate: new Date("2026-12-09T00:00:00Z") }] },
    ]);
    await finishSurveysPastEndDate(NOW);
    expect(survey.resultsEmailedAt).toBe(NOW);
    expect(emailsTo("lina@acme.com")).toHaveLength(1);
  });
});
