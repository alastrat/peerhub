import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import type { ClimateActor } from "@/lib/auth/climate-actor";

let mockPrisma: MockPrismaClient;
let actor: ClimateActor | null;
const emailUsersViaDashboard = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/climate-actor", () => ({
  getClimateActor: vi.fn(async () => actor),
  requireClimateActor: vi.fn(async () => {
    if (!actor) throw new Error("Unauthorized");
    return actor;
  }),
}));

vi.mock("@/lib/email/climate-plan-emails", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/climate-plan-emails")>()),
  emailUsersViaDashboard: (...args: unknown[]) => emailUsersViaDashboard(...args),
  emailEmployeeViaPortal: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Import AFTER mocks
import { completeActionPlan, submitActionPlan } from "@/lib/actions/action-plans";

const leader: ClimateActor = { kind: "employee", companyId: "company-1", userId: null, employeeId: "lead-1", name: "Sara" };

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    surveyId: "survey-1",
    status: "DRAFT",
    title: "Pausas activas",
    ownerEmployeeId: "lead-1",
    scope: "LEADER",
    scopeRefId: "lead-1",
    tasks: [{ id: "task-1", ownerEmployeeId: null, status: "PENDING", title: "Pausas activas", dueDate: new Date("2026-12-01") }],
    survey: { id: "survey-1", name: "Clima 2026", followUpUserIds: ["hr-1"] },
    dimension: { name: "Calidad de vida" },
    owner: { name: "Sara", email: "sara@acme.com" },
    ...overrides,
  };
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.company.findUnique.mockResolvedValue({ locale: "es" });
  emailUsersViaDashboard.mockReset();
  actor = leader;
});

describe("HR plan emails link to Planes de acción", () => {
  it("sends HR to the leader's page when a leader submits a plan", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    expect(await submitActionPlan("plan-1")).toEqual({ success: true });
    expect(emailUsersViaDashboard).toHaveBeenCalledWith("company-1", ["hr-1"], "/action-plans/survey-1/lead-1", expect.any(Function));
  });

  it("keeps the plan's own page for organization plans", async () => {
    actor = { kind: "admin", companyId: "company-1", userId: "user-1", employeeId: null, name: "Ana" };
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan({ scope: "ORGANIZATION", scopeRefId: null }));
    await submitActionPlan("plan-1");
    expect(emailUsersViaDashboard).toHaveBeenCalledWith(
      "company-1",
      ["hr-1"],
      "/surveys/climate/survey-1/plans/plan-1",
      expect.any(Function),
    );
  });

  it("sends HR to the leader's page when a leader completes every plan", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(
      plan({ status: "ACTIVE", tasks: [{ id: "task-1", ownerEmployeeId: null, status: "DONE", title: "x", dueDate: new Date() }] }),
    );
    mockPrisma.actionPlan.findMany.mockResolvedValue([{ status: "COMPLETED" }]);
    expect(await completeActionPlan("plan-1", "Hecho")).toEqual({ success: true });
    expect(emailUsersViaDashboard).toHaveBeenCalledWith("company-1", ["hr-1"], "/action-plans/survey-1/lead-1", expect.any(Function));
  });
});
