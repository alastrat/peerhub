/**
 * Personal survey links for people without a corporate email: only for
 * them (and only before they answer), single use, expiry, company scoping,
 * and the "Comenzar" action that opens a survey-only session.
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
let distributions: Record<string, { surveyId: string; createdAt: Date; dueDate: Date }>;
let employees: Record<string, { id: string; companyId: string; name: string; email: string | null; phone: string | null; nationalId: string; isActive: boolean }>;
// Who was invited where. Beto has an email; Dani already answered.
let responses: { employeeId: string; distributionId: string; isComplete: boolean }[];
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

type ResponseWhere = {
  employeeId?: { in: string[] };
  isComplete: boolean;
  employee: { companyId: string; isActive: boolean; email: null };
  distribution: { surveyId: string };
};

function wire() {
  surveys = {
    s1: { id: "s1", companyId: "acme", name: "Clima 2026", status: "ACTIVE", accessEndDate: null },
    sB: { id: "sB", companyId: "beta", name: "Clima Beta", status: "ACTIVE", accessEndDate: null },
  };
  companies = { acme: { name: "Acme", isActive: true }, beta: { name: "Beta", isActive: true } };
  distributions = {
    d1: { surveyId: "s1", createdAt: new Date("2026-11-01"), dueDate: new Date("2026-11-20T00:00:00Z") },
    d2: { surveyId: "s1", createdAt: new Date("2026-11-05"), dueDate: new Date("2026-11-25T00:00:00Z") },
    dB: { surveyId: "sB", createdAt: new Date("2026-11-01"), dueDate: new Date("2026-11-25T00:00:00Z") },
  };
  employees = {
    ana: { id: "ana", companyId: "acme", name: "Ana María Gómez", email: null, phone: "3001234567", nationalId: "101", isActive: true },
    beto: { id: "beto", companyId: "acme", name: "Beto Ruiz", email: "beto@acme.com", phone: null, nationalId: "102", isActive: true },
    carla: { id: "carla", companyId: "acme", name: "Carla Díaz", email: null, phone: null, nationalId: "103", isActive: true },
    dani: { id: "dani", companyId: "acme", name: "Dani Mora", email: null, phone: null, nationalId: "104", isActive: true },
    bea: { id: "bea", companyId: "beta", name: "Bea Soto", email: null, phone: null, nationalId: "201", isActive: true },
  };
  responses = [
    { employeeId: "ana", distributionId: "d1", isComplete: false },
    { employeeId: "ana", distributionId: "d2", isComplete: false },
    { employeeId: "beto", distributionId: "d1", isComplete: false },
    { employeeId: "carla", distributionId: "d1", isComplete: false },
    { employeeId: "dani", distributionId: "d1", isComplete: true },
    { employeeId: "bea", distributionId: "dB", isComplete: false },
  ];
  tokens = [];

  mockPrisma.climateSurvey.findFirst.mockImplementation(async ({ where }: { where: { id: string; companyId: string } }) => {
    const s = surveys[where.id];
    return s && s.companyId === where.companyId ? { ...s, company: { isActive: companies[s.companyId].isActive } } : null;
  });
  mockPrisma.surveyResponse.findMany.mockImplementation(async ({ where }: { where: ResponseWhere }) =>
    responses
      .filter((r) => !where.employeeId || where.employeeId.in.includes(r.employeeId))
      .filter((r) => r.isComplete === where.isComplete)
      .filter((r) => distributions[r.distributionId].surveyId === where.distribution.surveyId)
      .filter((r) => {
        const e = employees[r.employeeId];
        return e.companyId === where.employee.companyId && e.isActive === where.employee.isActive && e.email === where.employee.email;
      })
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
const linkFor = async (employeeId: string) => (await createSurveyLinks("acme", "s1", [employeeId], NOW)).links[0];

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
    const link = await linkFor("ana");

    expect(link).toMatchObject({ employeeId: "ana", name: "Ana María Gómez", phone: "3001234567", expiresAt: new Date("2026-11-26T05:00:00Z") });
    expect(link.url).toMatch(/^http:\/\/localhost:4999\/portal\/link\/[A-Za-z0-9_-]{24}$/);
    expect(tokens).toEqual([
      expect.objectContaining({ purpose: "SURVEY_LINK", employeeId: "ana", companyId: "acme", distributionId: "d2", email: null, usedAt: null }),
    ]);
  });

  it("only for people without an email who haven't answered: nobody can act as anyone else", async () => {
    const { links } = await createSurveyLinks("acme", "s1", ["ana", "beto", "carla", "dani"], NOW);
    expect(links.map((l) => l.employeeId).sort()).toEqual(["ana", "carla"]);
    expect(tokens.map((t) => t.employeeId)).not.toContain("beto");
    expect(tokens.map((t) => t.employeeId)).not.toContain("dani");
  });

  it("replaces the person's unused link, but leaves used ones and other people's", async () => {
    const first = (await createSurveyLinks("acme", "s1", ["ana", "carla"], NOW)).links.find((l) => l.employeeId === "ana")!;
    const used = await linkFor("carla");
    await consumeSurveyLink(tokenOf(used.url), NOW);

    const second = (await createSurveyLinks("acme", "s1", ["ana", "carla"], NOW)).links.find((l) => l.employeeId === "ana")!;
    expect((await describeSurveyLink(tokenOf(first.url), NOW)).status).toBe("invalid");
    expect((await describeSurveyLink(tokenOf(second.url), NOW)).status).toBe("valid");
    expect((await describeSurveyLink(tokenOf(used.url), NOW)).status).toBe("used");
  });

  it("leaves out someone whose due date passed, and still makes the others' links", async () => {
    distributions.d1.dueDate = new Date("2026-11-05T00:00:00Z");
    const batch = await createSurveyLinks("acme", "s1", undefined, NOW);
    expect(batch.links.map((l) => l.employeeId)).toEqual(["ana"]); // her latest distribution is d2
    expect(batch.ended).toEqual([{ employeeId: "carla", name: "Carla Díaz" }]);
  });

  it("only for an active survey of the company and its participants", async () => {
    await expect(createSurveyLinks("acme", "sB", ["bea"], NOW)).rejects.toThrow("survey_not_found");
    // Another company's person, even with the right survey
    expect((await createSurveyLinks("acme", "s1", ["bea"], NOW)).links).toEqual([]);

    surveys.s1.status = "CLOSED";
    await expect(createSurveyLinks("acme", "s1", ["ana"], NOW)).rejects.toThrow("survey_link_not_active");
    surveys.s1.status = "ACTIVE";
    companies.acme.isActive = false;
    await expect(createSurveyLinks("acme", "s1", ["ana"], NOW)).rejects.toThrow("survey_link_not_active");
  });
});

describe("using a link", () => {
  it("works once: the second open finds it used", async () => {
    const token = tokenOf((await linkFor("ana")).url);

    // Looking at it (a chat app's preview) doesn't use it
    expect((await describeSurveyLink(token, NOW)).status).toBe("valid");
    expect((await describeSurveyLink(token, NOW)).status).toBe("valid");

    const first = await consumeSurveyLink(token, NOW);
    expect(first).toMatchObject({ status: "valid", employeeId: "ana", companyId: "acme", distributionId: "d2", email: null, firstName: "Ana" });
    expect((await consumeSurveyLink(token, NOW)).status).toBe("used");
  });

  it("stops working when it expires, the survey closes or the person gets an email", async () => {
    const token = tokenOf((await linkFor("ana")).url);
    expect((await consumeSurveyLink(token, new Date("2026-11-26T05:00:01Z"))).status).toBe("expired");

    employees.ana.email = "ana@acme.com";
    expect((await consumeSurveyLink(token, NOW)).status).toBe("invalid");
    employees.ana.email = null;

    surveys.s1.status = "CLOSED";
    expect((await consumeSurveyLink(token, NOW)).status).toBe("closed");
    expect(tokens[0].usedAt).toBeNull();
  });

  it("never opens another company's survey", async () => {
    const token = tokenOf((await linkFor("ana")).url);
    // A token made out for Acme pointing at Beta's distribution
    tokens[0].distributionId = "dB";
    expect((await consumeSurveyLink(token, NOW)).status).toBe("invalid");
    // Or a person moved to another company
    tokens[0].distributionId = "d2";
    employees.ana.companyId = "beta";
    expect((await consumeSurveyLink(token, NOW)).status).toBe("invalid");
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

  it("Comenzar opens a session for that survey only, until the link would expire", async () => {
    const link = await linkFor("ana");
    await expect(openSurveyLink(tokenOf(link.url))).rejects.toThrow("REDIRECT:/portal/climate-survey/d2");
    expect(createPortalSession).toHaveBeenCalledWith("ana", "acme", null, {
      distributionId: "d2",
      expiresAt: new Date("2026-11-26T05:00:00Z"),
    });

    // A used link goes back to its page, which explains, and signs nobody in
    createPortalSession.mockClear();
    await expect(openSurveyLink(tokenOf(link.url))).rejects.toThrow(`REDIRECT:/portal/link/${tokenOf(link.url)}`);
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it("only company admins create links, only for their company's surveys", async () => {
    expect((await createSurveyLink("s1", "ana")).success).toBe(true);

    mockSession = createMemberSession("acme");
    expect(await createSurveyLink("s1", "ana")).toEqual({ success: false, error: "No tienes permiso para hacer esto" });

    mockSession = createAdminSession("beta");
    expect(await createSurveyLink("s1", "ana")).toEqual({ success: false, error: "No encontramos la encuesta" });
  });

  it("refuses a link for someone with an email or who already answered", async () => {
    const notAvailable = {
      success: false,
      error: "Solo se generan enlaces para personas sin correo invitadas a la encuesta que aún no la han respondido",
    };
    expect(await createSurveyLink("s1", "beto")).toEqual(notAvailable);
    expect(await createSurveyLink("s1", "dani")).toEqual(notAvailable);
    expect(tokens).toEqual([]);
  });

  it("says so when the person's due date has passed", async () => {
    distributions.d1.dueDate = new Date("2026-11-05T00:00:00Z");
    expect((await createSurveyLink("s1", "carla")).error).toBe(
      "La fecha de cierre de la encuesta ya pasó. Amplíala en Configuración para generar enlaces.",
    );
  });

  it("the CSV gets new links for everyone without an email who hasn't answered", async () => {
    const result = await createSurveyLinksWithoutEmail("s1");
    expect(result.success).toBe(true);
    expect(result.data!.links.map((l) => l.employeeId)).toEqual(["ana", "carla"]);
    expect(result.data!.ended).toEqual([]);
  });
});
