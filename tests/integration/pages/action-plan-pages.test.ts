/**
 * A plan's full page lives under Planes de acción; the old survey URL redirects there.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type { Session } from "next-auth";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createManagerSession, createSuperAdminSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: Session | null;
const getPlanDetail = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/queries/action-plans", () => ({
  getPlanDetail: (...args: unknown[]) => getPlanDetail(...args),
}));

vi.mock("@/components/climate/plans/action-plan-editor", () => ({
  ActionPlanEditor: () => null,
}));

// Import AFTER mocks
import ActionPlanPage from "@/app/(dashboard)/action-plans/[surveyId]/plans/[planId]/page";
import nextConfig from "../../../next.config";
import { actionPlanPath } from "@/lib/climate/plan-paths";

type EditorProps = { backHref: string; afterDeleteHref: string; permissions: { isAdmin: boolean } };

function params(surveyId: string, planId: string) {
  return { params: Promise.resolve({ surveyId, planId }) };
}

function plan(overrides: Record<string, unknown> = {}) {
  return { id: "plan-1", surveyId: "survey-1", scope: "LEADER", scopeRefId: "lead-1", ...overrides };
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.employee.findMany.mockResolvedValue([]);
  mockSession = createAdminSession();
  getPlanDetail.mockReset();
});

describe("old survey plan URL", () => {
  it("permanently redirects to the plan in Planes de acción", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: "/surveys/climate/:surveyId/plans/:planId",
      destination: actionPlanPath(":surveyId", ":planId"),
      permanent: true,
    });
  });
});

describe("plan page in Planes de acción", () => {
  it("goes back to the leader's page for a leader plan", async () => {
    getPlanDetail.mockResolvedValue(plan());
    const el = (await ActionPlanPage(params("survey-1", "plan-1"))) as ReactElement<EditorProps>;
    expect(getPlanDetail).toHaveBeenCalledWith("plan-1", "company-1");
    expect(el.props.backHref).toBe("/action-plans/survey-1/lead-1");
    expect(el.props.afterDeleteHref).toBe("/action-plans/survey-1/lead-1");
    expect(el.props.permissions.isAdmin).toBe(true);
  });

  it("goes back to the survey's leaders for an organization plan", async () => {
    getPlanDetail.mockResolvedValue(plan({ scope: "ORGANIZATION", scopeRefId: null }));
    const el = (await ActionPlanPage(params("survey-1", "plan-1"))) as ReactElement<EditorProps>;
    expect(el.props.backHref).toBe("/action-plans/survey-1");
  });

  it("is not found under another survey", async () => {
    getPlanDetail.mockResolvedValue(plan({ surveyId: "survey-2" }));
    await expect(ActionPlanPage(params("survey-1", "plan-1"))).rejects.toThrow("NOT_FOUND");
  });

  it("is not found when the plan is in another company", async () => {
    getPlanDetail.mockResolvedValue(null);
    await expect(ActionPlanPage(params("survey-1", "plan-1"))).rejects.toThrow("NOT_FOUND");
  });

  it("stays admin-only: leaders go to their own Planes de acción", async () => {
    mockSession = createManagerSession();
    await expect(ActionPlanPage(params("survey-1", "plan-1"))).rejects.toThrow("REDIRECT:/action-plans");
    expect(getPlanDetail).not.toHaveBeenCalled();
  });

  it("sends people without a company to sign in", async () => {
    mockSession = createSuperAdminSession();
    await expect(ActionPlanPage(params("survey-1", "plan-1"))).rejects.toThrow("REDIRECT:/login");
  });
});
