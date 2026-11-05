/**
 * Tenant isolation of the header search against a real Postgres database.
 * Two companies get one record of every searchable type with the same name;
 * each user must only ever find the company they are signed into. Sessions
 * come from the real NextAuth session callback, so a forged company switch is
 * resolved exactly as in production. Only `auth()` itself is stubbed.
 *
 * Run:  E2E_DATABASE_URL=postgresql://…/peerhub_search npx vitest run tests/e2e/global-search
 * The database must be migrated. Skipped when E2E_DATABASE_URL is not set.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Session } from "next-auth";

const E2E = vi.hoisted(() => {
  const url = process.env.E2E_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
  return { enabled: !!url };
});

const state = vi.hoisted(() => ({ session: null as Session | null }));

vi.mock("@/lib/auth/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/config")>()),
  auth: vi.fn(async () => state.session),
}));

import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth/config";
import { GET } from "@/app/api/search/route";
import type { SearchResult } from "@/lib/search/types";

const DAY = 24 * 60 * 60 * 1000;
const RUN = Date.now().toString(36);
// Unique per run so nothing else in the database can match.
const KEYWORD = `Zafiro${RUN}`;

type Tenant = {
  companyId: string;
  adminUserId: string;
  employeeId: string;
  surveyId: string;
  departmentId: string;
  dimensionId: string;
  /** Every searchable record created for this company. */
  recordIds: string[];
};

const ctx = {
  a: null as Tenant | null,
  b: null as Tenant | null,
  superAdminUserId: "",
  globalTemplateId: "",
  userIds: [] as string[],
};

async function createTenant(label: string): Promise<Tenant> {
  const company = await prisma.company.create({
    data: { name: `E2E Search ${label} ${RUN}`, slug: `e2e-search-${label}-${RUN}`, taxId: `900-SEARCH-${label}` },
  });
  const companyId = company.id;

  const user = await prisma.user.create({ data: { email: `search-${label}-${RUN}@e2e.test`, name: `Admin ${label}` } });
  ctx.userIds.push(user.id);
  const employee = await prisma.employee.create({
    data: { companyId, name: `${KEYWORD} Persona`, email: `persona-${label}-${RUN}@e2e.test` },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "ADMIN", employeeId: employee.id } });

  const department = await prisma.department.create({ data: { companyId, name: `${KEYWORD} Departamento` } });
  const team = await prisma.team.create({ data: { companyId, name: `${KEYWORD} Equipo`, departmentId: department.id } });
  const survey = await prisma.climateSurvey.create({ data: { companyId, name: `${KEYWORD} Encuesta` } });
  const template = await prisma.climateSurveyTemplate.create({ data: { companyId, name: `${KEYWORD} Plantilla` } });
  const template360 = await prisma.template.create({ data: { companyId, name: `${KEYWORD} Plantilla 360` } });
  const cycle = await prisma.cycle.create({
    data: {
      companyId,
      templateId: template360.id,
      name: `${KEYWORD} Ciclo`,
      reviewStartDate: new Date(),
      reviewEndDate: new Date(Date.now() + 30 * DAY),
    },
  });
  const dimension = await prisma.climateDimension.create({ data: { companyId, name: `${KEYWORD} Dimensión` } });
  const plan = await prisma.actionPlan.create({
    data: actionPlanData({ companyId, surveyId: survey.id, dimensionId: dimension.id, ownerEmployeeId: employee.id }),
  });

  return {
    companyId,
    adminUserId: user.id,
    employeeId: employee.id,
    surveyId: survey.id,
    departmentId: department.id,
    dimensionId: dimension.id,
    recordIds: [employee.id, department.id, team.id, survey.id, template.id, cycle.id, plan.id],
  };
}

function actionPlanData(refs: { companyId: string; surveyId: string; dimensionId: string; ownerEmployeeId: string }) {
  return {
    ...refs,
    scope: "ORGANIZATION" as const,
    title: `${KEYWORD} Plan`,
    objective: "Mejorar el clima",
    baselineMean: 2.5,
    baselineBand: "DESFAVORABLE" as const,
    baselineN: 10,
    targetBand: "FAVORABLE" as const,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * DAY),
  };
}

/** Builds a session through the real NextAuth callback, as a request would. */
async function sessionFor(userId: string, currentCompanyId?: string, globalRole: "USER" | "SUPER_ADMIN" = "USER") {
  const base = { user: { id: "", email: "" }, expires: new Date(Date.now() + DAY).toISOString() };
  return (await authOptions.callbacks!.session!({
    session: base,
    token: { id: userId, globalRole, currentCompanyId },
  } as never)) as Session;
}

async function search(session: Session, query = KEYWORD, extraParams = ""): Promise<SearchResult[]> {
  state.session = session;
  const response = await GET(new Request(`http://localhost/api/search?q=${encodeURIComponent(query)}${extraParams}`));
  expect(response.status).toBe(200);
  return ((await response.json()) as { results: SearchResult[] }).results;
}

