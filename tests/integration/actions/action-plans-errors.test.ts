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

// Import AFTER mocks
import { cancelActionPlan, deleteActionPlan } from "@/lib/actions/action-plans";

const admin: ClimateActor = { kind: "admin", companyId: "company-1", userId: "user-1", employeeId: null, name: "Ana" };

function companyLocale(locale: string) {
  mockPrisma.company.findUnique.mockResolvedValue({ locale });
}

describe("action plan errors follow the company language", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    actor = admin;
    mockPrisma.actionPlan.findFirst.mockResolvedValue(null);
  });

  it("answers in Spanish for es companies", async () => {
    companyLocale("es");
    expect((await deleteActionPlan("missing")).error).toBe("No encontramos el plan");
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({ where: { id: "company-1" }, select: { locale: true } });
  });

  it("answers in English for en companies", async () => {
    companyLocale("en");
    expect((await deleteActionPlan("missing")).error).toBe("Plan not found");
  });

  it("translates the field named in validation messages", async () => {
    mockPrisma.actionPlan.findFirst.mockResolvedValue({
      id: "plan-1",
      surveyId: "survey-1",
      status: "ACTIVE",
      ownerEmployeeId: "emp-1",
      tasks: [],
    });

    companyLocale("es");
    expect((await cancelActionPlan("plan-1", "  ")).error).toBe("Completa el campo «Motivo de cancelación»");
    companyLocale("en");
    expect((await cancelActionPlan("plan-1", "  ")).error).toBe("Reason is required");
  });

  it("falls back to Spanish when nobody is signed in", async () => {
    actor = null;
    expect((await deleteActionPlan("plan-1")).error).toBe("No tienes permiso para hacer esto");
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });
});
