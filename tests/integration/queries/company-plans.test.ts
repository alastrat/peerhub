import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

// Import AFTER mocks
import { getCompanyPlans } from "@/lib/queries/action-plans";

const past = new Date("2020-01-01");
const future = new Date("2999-01-01");

function plan(overrides: Record<string, unknown>) {
  return {
    id: "p1",
    title: "Plan",
    scope: "LEADER",
    scopeRefId: "lead-1",
    dimensionId: "d-cvi",
    dimension: { name: "Calidad de vida" },
    owner: { name: "Sara Martínez" },
    status: "ACTIVE",
    baselineBand: "DESFAVORABLE",
    baselineMean: 2.8,
    targetBand: "FAVORABLE",
    endDate: future,
    tasks: [],
    measures: [],
    survey: { id: "s-2026", name: "Clima 2026" },
    ...overrides,
  };
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.employee.findFirst.mockResolvedValue({ name: "Sara Martínez" });
});

describe("getCompanyPlans", () => {
  it("lists only the company's plans, across surveys, with their survey", async () => {
    mockPrisma.actionPlan.findMany.mockResolvedValue([
      plan({ id: "p1" }),
      plan({ id: "p2", survey: { id: "s-2025", name: "Clima 2025" }, dimensionId: "d-sme", dimension: { name: "Salud mental" } }),
    ]);

    const res = await getCompanyPlans("company-1");

    expect(mockPrisma.actionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1" }, orderBy: { createdAt: "desc" } }),
    );
    expect(res.plans.map((p) => [p.id, p.surveyName, p.scopeName])).toEqual([
      ["p1", "Clima 2026", "Sara Martínez"],
      ["p2", "Clima 2025", "Sara Martínez"],
    ]);
    expect(res.surveys).toEqual([
      { id: "s-2026", name: "Clima 2026" },
      { id: "s-2025", name: "Clima 2025" },
    ]);
    // Sorted by name for the filter
    expect(res.dimensions.map((d) => d.dimensionName)).toEqual(["Calidad de vida", "Salud mental"]);
  });

  it("summarizes status, overdue work and impact", async () => {
    mockPrisma.actionPlan.findMany.mockResolvedValue([
      plan({ id: "a", status: "ACTIVE", tasks: [{ status: "PENDING", dueDate: past }] }),
      plan({ id: "b", status: "ACTIVE", tasks: [{ status: "DONE", dueDate: past }] }),
      plan({
        id: "c",
        status: "COMPLETED",
        measures: [{ evaluatedAt: past, resultBand: "FAVORABLE", resultMean: 3.2 }],
      }),
      plan({ id: "d", status: "DRAFT" }),
    ]);

    const { summary, plans } = await getCompanyPlans("company-1");

    expect(summary).toMatchObject({ total: 4, active: 2, completed: 1, withOverdueTasks: 1 });
    expect(plans.find((p) => p.id === "c")?.impact).toBe("IMPROVED");
    // Drafts don't count toward impact
    expect(summary.impact).toEqual({ IMPROVED: 1, UNCHANGED: 0, WORSENED: 0, NOT_EVALUABLE: 0, PENDING: 2 });
  });

  it("returns empty lists when the company has no plans", async () => {
    mockPrisma.actionPlan.findMany.mockResolvedValue([]);
    const res = await getCompanyPlans("company-1");
    expect(res).toMatchObject({ plans: [], surveys: [], dimensions: [], summary: { total: 0 } });
  });
});
