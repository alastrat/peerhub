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

vi.mock("@/lib/email/templates", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  generateInviteToken: vi.fn(() => "invite-token-1"),
  getExpiryDate: vi.fn(() => new Date("2026-11-15T00:00:00Z")),
}));

// Import AFTER mocks
import { POST } from "@/app/api/people/import/route";
import { sendInvitationEmail } from "@/lib/email/templates";
import { EmailDeliveryError } from "@/lib/email/resend";

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
  vi.clearAllMocks();
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
    expect(body.warnings).toBeUndefined();
    expect(body.invited).toBe(false);
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
    // No role column and no invitation → no platform access, no email
    expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
    expect(mockPrisma.invitation.upsert).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });

  it("imports someone without an email, with their mobile number", async () => {
    const { email: _email, ...withoutEmail } = ROW;
    void _email;
    const response = await POST(request({ ...withoutEmail, phone: "+57 300 123 4567" }));

    expect(response.status).toBe(200);
    expect(mockPrisma.employee.create.mock.calls[0][0].data).toMatchObject({ email: null, phone: "+573001234567" });
    // Many people may have no email: there's nothing to compare
    expect(mockPrisma.employee.findFirst).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ email: expect.anything() }) }));
  });

  it("skips the invitation and ignores the role of someone without an email", async () => {
    const { email: _email, ...withoutEmail } = ROW;
    void _email;
    const invited = await (await POST(request({ ...withoutEmail, invite: true, role: "MANAGER" }))).json();
    expect(invited.invited).toBe(false);
    expect(invited.warnings).toContain("se importó sin invitación porque no tiene correo");

    const withRole = await (await POST(request({ ...withoutEmail, role: "MANAGER" }))).json();
    expect(withRole.warnings ?? []).not.toContain("se importó sin invitación porque no tiene correo");
    expect(mockPrisma.invitation.upsert).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid mobile number", async () => {
    const response = await POST(request({ ...ROW, phone: "abc" }));
    expect(response.status).toBe(400);
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
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
    expect(body.warnings).toEqual(["se importó sin líder porque no encontramos a «Luisa Fernanda Martínez Ochoa»"]);
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
      where: { companyId: "company-1", email: { equals: "daniela.ospina@acme.com.co", mode: "insensitive" } },
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

  describe("with the wizard's invitation box checked", () => {
    beforeEach(() => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);
      mockPrisma.invitation.upsert.mockImplementation(({ create }) => Promise.resolve({ id: "inv-1", ...create }));
      mockPrisma.company.findUnique.mockResolvedValue({ name: "Acme Corp", locale: "es" });
    });

    it("invites the new employee as a member and emails the link", async () => {
      const response = await POST(request({ ...ROW, invite: true }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.invited).toBe(true);
      expect(mockPrisma.invitation.upsert).toHaveBeenCalledWith({
        where: { email_companyId: { email: ROW.email, companyId: "company-1" } },
        create: expect.objectContaining({
          email: ROW.email,
          companyId: "company-1",
          role: "MEMBER",
          hubId: "hub-bog",
          departmentId: "dept-th",
          token: "invite-token-1",
          acceptedAt: null,
        }),
        update: expect.objectContaining({ role: "MEMBER", token: "invite-token-1", acceptedAt: null }),
      });
      expect(sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ROW.email,
          companyName: "Acme Corp",
          locale: "es",
          inviteUrl: expect.stringMatching(/\/invite\/invite-token-1$/),
        }),
      );
      // Access comes from accepting the invitation, not from the import
      expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
    });

    it("carries the file's role in the invitation instead of granting access directly", async () => {
      await POST(request({ ...ROW, role: "MANAGER", invite: true }));
      expect(mockPrisma.invitation.upsert.mock.calls[0][0].create.role).toBe("MANAGER");
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
    });

    it("keeps the employee when the email fails, drops the unreachable invitation, and says so", async () => {
      vi.mocked(sendInvitationEmail).mockRejectedValueOnce(new EmailDeliveryError("Resend is down", [ROW.email]));

      const response = await POST(request({ ...ROW, invite: true }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.employee.create).toHaveBeenCalled();
      expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
      expect(body.invited).toBe(false);
      // Next to the leader notice: ROW's leader isn't in this mock company
      expect(body.warnings).toContain("se importó, pero no se pudo enviar la invitación por correo");
    });

    it("refreshes an earlier invitation for the same email, and keeps it if the email fails", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({ id: "inv-old" });
      mockPrisma.invitation.upsert.mockResolvedValue({ id: "inv-old", token: "invite-token-1" });
      vi.mocked(sendInvitationEmail).mockRejectedValueOnce(new EmailDeliveryError("Resend is down", [ROW.email]));

      await POST(request({ ...ROW, invite: true }));

      expect(mockPrisma.invitation.delete).not.toHaveBeenCalled();
    });
  });
});
