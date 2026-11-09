/**
 * Personal survey links for people without a corporate email: single use,
 * expiry, company scoping, and the "Comenzar" action that signs in.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(() => Promise.resolve(mockSession)) }));
const createPortalSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/portal-session", () => ({ createPortalSession, getPortalSession: vi.fn(async () => null) }));

import { consumeSurveyLink, createSurveyLinks, describeSurveyLink, surveyLinkExpiry } from "@/lib/climate/survey-links";
import { createSurveyLink, createSurveyLinksWithoutEmail, openSurveyLink } from "@/lib/actions/survey-links";

const NOW = new Date("2026-11-10T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

// Two companies: survey s1 (Acme, distributions d1 then d2) and sB (Beta)
let surveys: Record<string, { id: string; companyId: string; name: string; status: string; accessEndDate: Date | null }>;
let companies: Record<string, { name: string; isActive: boolean }>;
const distributions: Record<string, { surveyId: string; createdAt: Date; dueDate: Date }> = {
  d1: { surveyId: "s1", createdAt: new Date("2026-11-01"), dueDate: new Date("2026-11-20T00:00:00Z") },
  d2: { surveyId: "s1", createdAt: new Date("2026-11-05"), dueDate: new Date("2026-11-25T00:00:00Z") },
  dB: { surveyId: "sB", createdAt: new Date("2026-11-01"), dueDate: new Date("2026-11-25T00:00:00Z") },
};
let employees: Record<string, { id: string; companyId: string; name: string; email: string | null; phone: string | null; nationalId: string; isActive: boolean }>;
// Who was invited where
const responses = [
  { employeeId: "ana", distributionId: "d1" },
  { employeeId: "ana", distributionId: "d2" },
  { employeeId: "beto", distributionId: "d1" },
  { employeeId: "carla", distributionId: "d1" },
  { employeeId: "bea", distributionId: "dB" },
];
type Token = {
  id: string;
  token: string;
  email: string | null;
  companyId: string;
  employeeId: string;
  distributionId: string | null;
  purpose: string;
  expiresAt: Date;
  usedAt: Date | null;
};
let tokens: Token[];

function wire() {
  surveys = {
    s1: { id: "s1", companyId: "acme", name: "Clima 2026", status: "ACTIVE", accessEndDate: null },
    sB: { id: "sB", companyId: "beta", name: "Clima Beta", status: "ACTIVE", accessEndDate: null },
  };
  companies = { acme: { name: "Acme", isActive: true }, beta: { name: "Beta", isActive: true } };
  employees = {
    ana: { id: "ana", companyId: "acme", name: "Ana María Gómez", email: null, phone: "3001234567", nationalId: "101", isActive: true },
    beto: { id: "beto", companyId: "acme", name: "Beto Ruiz", email: "beto@acme.com", phone: null, nationalId: "102", isActive: true },
    carla: { id: "carla", companyId: "acme", name: "Carla Díaz", email: null, phone: null, nationalId: "103", isActive: true },
    bea: { id: "bea", companyId: "beta", name: "Bea Soto", email: null, phone: null, nationalId: "201", isActive: true },
  };
  tokens = [];

  mockPrisma.climateSurvey.findFirst.mockImplementation(async ({ where }: { where: { id: string; companyId: string } }) => {
    const s = surveys[where.id];
    return s && s.companyId === where.companyId ? { ...s, company: { isActive: companies[s.companyId].isActive } } : null;
  });
  mockPrisma.surveyResponse.findMany.mockImplementation(
    async ({ where }: { where: { employeeId?: { in: string[] }; employee: { companyId: string; email?: null }; distribution: { surveyId: string; survey?: { companyId: string } } } }) =>
      responses
        .filter((r) => !where.employeeId || where.employeeId.in.includes(r.employeeId))
        .filter((r) => distributions[r.distributionId].surveyId === where.distribution.surveyId)
        .filter(() => !where.distribution.survey || surveys[where.distribution.surveyId]?.companyId === where.distribution.survey.companyId)
        .filter((r) => employees[r.employeeId].companyId === where.employee.companyId && employees[r.employeeId].isActive)
        .filter((r) => !("email" in where.employee) || employees[r.employeeId].email === null)
        .sort((a, b) => distributions[b.distributionId].createdAt.getTime() - distributions[a.distributionId].createdAt.getTime())
        .map((r) => ({ ...r, distribution: { dueDate: distributions[r.distributionId].dueDate }, employee: employees[r.employeeId] })),
  );
  mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  mockPrisma.accessToken.deleteMany.mockImplementation(
    async ({ where }: { where: { companyId: string; usedAt: null; employeeId: { in: string[] }; distribution: { surveyId: string } } }) => {
      const before = tokens.length;
      tokens = tokens.filter(
        (t) =>
          !(
            t.purpose === "SURVEY_LINK" &&
            t.companyId === where.companyId &&
            t.usedAt === null &&
            where.employeeId.in.includes(t.employeeId) &&
            t.distributionId &&
            distributions[t.distributionId].surveyId === where.distribution.surveyId
          ),
      );
      return { count: before - tokens.length };
    },
  );
  mockPrisma.accessToken.createMany.mockImplementation(async ({ data }: { data: Omit<Token, "id" | "usedAt">[] }) => {
    for (const d of data) tokens.push({ ...d, id: `t${tokens.length + 1}-${d.token.slice(0, 4)}`, usedAt: null });
    return { count: data.length };
  });
  mockPrisma.accessToken.findUnique.mockImplementation(async ({ where }: { where: { token: string } }) => {
    const t = tokens.find((x) => x.token === where.token);
    if (!t) return null;
    const dist = t.distributionId ? distributions[t.distributionId] : null;
    return {
      ...t,
      company: companies[t.companyId],
      employee: employees[t.employeeId],
      distribution: dist && { id: t.distributionId, survey: surveys[dist.surveyId] },
    };
  });
  mockPrisma.accessToken.updateMany.mockImplementation(
    async ({ where, data }: { where: { id: string; usedAt: null; expiresAt: { gt: Date } }; data: { usedAt: Date } }) => {
      const t = tokens.find((x) => x.id === where.id && x.usedAt === null && x.expiresAt > where.expiresAt.gt);
      if (!t) return { count: 0 };
      t.usedAt = data.usedAt;
      return { count: 1 };
    },
  );
}

const tokenOf = (url: string) => url.split("/portal/link/")[1];

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession("acme");
  wire();
});

describe("surveyLinkExpiry", () => {
  it("is the survey's access end, a moment", () => {
    const end = new Date(NOW.getTime() + 10 * DAY);
    expect(surveyLinkExpiry({ accessEndDate: end }, { dueDate: new Date("2027-01-01") }, NOW)).toEqual(end);
  });

  it("else the end of the due date in business time (Bogotá)", () => {
    expect(surveyLinkExpiry({ accessEndDate: null }, { dueDate: new Date("2026-11-20T00:00:00Z") }, NOW)).toEqual(
      new Date("2026-11-21T05:00:00Z"),
    );
  });

  it("is at most 30 days, and null once the survey ended", () => {
    expect(surveyLinkExpiry({ accessEndDate: null }, { dueDate: new Date("2027-03-01T00:00:00Z") }, NOW)).toEqual(
      new Date(NOW.getTime() + 30 * DAY),
    );
    expect(surveyLinkExpiry({ accessEndDate: new Date(NOW.getTime() - 1) }, { dueDate: new Date("2027-01-01") }, NOW)).toBeNull();
  });
});

describe("createSurveyLinks", () => {
  it("makes one link per person for their latest distribution", async () => {
    const [link] = await createSurveyLinks("acme", "s1", ["ana"], NOW);

    expect(link).toMatchObject({ employeeId: "ana", name: "Ana María Gómez", phone: "3001234567", expiresAt: new Date("2026-11-26T05:00:00Z") });
    expect(link.url).toMatch(/^http:\/\/localhost:4999\/portal\/link\/[A-Za-z0-9_-]{24}$/);
    expect(tokens).toEqual([
      expect.objectContaining({ purpose: "SURVEY_LINK", employeeId: "ana", companyId: "acme", distributionId: "d2", email: null, usedAt: null }),
    ]);
  });

  it("replaces the person's unused link, but leaves used ones and other people's", async () => {
    const [first] = await createSurveyLinks("acme", "s1", ["ana", "carla"], NOW);
    const used = (await createSurveyLinks("acme", "s1", ["carla"], NOW))[0];
    await consumeSurveyLink(tokenOf(used.url), NOW);

    const [second] = await createSurveyLinks("acme", "s1", ["ana", "carla"], NOW);
    expect((await describeSurveyLink(tokenOf(first.url), NOW)).status).toBe("invalid");
    expect((await describeSurveyLink(tokenOf(second.url), NOW)).status).toBe("valid");
    expect((await describeSurveyLink(tokenOf(used.url), NOW)).status).toBe("used");
  });

  it("only for an active survey of the company, not ended, and its participants", async () => {
    await expect(createSurveyLinks("acme", "sB", ["bea"], NOW)).rejects.toThrow("survey_not_found");
    // Another company's person, even with the right survey
    await expect(createSurveyLinks("acme", "s1", ["bea"], NOW)).rejects.toThrow("survey_link_not_participant");

    surveys.s1.accessEndDate = new Date(NOW.getTime() - DAY);
    await expect(createSurveyLinks("acme", "s1", ["ana"], NOW)).rejects.toThrow("survey_link_ended");

    surveys.s1.status = "CLOSED";
    await expect(createSurveyLinks("acme", "s1", ["ana"], NOW)).rejects.toThrow("survey_link_not_active");
    surveys.s1.status = "ACTIVE";
    companies.acme.isActive = false;
    await expect(createSurveyLinks("acme", "s1", ["ana"], NOW)).rejects.toThrow("survey_link_not_active");
  });
});

describe("using a link", () => {
  it("works once: the second open says it was used", async () => {
    const [link] = await createSurveyLinks("acme", "s1", ["ana"], NOW);
    const token = tokenOf(link.url);

    // Looking at it (a chat app's preview) doesn't use it
    expect((await describeSurveyLink(token, NOW)).status).toBe("valid");
    expect((await describeSurveyLink(token, NOW)).status).toBe("valid");

    const first = await consumeSurveyLink(token, NOW);
    expect(first).toMatchObject({ status: "valid", employeeId: "ana", companyId: "acme", distributionId: "d2", email: null, firstName: "Ana" });
    expect((await consumeSurveyLink(token, NOW)).status).toBe("used");
  });

  it("stops working when it expires or the survey closes", async () => {
    const [link] = await createSurveyLinks("acme", "s1", ["ana"], NOW);
    const token = tokenOf(link.url);
    expect((await consumeSurveyLink(token, new Date("2026-11-26T05:00:01Z"))).status).toBe("expired");

    surveys.s1.status = "CLOSED";
    expect((await consumeSurveyLink(token, NOW)).status).toBe("closed");
    expect(tokens[0].usedAt).toBeNull();
  });

  it("never opens another company's survey", async () => {
    const [link] = await createSurveyLinks("acme", "s1", ["ana"], NOW);
    // A token made out for Acme pointing at Beta's distribution
    tokens[0].distributionId = "dB";
    expect((await consumeSurveyLink(tokenOf(link.url), NOW)).status).toBe("invalid");
    // Or a person moved to another company
    tokens[0].distributionId = "d2";
    employees.ana.companyId = "beta";
    expect((await consumeSurveyLink(tokenOf(link.url), NOW)).status).toBe("invalid");
  });

  it("ignores unknown tokens and other kinds of links", async () => {
    expect((await describeSurveyLink("nope", NOW)).status).toBe("invalid");
    tokens.push({ id: "x", token: "leader", email: "l@acme.com", companyId: "acme", employeeId: "beto", distributionId: null, purpose: "LEADER_LINK", expiresAt: new Date(NOW.getTime() + DAY), usedAt: null });
    expect((await describeSurveyLink("leader", NOW)).status).toBe("invalid");
  });
});

describe("actions", () => {
  // The actions use the current time
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("Comenzar signs the person into the portal and opens their survey", async () => {
    const [link] = await createSurveyLinks("acme", "s1", ["ana"]);
    await expect(openSurveyLink(tokenOf(link.url))).rejects.toThrow("REDIRECT:/portal/climate-survey/d2");
    expect(createPortalSession).toHaveBeenCalledWith("ana", "acme", null);

    // A used link goes back to its page, which explains, and signs nobody in
    createPortalSession.mockClear();
    await expect(openSurveyLink(tokenOf(link.url))).rejects.toThrow(`REDIRECT:/portal/link/${tokenOf(link.url)}`);
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it("only company admins create links, and only for their company's surveys", async () => {
    expect((await createSurveyLink("s1", "ana")).success).toBe(true);

    mockSession = createMemberSession("acme");
    expect(await createSurveyLink("s1", "ana")).toEqual({ success: false, error: "No tienes permiso para hacer esto" });

    mockSession = createAdminSession("beta");
    expect(await createSurveyLink("s1", "ana")).toEqual({ success: false, error: "No encontramos la encuesta" });
  });

  it("the CSV gets new links for everyone without an email", async () => {
    const result = await createSurveyLinksWithoutEmail("s1");
    expect(result.success).toBe(true);
    expect(result.data!.map((l) => l.employeeId)).toEqual(["ana", "carla"]);
  });
});
