/**
 * Renaming a company (its admins) and deactivating or deleting it (super
 * admins only).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession, createSuperAdminSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(() => Promise.resolve(mockSession)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));

import { updateCompanyName } from "@/lib/actions/company";
import { deleteCompany, setCompanyActive } from "@/lib/actions/platform";
import { verifyPortalToken } from "@/lib/actions/portal";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockPrisma.$transaction.mockImplementation((fn: (tx: MockPrismaClient) => Promise<unknown>) => fn(mockPrisma));
  mockSession = createAdminSession();
});

describe("updateCompanyName", () => {
  it("lets a company admin rename their company, tidying spaces", async () => {
    const result = await updateCompanyName("  Acme   Demo  ");

    expect(result).toEqual({ success: true, data: { name: "Acme Demo" } });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({ where: { id: "company-1" }, data: { name: "Acme Demo" } });
  });

  it("rejects names that are too short or too long", async () => {
    expect((await updateCompanyName(" A ")).error).toBe("El nombre de la empresa debe tener entre 2 y 100 caracteres");
    expect((await updateCompanyName("x".repeat(101))).success).toBe(false);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("keeps members out", async () => {
    mockSession = createMemberSession();
    expect((await updateCompanyName("Otra")).error).toBe("No tienes permiso para hacer esto");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });
});

describe("setCompanyActive", () => {
  it("deactivates and reactivates a company for super admins", async () => {
    mockSession = createSuperAdminSession();
    mockPrisma.company.updateMany.mockResolvedValue({ count: 1 });

    expect(await setCompanyActive("company-2", false)).toEqual({ success: true });
    expect(mockPrisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: "company-2" },
      data: { isActive: false, deactivatedAt: expect.any(Date) },
    });

    expect(await setCompanyActive("company-2", true)).toEqual({ success: true });
    expect(mockPrisma.company.updateMany).toHaveBeenLastCalledWith({
      where: { id: "company-2" },
      data: { isActive: true, deactivatedAt: null },
    });
  });

  it("is for super admins only, not company admins", async () => {
    expect((await setCompanyActive("company-1", false)).error).toBe("No tienes permiso para hacer esto");
    expect(mockPrisma.company.updateMany).not.toHaveBeenCalled();
  });

  it("reports an unknown company", async () => {
    mockSession = createSuperAdminSession();
    mockPrisma.company.updateMany.mockResolvedValue({ count: 0 });
    expect((await setCompanyActive("nope", false)).error).toBe("No encontramos la empresa");
  });
});

describe("deleteCompany", () => {
  beforeEach(() => {
    mockSession = createSuperAdminSession();
    mockPrisma.company.findUnique.mockResolvedValue({ name: "Acme Smoke Test" });
  });

  it("deletes everything once the name is typed back", async () => {
    expect(await deleteCompany("company-2", " Acme Smoke Test ")).toEqual({ success: true });
    expect(mockPrisma.cycle.deleteMany).toHaveBeenCalledWith({ where: { companyId: "company-2" } });
    expect(mockPrisma.actionPlan.deleteMany).toHaveBeenCalledWith({ where: { companyId: "company-2" } });
    expect(mockPrisma.climateSurvey.deleteMany).toHaveBeenCalledWith({ where: { companyId: "company-2" } });
    expect(mockPrisma.company.delete).toHaveBeenCalledWith({ where: { id: "company-2" } });
  });

  it("refuses when the typed name doesn't match", async () => {
    expect((await deleteCompany("company-2", "Acme")).error).toBe(
      "El nombre que escribiste no coincide con el de la empresa",
    );
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });

  it("is for super admins only", async () => {
    mockSession = createAdminSession();
    expect((await deleteCompany("company-1", "Acme Smoke Test")).success).toBe(false);
    expect(mockPrisma.company.delete).not.toHaveBeenCalled();
  });
});

describe("employee links of a deactivated company", () => {
  it("only accepts tokens of active companies", async () => {
    mockPrisma.accessToken.findFirst.mockResolvedValue(null);
    expect((await verifyPortalToken("some-token")).success).toBe(false);
    expect(mockPrisma.accessToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company: { isActive: true } }) }),
    );
  });
});
