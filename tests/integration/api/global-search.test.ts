import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createManagerSession,
  createMemberSession,
  createMockSession,
  createSuperAdminSession,
} from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: Session | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// Import AFTER mocks
import { globalSearch } from "@/lib/search/global-search";
import { normalizeSearchQuery, SEARCH_MAX_QUERY_LENGTH } from "@/lib/search/types";
import { GET } from "@/app/api/search/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPANY_MODELS = [
  "employee",
  "climateSurvey",
  "actionPlan",
  "climateSurveyTemplate",
  "cycle",
  "department",
  "team",
] as const;

function emptyFindMany() {
  for (const model of [...COMPANY_MODELS, "company"] as const) {
    mockPrisma[model].findMany.mockResolvedValue([]);
  }
}

function whereOf(model: keyof MockPrismaClient) {
  const fn = (mockPrisma[model] as { findMany: ReturnType<typeof vi.fn> }).findMany;
  expect(fn).toHaveBeenCalledTimes(1);
  return fn.mock.calls[0][0].where;
}

function request(q?: string) {
  const url = new URL("http://localhost/api/search");
  if (q !== undefined) url.searchParams.set("q", q);
  return new Request(url);
}

const insensitive = (value: string) => ({ contains: value, mode: "insensitive" });

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockSession = null;
  emptyFindMany();
});

// ---------------------------------------------------------------------------
// normalizeSearchQuery
// ---------------------------------------------------------------------------

describe("normalizeSearchQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSearchQuery("  ana   maría ")).toBe("ana maría");
  });

  it("rejects queries shorter than two characters", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery(" a ")).toBeNull();
    expect(normalizeSearchQuery(null)).toBeNull();
    expect(normalizeSearchQuery(42)).toBeNull();
  });

  it("caps very long queries", () => {
    const query = normalizeSearchQuery("x".repeat(500));
    expect(query).toHaveLength(SEARCH_MAX_QUERY_LENGTH);
  });
});

// ---------------------------------------------------------------------------
// globalSearch — tenant scoping and permissions
// ---------------------------------------------------------------------------

