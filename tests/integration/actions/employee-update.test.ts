import { describe, it, expect, vi, beforeEach } from "vitest";
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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email/templates", () => ({ sendInvitationEmail: vi.fn() }));

import { updateEmployee, deactivateEmployee, createUser } from "@/lib/actions/users";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  // Run transactions against the same mock so the writes inside them can be asserted
  mockPrisma.$transaction.mockImplementation((fn: (tx: MockPrismaClient) => Promise<unknown>) => fn(mockPrisma));
  mockSession = createAdminSession();
});

describe("updateEmployee", () => {
  it("updates demographics for an employee without platform access", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: null });
    mockPrisma.employee.update.mockResolvedValue({});

    const res = await updateEmployee("emp-1", { gender: "FEMALE", birthDate: "1990-05-02", startDate: "2021-02-01" });

    expect(res).toEqual({ success: true });
    expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "emp-1", companyId: "company-1" } }),
    );
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { gender: "FEMALE", birthDate: new Date("1990-05-02"), startDate: new Date("2021-02-01") },
    });
    expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
  });

  it("clears demographics with empty form values", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: null });
    await updateEmployee("emp-1", { gender: "none", birthDate: "" });
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { gender: null, birthDate: null },
    });
  });

  it("saves cédula and job level, normalizing the cédula and clearing with empty values", async () => {
    mockPrisma.employee.findFirst.mockResolvedValueOnce({ id: "emp-1", companyUser: null }).mockResolvedValueOnce(null);
    expect(await updateEmployee("emp-1", { nationalId: " 52.987.654 ", jobLevel: "MANAGER" })).toEqual({ success: true });
    // Uniqueness is checked against the company's other employees
    expect(mockPrisma.employee.findFirst).toHaveBeenLastCalledWith({
      where: { companyId: "company-1", nationalId: "52987654", id: { not: "emp-1" } },
      select: { id: true },
    });
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { nationalId: "52987654", jobLevel: "MANAGER" },
    });

    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: null });
    await updateEmployee("emp-1", { nationalId: "", jobLevel: "none" });
    expect(mockPrisma.employee.update).toHaveBeenLastCalledWith({
      where: { id: "emp-1" },
      data: { nationalId: null, jobLevel: null },
    });
  });

  it("rejects a cédula another employee already has", async () => {
    mockPrisma.employee.findFirst
      .mockResolvedValueOnce({ id: "emp-1", companyUser: null })
      .mockResolvedValueOnce({ id: "emp-2" });
    expect(await updateEmployee("emp-1", { nationalId: "79845123" })).toEqual({
      success: false,
      error: "Ya hay otro colaborador de la empresa con esta cédula",
    });
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("updates the linked CompanyUser role and status", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: { id: "cu-1" } });
    await updateEmployee("emp-1", { role: "MANAGER", isActive: false, title: "Lead" });
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { title: "Lead", isActive: false },
    });
    expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({
      where: { id: "cu-1" },
      data: { role: "MANAGER", isActive: false },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.invitation.updateMany).not.toHaveBeenCalled();
  });

  it("without an account, changes the role their pending invitation gives", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", email: "ana@acme.com", companyUser: null });
    await updateEmployee("emp-1", { role: "ADMIN" });
    expect(mockPrisma.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
        email: { equals: "ana@acme.com", mode: "insensitive" },
      },
      data: { role: "ADMIN" },
    });
    expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
  });

  it("rejects invalid input, self-management and other companies' employees", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: null });
    expect((await updateEmployee("emp-1", { gender: "ALIEN" as never })).success).toBe(false);
    expect((await updateEmployee("emp-1", { birthDate: "2999-01-01" })).error).toBe("Invalid date of birth");
    expect((await updateEmployee("emp-1", { managerId: "emp-1" })).error).toBe("An employee can't be their own manager");
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    expect((await updateEmployee("emp-x", { title: "x" })).error).toBe("Employee not found");
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("requires an admin", async () => {
    mockSession = createMemberSession();
    expect((await updateEmployee("emp-1", { title: "x" })).error).toBe("Unauthorized");
  });
});

describe("deactivateEmployee", () => {
  it("deactivates the employee and their platform access", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: { id: "cu-1" } });
    expect(await deactivateEmployee("emp-1")).toEqual({ success: true });
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({ where: { id: "emp-1" }, data: { isActive: false } });
    expect(mockPrisma.companyUser.update).toHaveBeenCalledWith({ where: { id: "cu-1" }, data: { isActive: false } });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("fails as a whole when the account update fails", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-1", companyUser: { id: "cu-1" } });
    mockPrisma.companyUser.update.mockRejectedValue(new Error("db down"));
    expect((await deactivateEmployee("emp-1")).success).toBe(false);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("works for employees without platform access", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-2", companyUser: null });
    expect(await deactivateEmployee("emp-2")).toEqual({ success: true });
    expect(mockPrisma.companyUser.update).not.toHaveBeenCalled();
  });
});

describe("createUser demographics", () => {
  it("stores gender and birth date on the employee", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1" });
    mockPrisma.companyUser.findFirst.mockResolvedValue(null);
    mockPrisma.hub.findFirst.mockResolvedValue(null);
    mockPrisma.employee.create.mockResolvedValue({ id: "emp-9" });
    mockPrisma.companyUser.create.mockResolvedValue({ id: "cu-9" });

    await createUser({ email: "a@b.co", name: "Ana", gender: "FEMALE", birthDate: "1992-03-04" });

    expect(mockPrisma.employee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ gender: "FEMALE", birthDate: new Date("1992-03-04") }),
    });
  });

  it("rejects a future or pre-1900 birth date before writing anything", async () => {
    for (const birthDate of ["2999-01-01", "1850-06-01"]) {
      expect(await createUser({ email: "a@b.co", name: "Ana", birthDate })).toEqual({
        success: false,
        error: "Invalid date of birth",
      });
    }
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });
});

describe("createUser cédula and job level", () => {
  it("stores them, with the cédula normalized", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1" });
    mockPrisma.companyUser.findFirst.mockResolvedValue(null);
    mockPrisma.hub.findFirst.mockResolvedValue(null);
    mockPrisma.employee.create.mockResolvedValue({ id: "emp-9" });
    mockPrisma.companyUser.create.mockResolvedValue({ id: "cu-9" });

    await createUser({ email: "a@b.co", name: "Ana", nationalId: "1.032.456.789", jobLevel: "COORDINATOR" });

    expect(mockPrisma.employee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nationalId: "1032456789", jobLevel: "COORDINATOR" }),
    });
  });

  it("rejects a cédula already in the company before writing anything", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-2" });
    expect(await createUser({ email: "a@b.co", name: "Ana", nationalId: "79845123" })).toEqual({
      success: false,
      error: "Ya hay otro colaborador de la empresa con esta cédula",
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });
});
