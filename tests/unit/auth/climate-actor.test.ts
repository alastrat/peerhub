import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  session: null as unknown,
  portal: null as unknown,
  referer: null as string | null,
  employees: {} as Record<string, { id: string; name: string; companyId?: string; isActive: boolean }>,
}));

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("@/lib/auth/portal-session", () => ({ getPortalSession: vi.fn(async () => state.portal) }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map(state.referer ? [["referer", state.referer]] : [])),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.employees[where.id] ?? null),
    },
  },
}));

import { getClimateActor, requireClimateActor } from "@/lib/auth/climate-actor";

const adminSession = {
  user: { id: "u-admin", name: "Ana", email: "ana@x.co", globalRole: "USER" },
  companyUser: { companyId: "c1", role: "ADMIN", employeeId: "e-admin" },
};

beforeEach(() => {
  state.session = null;
  state.portal = null;
  state.referer = null;
  state.employees = {
    "e-lina": { id: "e-lina", name: "Lina", companyId: "c1", isActive: true },
    "e-manager": { id: "e-manager", name: "Mario", isActive: true },
    "e-gone": { id: "e-gone", name: "Gone", companyId: "c1", isActive: false },
  };
});

describe("getClimateActor", () => {
  it("returns null without any session", async () => {
    expect(await getClimateActor()).toBeNull();
    await expect(requireClimateActor()).rejects.toThrow("Unauthorized");
  });

  it("prefers the dashboard admin outside the portal", async () => {
    state.session = adminSession;
    state.portal = { employeeId: "e-lina", companyId: "c1", email: "l@x.co" };
    state.referer = "http://localhost/surveys/climate/s1";
    expect(await getClimateActor()).toMatchObject({ kind: "admin", userId: "u-admin", employeeId: "e-admin" });
  });

  it("acts as the portal employee when called from a portal page", async () => {
    state.session = adminSession;
    state.portal = { employeeId: "e-lina", companyId: "c1", email: "l@x.co" };
    state.referer = "http://localhost/portal/climate-plans/p1";
    expect(await getClimateActor()).toMatchObject({ kind: "employee", employeeId: "e-lina", name: "Lina" });
  });

  it("uses the portal session when there is no dashboard session", async () => {
    state.portal = { employeeId: "e-lina", companyId: "c1", email: "l@x.co" };
    expect(await getClimateActor()).toMatchObject({ kind: "employee", companyId: "c1", employeeId: "e-lina" });
  });

  it("ignores inactive portal employees", async () => {
    state.portal = { employeeId: "e-gone", companyId: "c1", email: "g@x.co" };
    state.referer = "http://localhost/portal/my-tasks";
    expect(await getClimateActor()).toBeNull();
  });

  it("treats a non-admin dashboard user with an employee record as an employee", async () => {
    state.session = {
      user: { id: "u-m", name: "Mario", globalRole: "USER" },
      companyUser: { companyId: "c1", role: "MANAGER", employeeId: "e-manager" },
    };
    expect(await getClimateActor()).toMatchObject({ kind: "employee", userId: "u-m", employeeId: "e-manager" });
  });

  it("treats super admins as admins", async () => {
    state.session = {
      user: { id: "u-s", name: "Root", globalRole: "SUPER_ADMIN" },
      companyUser: { companyId: "c1", role: "MEMBER", employeeId: null },
    };
    expect(await getClimateActor()).toMatchObject({ kind: "admin", employeeId: null });
  });
});