const ids = (results: SearchResult[]) => results.map((r) => r.id).sort();

// ---------------------------------------------------------------------------

describe.skipIf(!E2E.enabled)("Global search — tenant isolation (real database)", () => {
  beforeAll(async () => {
    ctx.a = await createTenant("a");
    ctx.b = await createTenant("b");

    const superAdmin = await prisma.user.create({
      data: { email: `search-super-${RUN}@e2e.test`, name: "Super", globalRole: "SUPER_ADMIN" },
    });
    ctx.superAdminUserId = superAdmin.id;
    ctx.userIds.push(superAdmin.id);

    // A shared platform template every company may use.
    const global = await prisma.climateSurveyTemplate.create({
      data: { companyId: null, isDefault: true, name: `${KEYWORD} Plantilla global` },
    });
    ctx.globalTemplateId = global.id;
  });

  afterAll(async () => {
    const companyIds = [ctx.a?.companyId, ctx.b?.companyId].filter((id): id is string => !!id);
    // Cycle → Template is ON DELETE RESTRICT, so cycles go first.
    await prisma.cycle.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    if (ctx.globalTemplateId) await prisma.climateSurveyTemplate.delete({ where: { id: ctx.globalTemplateId } });
    await prisma.user.deleteMany({ where: { id: { in: ctx.userIds } } });
    await prisma.$disconnect();
  });

  it("gives each company admin only their own company's records", async () => {
    const a = ctx.a!;
    const b = ctx.b!;

    const forA = await search(await sessionFor(a.adminUserId));
    const forB = await search(await sessionFor(b.adminUserId));

    expect(ids(forA)).toEqual([...a.recordIds, ctx.globalTemplateId].sort());
    expect(ids(forB)).toEqual([...b.recordIds, ctx.globalTemplateId].sort());
    expect(forA.some((r) => b.recordIds.includes(r.id))).toBe(false);
    expect(forB.some((r) => a.recordIds.includes(r.id))).toBe(false);
  });

  it("never returns companies, even when one matches the query", async () => {
    const results = await search(await sessionFor(ctx.a!.adminUserId), `E2E Search b ${RUN}`);

    expect(results).toEqual([]);
  });

  it("ignores a company id passed in the request", async () => {
    const results = await search(await sessionFor(ctx.a!.adminUserId), KEYWORD, `&companyId=${ctx.b!.companyId}`);

    expect(results.some((r) => ctx.b!.recordIds.includes(r.id))).toBe(false);
  });

  it("gives nothing to a user who switches their session to a company they are not in", async () => {
    const forged = await sessionFor(ctx.a!.adminUserId, ctx.b!.companyId);

    expect(forged.companyUser).toBeUndefined();
    expect(await search(forged)).toEqual([]);
  });

  it("gives nothing to a super admin in a company they are not a member of", async () => {
    const session = await sessionFor(ctx.superAdminUserId, ctx.b!.companyId, "SUPER_ADMIN");

    expect(session.user.globalRole).toBe("SUPER_ADMIN");
    expect(session.companyUser).toBeUndefined();
    expect(await search(session)).toEqual([]);
  });

  it("gives nothing to a member whose access to the company was deactivated", async () => {
    const a = ctx.a!;
    await prisma.companyUser.updateMany({ where: { userId: a.adminUserId }, data: { isActive: false } });
    try {
      expect(await search(await sessionFor(a.adminUserId, a.companyId))).toEqual([]);
    } finally {
      await prisma.companyUser.updateMany({ where: { userId: a.adminUserId }, data: { isActive: true } });
    }
  });

  it("skips an action plan whose survey belongs to another company", async () => {
    const a = ctx.a!;
    const b = ctx.b!;
    // Inconsistent row: company A's plan pointing at company B's survey.
    const plan = await prisma.actionPlan.create({
      data: actionPlanData({
        companyId: a.companyId,
        surveyId: b.surveyId,
        dimensionId: a.dimensionId,
        ownerEmployeeId: a.employeeId,
      }),
    });
    try {
      expect(ids(await search(await sessionFor(a.adminUserId)))).not.toContain(plan.id);
      expect(ids(await search(await sessionFor(b.adminUserId)))).not.toContain(plan.id);
    } finally {
      await prisma.actionPlan.delete({ where: { id: plan.id } });
    }
  });

  it("hides another company's department name on a team", async () => {
    const a = ctx.a!;
    const team = await prisma.team.create({
      data: { companyId: a.companyId, name: `${KEYWORD} Equipo cruzado`, departmentId: ctx.b!.departmentId },
    });
    try {
      const results = await search(await sessionFor(a.adminUserId), `${KEYWORD} Equipo cruzado`);

      expect(results).toEqual([
        { type: "team", id: team.id, title: `${KEYWORD} Equipo cruzado`, subtitle: null, href: "/settings/company/teams" },
      ]);
    } finally {
      await prisma.team.delete({ where: { id: team.id } });
    }
  });
});
