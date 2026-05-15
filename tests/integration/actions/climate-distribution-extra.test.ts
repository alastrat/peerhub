/**
 * Extra tests for climate-distribution: warning branch when some emails fail,
 * the reactivateSurvey lifecycle action, and the early-exit when the survey
 * was already in a non-DRAFT state (status update path is skipped).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const sendBulkEmailsMock = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendBulkEmails: (...args: unknown[]) => sendBulkEmailsMock(...args),
}));

vi.mock("@/lib/email/portal-templates", () => ({
  buildSurveyInvitationEmail: vi.fn(() => ({
    subject: "subj",
    html: "<p>x</p>",
    text: "x",
  })),
}));

import {
  distributeSurvey,
  reactivateSurvey,
} from "@/lib/actions/climate-distribution";

const baseSurvey = {
  id: "s1",
  companyId: "company-1",
  isAnonymous: false,
  status: "DRAFT",
  name: "Climate Survey Q1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const baseDueDate = new Date("2026-04-01");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession();
  sendBulkEmailsMock.mockReset();
});

describe("distributeSurvey — warning + lifecycle edge cases", () => {
  it("returns success with a warning when some emails failed to send", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "e1", name: "Alice", email: "alice@acme.com" },
      { id: "e2", name: "Bob", email: "bob@acme.com" },
      { id: "e3", name: "Carol", email: "carol@acme.com" },
    ]);
    mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
    mockPrisma.climateSurvey.update.mockResolvedValue({});
    sendBulkEmailsMock.mockResolvedValue({ failureCount: 2 });

    const result = await distributeSurvey({
      surveyId: "s1",
      targetType: "ALL",
      dueDate: baseDueDate,
    });

    expect(result.success).toBe(true);
    expect(result.warning).toContain("2 email notification(s) failed");
    expect(result.warning).toContain("3 employees");
  });

  it("does NOT flip status when survey is already ACTIVE", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      status: "ACTIVE",
    });
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "e1", name: "A", email: "a@acme.com" },
    ]);
    mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
    sendBulkEmailsMock.mockResolvedValue({ failureCount: 0 });

    const result = await distributeSurvey({
      surveyId: "s1",
      targetType: "ALL",
      dueDate: baseDueDate,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
  });
});

describe("reactivateSurvey", () => {
  it("reactivates a CLOSED survey back to ACTIVE", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      status: "CLOSED",
    });
    mockPrisma.climateSurvey.update.mockResolvedValue({});

    const result = await reactivateSurvey("s1");

    expect(result.success).toBe(true);
    expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "ACTIVE" },
    });
  });

  it("returns error when survey not found", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);
    const result = await reactivateSurvey("nope");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey not found");
  });

  it("rejects non-CLOSED surveys with the 'Only closed surveys' error", async () => {
    for (const status of ["DRAFT", "ACTIVE", "ARCHIVED"]) {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...baseSurvey,
        status,
      });
      const result = await reactivateSurvey("s1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Only closed surveys can be reactivated");
    }
  });

  it("rejects non-admins", async () => {
    mockSession = createMemberSession();
    const result = await reactivateSurvey("s1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("handles DB errors gracefully", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      status: "CLOSED",
    });
    mockPrisma.climateSurvey.update.mockRejectedValue(new Error("boom"));

    const result = await reactivateSurvey("s1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("boom");
  });
});