describe("globalSearch", () => {
  it("does not query the database for short queries", async () => {
    const results = await globalSearch(createAdminSession(), "a");

    expect(results).toEqual([]);
    for (const model of [...COMPANY_MODELS, "company"] as const) {
      expect(mockPrisma[model].findMany).not.toHaveBeenCalled();
    }
  });

  it("returns nothing without a session", async () => {
    const results = await globalSearch(null, "ana");

    expect(results).toEqual([]);
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("scopes every company entity to the admin's company", async () => {
    await globalSearch(createAdminSession("company-1"), "ana");

    for (const model of COMPANY_MODELS) {
      const where = whereOf(model);
      if (model === "climateSurveyTemplate") {
        expect(where.OR).toEqual([
          { companyId: "company-1", isArchived: false },
          { companyId: null, isDefault: true, isArchived: false },
        ]);
      } else {
        expect(where.companyId).toBe("company-1");
      }
      const args = (mockPrisma[model].findMany.mock.calls[0] as [{ take: number }])[0];
      expect(args.take).toBe(5);
    }
  });

  it("matches people by name, email or title, case-insensitively, active only", async () => {
    await globalSearch(createAdminSession(), "ana");

    const where = whereOf("employee");
    expect(where.isActive).toBe(true);
    expect(where.OR).toEqual([
      { name: insensitive("ana") },
      { email: insensitive("ana") },
      { title: insensitive("ana") },
    ]);
  });

  it("matches the other company entities by name or title", async () => {
    await globalSearch(createAdminSession(), "clima");

    expect(whereOf("climateSurvey")).toMatchObject({
      name: insensitive("clima"),
      status: { not: "ARCHIVED" },
    });
    expect(whereOf("actionPlan")).toMatchObject({ title: insensitive("clima") });
    expect(whereOf("climateSurveyTemplate")).toMatchObject({ name: insensitive("clima") });
    expect(whereOf("cycle")).toMatchObject({
      name: insensitive("clima"),
      status: { not: "ARCHIVED" },
    });
    expect(whereOf("department")).toMatchObject({ name: insensitive("clima") });
    expect(whereOf("team")).toMatchObject({ name: insensitive("clima"), isActive: true });
  });

  it("does not let a company admin search other companies", async () => {
    await globalSearch(createAdminSession(), "acme");

    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  it("maps rows to grouped results with links to existing pages", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp-1", name: "Ana Ruiz", email: "ana@acme.com", title: "Analista" },
      { id: "emp-2", name: "Anabel Gómez", email: "anabel@acme.com", title: null },
    ]);
    mockPrisma.climateSurvey.findMany.mockResolvedValue([
      { id: "survey-1", name: "Clima 2026", description: null },
    ]);
    mockPrisma.actionPlan.findMany.mockResolvedValue([
      { id: "plan-1", title: "Plan de comunicación", surveyId: "survey-1", survey: { name: "Clima 2026" } },
    ]);
    mockPrisma.climateSurveyTemplate.findMany.mockResolvedValue([
      { id: "tpl-1", name: "Instrumento Kultiva", description: "60 ítems" },
    ]);
    mockPrisma.cycle.findMany.mockResolvedValue([
      { id: "cycle-1", name: "Evaluación anual", description: null },
    ]);
    mockPrisma.department.findMany.mockResolvedValue([
      { id: "dept-1", name: "Analítica", description: null },
    ]);
    mockPrisma.team.findMany.mockResolvedValue([
      { id: "team-1", name: "Analytics", department: { name: "Analítica" } },
    ]);

    const results = await globalSearch(createAdminSession(), "an");

    expect(results).toEqual([
      { type: "person", id: "emp-1", title: "Ana Ruiz", subtitle: "Analista · ana@acme.com", href: "/people/emp-1" },
      { type: "person", id: "emp-2", title: "Anabel Gómez", subtitle: "anabel@acme.com", href: "/people/emp-2" },
      { type: "climateSurvey", id: "survey-1", title: "Clima 2026", subtitle: null, href: "/surveys/climate/survey-1" },
      {
        type: "actionPlan",
        id: "plan-1",
        title: "Plan de comunicación",
        subtitle: "Clima 2026",
        href: "/surveys/climate/survey-1/plans/plan-1",
      },
      {
        type: "climateTemplate",
        id: "tpl-1",
        title: "Instrumento Kultiva",
        subtitle: "60 ítems",
        href: "/surveys/climate/templates/tpl-1",
      },
      { type: "cycle", id: "cycle-1", title: "Evaluación anual", subtitle: null, href: "/surveys/360/cycle-1" },
      { type: "department", id: "dept-1", title: "Analítica", subtitle: null, href: "/settings/company/departments" },
      { type: "team", id: "team-1", title: "Analytics", subtitle: "Analítica", href: "/settings/company/teams" },
    ]);
  });

  it.each([
    ["MANAGER", createManagerSession()],
    ["MEMBER", createMemberSession()],
  ])("returns no admin-only entities to a %s", async (_role, session) => {
    const results = await globalSearch(session, "ana");

    expect(results).toEqual([]);
    for (const model of [...COMPANY_MODELS, "company"] as const) {
      expect(mockPrisma[model].findMany).not.toHaveBeenCalled();
    }
  });

  it("returns nothing to a user without a company", async () => {
    const session = createMockSession({ companyUser: null });

    expect(await globalSearch(session, "ana")).toEqual([]);
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  it("lets a super admin without a company find companies only", async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      { id: "company-2", name: "Globex", slug: "globex", domain: "globex.com" },
      { id: "company-3", name: "Globo", slug: "globo", domain: null },
    ]);

    const results = await globalSearch(createSuperAdminSession(), "glob");

    expect(whereOf("company")).toEqual({
      OR: [
        { name: insensitive("glob") },
        { slug: insensitive("glob") },
        { domain: insensitive("glob") },
      ],
    });
    expect(results).toEqual([
      { type: "company", id: "company-2", title: "Globex", subtitle: "globex.com", href: "/settings/platform/companies" },
      { type: "company", id: "company-3", title: "Globo", subtitle: "globo", href: "/settings/platform/companies" },
    ]);
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("lets a super admin acting as company admin find both", async () => {
    const session = createMockSession({
      globalRole: "SUPER_ADMIN",
      companyUser: {
        id: "cu-sa",
        companyId: "company-9",
        companyName: "Initech",
        companySlug: "initech",
        role: "ADMIN",
        employeeId: null,
      },
    });

    await globalSearch(session, "ini");

    expect(whereOf("employee").companyId).toBe("company-9");
    expect(mockPrisma.company.findMany).toHaveBeenCalledTimes(1);
  });

  it("keeps a super admin with a non-admin company role out of company entities", async () => {
    const session = createMockSession({
      globalRole: "SUPER_ADMIN",
      companyUser: {
        id: "cu-sa",
        companyId: "company-9",
        companyName: "Initech",
        companySlug: "initech",
        role: "MEMBER",
        employeeId: null,
      },
    });

    await globalSearch(session, "ini");

    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.company.findMany).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/search
// ---------------------------------------------------------------------------

describe("GET /api/search", () => {
  it("rejects unauthenticated requests", async () => {
    mockSession = null;

    const response = await GET(request("ana"));

    expect(response.status).toBe(401);
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("returns results for the session's company", async () => {
    mockSession = createAdminSession("company-1");
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp-1", name: "Ana Ruiz", email: "ana@acme.com", title: null },
    ]);

    const response = await GET(request("ana"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.results).toEqual([
      { type: "person", id: "emp-1", title: "Ana Ruiz", subtitle: "ana@acme.com", href: "/people/emp-1" },
    ]);
    expect(whereOf("employee").companyId).toBe("company-1");
  });

  it("ignores any company id passed by the client", async () => {
    mockSession = createAdminSession("company-1");
    const url = new URL("http://localhost/api/search?q=ana&companyId=company-2");

    await GET(new Request(url));

    expect(whereOf("employee").companyId).toBe("company-1");
  });

  it("returns an empty list for a missing query", async () => {
    mockSession = createAdminSession();

    const response = await GET(request());

    expect(await response.json()).toEqual({ results: [] });
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("returns 500 when a query fails", async () => {
    mockSession = createAdminSession();
    mockPrisma.employee.findMany.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request("ana"));

    expect(response.status).toBe(500);
    consoleError.mockRestore();
  });
});
