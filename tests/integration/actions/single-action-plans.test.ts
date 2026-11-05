import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import type { ClimateActor } from "@/lib/auth/climate-actor";

let mockPrisma: MockPrismaClient;
let actor: ClimateActor | null;

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

vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Import AFTER mocks
import {
  deleteSingleActionPlan,
  setSingleActionPlanStatus,
  updateSingleActionPlan,
} from "@/lib/actions/action-plans";

const admin: ClimateActor = { kind: "admin", companyId: "company-1", userId: "user-1", employeeId: null, name: "Ana" };
const leader: ClimateActor = { kind: "employee", companyId: "company-1", userId: null, employeeId: "lead-1", name: "Sara" };
const otherLeader: ClimateActor = { kind: "employee", companyId: "company-1", userId: null, employeeId: "lead-2", name: "Miguel" };

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    surveyId: "survey-1",
    status: "ACTIVE",
    title: "Pausas activas",
    ownerEmployeeId: "lead-1",
    scope: "LEADER",
    scopeRefId: "lead-1",
    tasks: [{ id: "task-1", ownerEmployeeId: null, status: "PENDING", title: "Pausas activas", dueDate: new Date("2026-12-01") }],
    survey: { id: "survey-1", name: "Clima 2026", followUpUserIds: [] },
    dimension: { name: "Calidad de vida" },
    owner: { name: "Sara", email: "sara@acme.com" },
    ...overrides,
  };
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.company.findUnique.mockResolvedValue({ locale: "es" });
  // Run transactions against the same mock so their writes can be asserted
  mockPrisma.$transaction.mockImplementation(async (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: MockPrismaClient) => Promise<unknown>)(mockPrisma),
  );
  actor = leader;
});

describe("updateSingleActionPlan", () => {
  it("updates the plan and its one task together", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    const res = await updateSingleActionPlan("plan-1", { action: "Pausas activas diarias", startDate: "2026-11-05", endDate: "2026-12-15" });

    expect(res).toEqual({ success: true });
    expect(mockPrisma.actionPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {
        title: "Pausas activas diarias",
        objective: "Pausas activas diarias",
        startDate: new Date("2026-11-05"),
        endDate: new Date("2026-12-15"),
      },
    });
    expect(mockPrisma.actionPlanTask.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { title: "Pausas activas diarias", dueDate: new Date("2026-12-15") },
    });
  });

  it("rejects dates in the wrong order and other leaders", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    expect((await updateSingleActionPlan("plan-1", { action: "x", startDate: "2026-12-15", endDate: "2026-11-05" })).success).toBe(false);

    actor = otherLeader;
    const res = await updateSingleActionPlan("plan-1", { action: "x", startDate: "2026-11-05", endDate: "2026-12-15" });
    expect(res.success).toBe(false);
    expect(mockPrisma.actionPlan.update).not.toHaveBeenCalled();
  });
});

describe("setSingleActionPlanStatus", () => {
  it("rejects unknown statuses and other leaders", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    expect((await setSingleActionPlanStatus("plan-1", "CANCELLED" as never)).success).toBe(false);

    actor = otherLeader;
    expect((await setSingleActionPlanStatus("plan-1", "IN_PROGRESS")).success).toBe(false);
    expect(mockPrisma.actionPlanTask.update).not.toHaveBeenCalled();
  });

  it("reopens a completed plan when its action moves back to in progress", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan({ status: "COMPLETED" }));
    // The task lookup after reopening sees an active plan
    mockPrisma.actionPlanTask.findFirst.mockResolvedValue({
      id: "task-1",
      planId: "plan-1",
      status: "DONE",
      ownerEmployeeId: null,
      plan: plan({ status: "ACTIVE" }),
    });

    const res = await setSingleActionPlanStatus("plan-1", "IN_PROGRESS");

    expect(res).toEqual({ success: true });
    expect(mockPrisma.actionPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { status: "ACTIVE", completedAt: null, closingNote: null },
    });
    expect(mockPrisma.actionPlanTask.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
  });
});

describe("deleteSingleActionPlan", () => {
  it("lets the leader delete an unfinished plan", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    mockPrisma.actionPlanEvidence.findMany.mockResolvedValue([]);
    expect(await deleteSingleActionPlan("plan-1")).toEqual({ success: true });
    expect(mockPrisma.actionPlan.delete).toHaveBeenCalledWith({ where: { id: "plan-1" } });
  });

  it("keeps completed plans for HR, and other leaders out", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan({ status: "COMPLETED" }));
    expect((await deleteSingleActionPlan("plan-1")).error).toBe("Solo RR.HH. puede eliminar un plan completado.");

    actor = otherLeader;
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan());
    expect((await deleteSingleActionPlan("plan-1")).success).toBe(false);
    expect(mockPrisma.actionPlan.delete).not.toHaveBeenCalled();

    actor = admin;
    mockPrisma.actionPlan.findFirst.mockResolvedValue(plan({ status: "COMPLETED" }));
    mockPrisma.actionPlanEvidence.findMany.mockResolvedValue([]);
    expect(await deleteSingleActionPlan("plan-1")).toEqual({ success: true });
  });
});
