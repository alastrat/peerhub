import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession } from "../../helpers/mock-session";

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
import { POST } from "@/app/api/people/import/route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/people/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

// One row as the wizard sends it from Kultiva's template
const ROW = {
  nationalId: "1032456789",
  name: "Daniela Ospina Cárdenas",
  email: "daniela.ospina@acme.com.co",
  title: "Analista de Talento Humano",
  hub: "Bogotá",
  department: "Talento Humano",
  managerName: "Luisa Fernanda Martínez Ochoa",
  managerNationalId: "52987654",
  startDate: "2021-05-17",
  gender: "FEMALE",
  birthDate: "1996-07-25",
  jobLevel: "STAFF",
};

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession("company-1");
  mockPrisma.employee.findFirst.mockResolvedValue(null);
  mockPrisma.employee.findUnique.mockResolvedValue(null);
  mockPrisma.employee.findMany.mockResolvedValue([]);
  mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-th" });
  mockPrisma.hub.findFirst.mockResolvedValue(null);
  mockPrisma.hub.create.mockResolvedValue({ id: "hub-bog" });
  mockPrisma.employee.create.mockImplementation(({ data }) => Promise.resolve({ id: "emp-new", ...data }));
});

describe("POST /api/people/import", () => {
  it("is admin-only", async () => {
    mockSession = createMemberSession("company-1");
    const response = await POST(request(ROW));
    expect(response.status).toBe(401);
  });

  it("stores cédula, job level and hub, and links the leader by cédula", async () => {
    // Uniqueness check for the person's cédula, then the leader lookup
    mockPrisma.employee.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(where.companyId_nationalId?.nationalId === "52987654" ? { id: "emp-luisa" } : null),
    );

    const response = await POST(request(ROW));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warning).toBeUndefined();
    expect(mockPrisma.hub.create).toHaveBeenCalledWith({
      data: { name: "Bogotá", companyId: "company-1" },
      select: { id: true },
    });
    expect(mockPrisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          nationalId: "1032456789",
          jobLevel: "STAFF",
          hubId: "hub-bog",
          departmentId: "dept-th",
          managerId: "emp-luisa",
          gender: "FEMALE",
          startDate: new Date("2021-05-17"),
        }),
      }),
    );
    // No role column → no platform access
    expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
  });

  it("reuses an existing hub whatever its case", async () => {
    mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-existing" });
    await POST(request({ ...ROW, hub: "BOGOTÁ" }));
    expect(mockPrisma.hub.findFirst).toHaveBeenCalledWith({
      where: { companyId: "company-1", name: { equals: "BOGOTÁ", mode: "insensitive" } },
      select: { id: true },
    });
    expect(mockPrisma.hub.create).not.toHaveBeenCalled();
    expect(mockPrisma.employee.create.mock.calls[0][0].data.hubId).toBe("hub-existing");
  });

  it("falls back to the leader's name when the cédula isn't found, but only if it's unambiguous", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([{ id: "emp-luisa" }]);
    await POST(request(ROW));
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", name: { equals: "Luisa Fernanda Martínez Ochoa", mode: "insensitive" } },
      select: { id: true },
      take: 2,
    });
    expect(mockPrisma.employee.create.mock.calls[0][0].data.managerId).toBe("emp-luisa");

    mockPrisma.employee.create.mockClear();
    mockPrisma.employee.findMany.mockResolvedValue([{ id: "emp-luisa" }, { id: "emp-luisa-2" }]);
    const response = await POST(request(ROW));
    const body = await response.json();
    expect(mockPrisma.employee.create.mock.calls[0][0].data.managerId).toBeUndefined();
    // Imported anyway; the wizard lists the notice
    expect(response.status).toBe(200);
    expect(body.warning).toBe("se importó sin líder porque no encontramos a «Luisa Fernanda Martínez Ochoa»");
  });

  it("rejects a cédula that already exists in the company", async () => {
    mockPrisma.employee.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(where.companyId_nationalId?.nationalId === "1032456789" ? { id: "emp-daniela" } : null),
    );
    const response = await POST(request({ ...ROW, nationalId: "1.032.456.789" }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Ya existe un colaborador con la cédula 1032456789 en la empresa");
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it("rejects an email that already exists, ignoring case", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp-daniela" });
    const response = await POST(request({ ...ROW, email: "Daniela.Ospina@acme.com.co" }));
    expect(response.status).toBe(400);
    expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith({
      where: { companyId: "company-1", email: { equals: "Daniela.Ospina@acme.com.co", mode: "insensitive" } },
      select: { id: true },
    });
  });

  it("rejects an unknown job level", async () => {
    const response = await POST(request({ ...ROW, jobLevel: "Presidente" }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('Nivel jerárquico desconocido "Presidente"');
  });

  it("still accepts the old CSV's rows (email-linked leader, role)", async () => {
    mockPrisma.employee.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(where.email?.equals === "boss@acme.com" ? { id: "emp-boss" } : null),
    );
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "user-new" });

    const response = await POST(request({ email: "ana@acme.com", name: "Ana", managerEmail: "boss@acme.com", role: "MEMBER" }));
    expect(response.status).toBe(200);
    expect(mockPrisma.employee.create.mock.calls[0][0].data).toMatchObject({
      nationalId: null,
      jobLevel: null,
      managerId: "emp-boss",
    });
    expect(mockPrisma.companyUser.create).toHaveBeenCalled();
  });
});
