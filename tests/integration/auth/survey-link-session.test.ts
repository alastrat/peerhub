// @vitest-environment node
/**
 * A session opened by a personal survey link reaches only its survey: it
 * can answer that distribution, and every other portal page and action
 * sees nobody signed in. Real JWTs, a cookie jar in memory.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;
const jar = new Map<string, string>();

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
  })),
  // Posted from a portal page
  headers: vi.fn(async () => new Map([["referer", "http://localhost/portal/climate-survey/dist-1"]])),
}));
vi.mock("next/server", () => ({
  after: vi.fn(),
  NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, { status: init?.status ?? 200 }) },
}));
vi.mock("@/lib/climate/survey-finish", () => ({ finishIfEveryoneAnswered: vi.fn() }));

import { createPortalSession, getPortalSession } from "@/lib/auth/portal-session";
import { saveSurveyDraft } from "@/lib/actions/climate-responses";
import { getClimateActor } from "@/lib/auth/climate-actor";
import { POST as saveDraftBeacon } from "@/app/api/climate-survey/save-draft/route";

beforeEach(async () => {
  jar.clear();
  mockPrisma = createMockPrisma();
  mockPrisma.employee.findUnique.mockResolvedValue({ id: "emp-1", name: "Jhon", companyId: "company-1", isActive: true });
  mockPrisma.surveyDistribution.findUnique.mockResolvedValue({
    id: "dist-1",
    survey: {
      companyId: "company-1",
      status: "ACTIVE",
      accessStartDate: null,
      accessEndDate: null,
      closedAt: null,
      questions: [{ id: "q-1", type: "TEXT", config: null }],
    },
  });
  mockPrisma.surveyResponse.findFirst.mockResolvedValue({ id: "resp-1", isComplete: false });
  await createPortalSession("emp-1", "company-1", null, { distributionId: "dist-1", expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) });
});

describe("a survey link's session", () => {
  it("can save answers to its own survey", async () => {
    expect(await saveSurveyDraft({ distributionId: "dist-1", answers: [] })).toMatchObject({ success: true });
  });

  it("can save its draft from the page-unload beacon too", async () => {
    const res = await saveDraftBeacon(
      new Request("http://localhost/api/climate-survey/save-draft", {
        method: "POST",
        body: JSON.stringify({ distributionId: "dist-1", answers: [{ questionId: "q-1", textValue: "Hola" }] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.surveyAnswer.upsert).toHaveBeenCalled();
  });

  it("can't answer another survey", async () => {
    const result = await saveSurveyDraft({ distributionId: "dist-2", answers: [] });
    expect(result.success).toBe(false);
    expect(mockPrisma.surveyResponse.findFirst).not.toHaveBeenCalled();
  });

  it("gives no access to results, plans or anything else in the portal", async () => {
    expect(await getPortalSession()).toBeNull();
    // Leader results, plans and tasks go through the climate actor
    expect(await getClimateActor()).toBeNull();
  });

  it("a regular sign-in still reaches everything", async () => {
    await createPortalSession("emp-1", "company-1", "jhon@acme.com");
    expect(await getPortalSession()).toMatchObject({ employeeId: "emp-1", surveyDistributionId: null });
    expect(await getClimateActor()).toMatchObject({ kind: "employee", employeeId: "emp-1" });
  });
});
