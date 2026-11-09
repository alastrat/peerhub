/**
 * Personas: every field the employee import loads, each person's role
 * (Miembro unless their account says otherwise) and their platform access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

import { findPendingInvitation, listPeople } from "@/lib/queries/people";

const NOW = new Date("2026-11-08T12:00:00Z");

const imported = {
  nationalId: "1020304050",
  title: "Analista",
  jobLevel: "STAFF",
  startDate: new Date("2022-03-15T00:00:00Z"),
  gender: "FEMALE",
  birthDate: new Date("1990-05-02T00:00:00Z"),
  department: { name: "Ventas" },
  hub: { name: "Bogotá" },
  manager: { name: "Lina Pérez" },
};

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.employee.findMany.mockResolvedValue([
    { id: "e1", name: "Ana Gómez", email: "ana@acme.com", ...imported, companyUser: { role: "ADMIN", isActive: true } },
    { id: "e2", name: "Bruno Díaz", email: "Bruno@Acme.com", ...imported, companyUser: null },
    {
      id: "e3",
      name: "Carla Ruiz",
      email: "carla@acme.com",
      nationalId: null,
      title: null,
      jobLevel: null,
      startDate: null,
      gender: null,
      birthDate: null,
      department: null,
      hub: null,
      manager: null,
      companyUser: null,
    },
  ]);
  mockPrisma.invitation.findMany.mockResolvedValue([{ email: "bruno@acme.com", role: "MANAGER" }]);
});

describe("listPeople", () => {
  it("returns every imported field with role and access", async () => {
    const [ana, bruno, carla] = await listPeople("company-1", NOW);

    expect(ana).toEqual({
      id: "e1",
      name: "Ana Gómez",
      email: "ana@acme.com",
      nationalId: "1020304050",
      title: "Analista",
      department: "Ventas",
      hub: "Bogotá",
      manager: "Lina Pérez",
      jobLevel: "STAFF",
      startDate: new Date("2022-03-15T00:00:00Z"),
      gender: "FEMALE",
      birthDate: new Date("1990-05-02T00:00:00Z"),
      role: "ADMIN",
      access: "ACTIVE",
    });
    // Invitations match by email, whatever the case
    expect(bruno).toMatchObject({ role: "MANAGER", access: "INVITED" });
    // Imported without an invitation: still a member of the roster
    expect(carla).toMatchObject({ role: "MEMBER", access: "NONE", department: null, startDate: null });
  });

  it("selects the imported fields and only pending invitations", async () => {
    await listPeople("company-1", NOW);

    const { where, select } = mockPrisma.employee.findMany.mock.calls[0][0];
    expect(where).toEqual({ companyId: "company-1", isActive: true });
    for (const field of ["nationalId", "email", "title", "jobLevel", "startDate", "gender", "birthDate", "department", "hub", "manager"]) {
      expect(select).toHaveProperty(field);
    }
    expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", acceptedAt: null, expiresAt: { gt: NOW } },
      select: { email: true, role: true },
    });
  });
});

describe("findPendingInvitation", () => {
  it("looks the email up case-insensitively among pending invitations", async () => {
    mockPrisma.invitation.findFirst.mockResolvedValue({ role: "MEMBER", expiresAt: NOW });
    await findPendingInvitation("company-1", "Bruno@Acme.com", NOW);
    expect(mockPrisma.invitation.findFirst).toHaveBeenCalledWith({
      where: { companyId: "company-1", acceptedAt: null, expiresAt: { gt: NOW }, email: { equals: "Bruno@Acme.com", mode: "insensitive" } },
      select: { role: true, expiresAt: true },
    });
  });
});
