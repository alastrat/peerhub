/**
 * Modelo 2 (plan reminder on the survey's reminder date) and the leader's
 * personal link, reusable for six months.
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
vi.mock("@/lib/queries/action-plans", () => ({
  SUBMITTED_PLAN_STATUSES: ["ACTIVE", "COMPLETED"],
  evaluateAndNotifyPlanOutcomes: vi.fn(),
  leaderIdsOf: () => ["lina", "marco"],
  leaderGaps: () => ({ suppressed: false, gaps: [{ dimensionId: "d1" }], required: 1 }),
}));

import { getLeaderLink, LEADER_LINK_DAYS } from "@/lib/climate/leader-links";
import { planReminderDay, sendPlanDeadlineReminders } from "@/lib/queries/action-plan-reminders";

const DAY = 24 * 60 * 60 * 1000;
const lina = { id: "lina", email: "lina@acme.com", companyId: "company-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  sendEmail.mockResolvedValue({ success: true });
  mockPrisma.platformSetting.findUnique.mockResolvedValue(null);
});

describe("getLeaderLink", () => {
  const now = new Date("2026-12-10T15:00:00Z");

  it("reuses the leader's token while it has more than a month left", async () => {
    mockPrisma.accessToken.findFirst.mockResolvedValue({ token: "kept" });
    const link = await getLeaderLink(lina, "survey-1", now);

    expect(link).toMatch(/\/portal\/verify\/kept\?redirect=%2Fportal%2Fclimate-results%2Fsurvey-1$/);
    expect(mockPrisma.accessToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: "lina", purpose: "LEADER_LINK", expiresAt: { gt: new Date(now.getTime() + 30 * DAY) } }),
      }),
    );
    expect(mockPrisma.accessToken.create).not.toHaveBeenCalled();
  });

  it("creates a six-month token otherwise", async () => {
    mockPrisma.accessToken.findFirst.mockResolvedValue(null);
    mockPrisma.accessToken.create.mockResolvedValue({ token: "fresh" });
    expect(await getLeaderLink(lina, "survey-1", now)).toContain("/portal/verify/fresh?");
    expect(mockPrisma.accessToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ purpose: "LEADER_LINK", employeeId: "lina", expiresAt: new Date(now.getTime() + LEADER_LINK_DAYS * DAY) }),
      select: { token: true },
    });
    expect(LEADER_LINK_DAYS).toBe(180);
  });
});

describe("planReminderDay", () => {
  it("is the survey's reminder date, else 3 days before the deadline", () => {
    const planDueDate = new Date("2026-12-22T00:00:00Z");
    expect(planReminderDay({ planDueDate, planReminderDate: null })).toBe("2026-12-19");
    expect(planReminderDay({ planDueDate, planReminderDate: new Date("2026-12-15T00:00:00Z") })).toBe("2026-12-15");
  });
});

describe("sendPlanDeadlineReminders (Modelo 2)", () => {
  function wire(planReminderDate: Date | null) {
    mockPrisma.climateSurvey.findMany.mockResolvedValue([
      {
        id: "survey-1",
        name: "Clima 2026",
        companyId: "company-1",
        planDueDate: new Date("2026-12-22T00:00:00Z"),
        planReminderDate,
        planMinPerLeader: 1,
        company: { locale: "es" },
      },
    ]);
    // Lina hasn't submitted; Marco has
    mockPrisma.actionPlan.count.mockImplementation(async ({ where }: { where: { scopeRefId: string } }) =>
      where.scopeRefId === "marco" ? 1 : 0,
    );
    mockPrisma.employee.findFirst.mockResolvedValue({ ...lina, name: "Lina Pérez" });
    mockPrisma.accessToken.findFirst.mockResolvedValue({ token: "kept" });
  }

  it("skips a leader without an email", async () => {
    wire(new Date("2026-12-15T00:00:00Z"));
    mockPrisma.employee.findFirst.mockResolvedValue({ ...lina, name: "Lina Pérez", email: null });
    expect(await sendPlanDeadlineReminders(new Date("2026-12-15T13:00:00Z"))).toEqual({ surveys: 1, emails: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(mockPrisma.accessToken.create).not.toHaveBeenCalled();
  });

  it("waits for the reminder day", async () => {
    wire(new Date("2026-12-15T00:00:00Z"));
    expect(await sendPlanDeadlineReminders(new Date("2026-12-14T15:00:00Z"))).toEqual({ surveys: 0, emails: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
  });

  it("reminds the leaders still short of plans, once", async () => {
    wire(new Date("2026-12-15T00:00:00Z"));
    const now = new Date("2026-12-15T13:00:00Z");
    expect(await sendPlanDeadlineReminders(now)).toEqual({ surveys: 1, emails: 1 });

    const [email] = sendEmail.mock.calls.map(([o]) => o);
    expect(email.to).toBe("lina@acme.com");
    expect(email.subject).toBe("Recordatorio: tu plan de acción de Clima 2026 vence el 22 de diciembre de 2026");
    expect(email.text).toContain("/portal/verify/kept?");
    expect(email.text).toContain("Equipo Kultiva · Kultiva SAS");
    expect(email).toMatchObject({ fromName: "Kultiva Encuestas", replyTo: "comercial@kultiva.com.co" });
    expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({ where: { id: "survey-1" }, data: { planReminderSentAt: now } });
    // Only surveys not reminded yet, whose deadline hasn't passed, and never
    // before the leaders got their results email (Modelo 1, at the close)
    expect(mockPrisma.climateSurvey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planReminderSentAt: null,
          resultsEmailedAt: { not: null },
          planDueDate: { gte: new Date("2026-12-15T00:00:00Z") },
        }),
      }),
    );
  });
});
