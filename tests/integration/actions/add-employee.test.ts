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
vi.mock("@/lib/email/templates", () => ({ sendInvitationEmail: vi.fn().mockResolvedValue(undefined) }));

import { addEmployee } from "@/lib/actions/users";
import { sendInvitationEmail } from "@/lib/email/templates";
import { EmailDeliveryError } from "@/lib/email/resend";
import { addEmployeeSchema } from "@/lib/validations/user";

// What the Add employee form sends: the same fields as a row of the import
const INPUT = {
  nationalId: "1.032.456.789",
  name: "Daniela Ospina Cárdenas",
  email: "Daniela.Ospina@acme.com.co",
  title: "Analista de Talento Humano",
  hubId: "hub-bog",
  departmentId: "dept-th",
  managerId: "emp-luisa",
  startDate: "2021-05-17",
  gender: "FEMALE",
  birthDate: "1996-07-25",
  jobLevel: "STAFF",
  invite: false,
  role: "MEMBER",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession();
  // No conflicts; every selected record belongs to the company
  mockPrisma.employee.findFirst.mockImplementation(({ where }) =>
    Promise.resolve(where.id === "emp-luisa" ? { id: "emp-luisa" } : null),
  );
  mockPrisma.employee.findUnique.mockResolvedValue(null);
  mockPrisma.department.findFirst.mockResolvedValue({ id: "dept-th" });
  mockPrisma.hub.findFirst.mockResolvedValue({ id: "hub-bog" });
  mockPrisma.employee.create.mockImplementation(({ data }) => Promise.resolve({ id: "emp-new", ...data }));
  mockPrisma.invitation.findUnique.mockResolvedValue(null);
  mockPrisma.invitation.upsert.mockImplementation(({ create }) => Promise.resolve({ id: "inv-1", ...create }));
  mockPrisma.company.findUnique.mockResolvedValue({ name: "Acme Corp", locale: "es" });
});

describe("addEmployee", () => {
  it("creates the employee with every import field, and sends nothing by default", async () => {
    expect(await addEmployee(INPUT)).toEqual({ success: true, data: { employeeId: "emp-new", invited: false } });

    expect(mockPrisma.employee.create).toHaveBeenCalledWith({
      data: {
        companyId: "company-1",
        nationalId: "1032456789",
        name: "Daniela Ospina Cárdenas",
        email: "daniela.ospina@acme.com.co",
        phone: null,
        title: "Analista de Talento Humano",
        hubId: "hub-bog",
        departmentId: "dept-th",
        managerId: "emp-luisa",
        startDate: new Date("2021-05-17"),
        gender: "FEMALE",
        birthDate: new Date("1996-07-25"),
        jobLevel: "STAFF",
      },
    });
    // Like an import row without the invitation box: no account, no email
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
    expect(mockPrisma.invitation.upsert).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });

  it("only requires cédula, name and email", async () => {
    const result = await addEmployee({ nationalId: "52987654", name: "Luisa", email: "luisa@acme.com.co" });
    expect(result.success).toBe(true);
    expect(mockPrisma.employee.create.mock.calls[0][0].data).toMatchObject({
      hubId: undefined,
      departmentId: undefined,
      managerId: undefined,
      jobLevel: null,
      gender: null,
    });
  });

  it("adds someone without an email, with their mobile number, and never invites them", async () => {
    const result = await addEmployee({ nationalId: "52987654", name: "Luisa", email: "", phone: "300 123 4567", invite: true });
    expect(result).toEqual({
      success: true,
      data: { employeeId: "emp-new", invited: false },
      warning: "El colaborador se agregó sin invitación porque no tiene correo. Responderá las encuestas desde su enlace personal.",
    });
    expect(mockPrisma.employee.create.mock.calls[0][0].data).toMatchObject({ email: null, phone: "3001234567" });
    expect(mockPrisma.invitation.upsert).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });

  it("rejects a missing cédula, like the import", async () => {
    expect(await addEmployee({ ...INPUT, nationalId: " " })).toEqual({
      success: false,
      error: "Revisa los datos del colaborador",
    });
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it("rejects an email or cédula already in the company", async () => {
    mockPrisma.employee.findFirst.mockResolvedValueOnce({ id: "emp-daniela" });
    expect((await addEmployee(INPUT)).error).toBe("Ya hay un colaborador de la empresa con este correo");

    mockPrisma.employee.findUnique.mockResolvedValueOnce({ id: "emp-daniela" });
    expect((await addEmployee(INPUT)).error).toBe("Ya hay otro colaborador de la empresa con esta cédula");
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it("rejects a selected record that isn't in the company", async () => {
    mockPrisma.department.findFirst.mockResolvedValue(null);
    expect((await addEmployee(INPUT)).error).toBe(
      "Una de las opciones elegidas ya no existe. Recarga la página e inténtalo de nuevo.",
    );
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it("invites with the chosen role when the box is checked", async () => {
    const result = await addEmployee({ ...INPUT, invite: true, role: "MANAGER" });

    expect(result).toEqual({ success: true, data: { employeeId: "emp-new", invited: true } });
    expect(mockPrisma.invitation.upsert.mock.calls[0][0].create).toMatchObject({
      email: "daniela.ospina@acme.com.co",
      role: "MANAGER",
      departmentId: "dept-th",
      hubId: "hub-bog",
    });
    expect(sendInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "daniela.ospina@acme.com.co" }));
    expect(mockPrisma.companyUser.create).not.toHaveBeenCalled();
  });

  it("keeps the employee and warns when the invitation email fails", async () => {
    vi.mocked(sendInvitationEmail).mockRejectedValueOnce(new EmailDeliveryError("Resend is down", [INPUT.email]));

    const result = await addEmployee({ ...INPUT, invite: true });

    expect(result).toEqual({
      success: true,
      data: { employeeId: "emp-new", invited: false },
      warning: "El colaborador se agregó, pero no se pudo enviar la invitación por correo",
    });
    expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
  });

  it("requires an admin", async () => {
    mockSession = createMemberSession();
    expect((await addEmployee(INPUT)).error).toBe("No tienes permiso para hacer esto");
  });
});

describe("addEmployeeSchema", () => {
  it("treats empty selects as no selection and leaves invitations off", () => {
    const data = addEmployeeSchema().parse({
      nationalId: "52 987 654",
      name: " Luisa ",
      email: "LUISA@acme.com.co",
      departmentId: "none",
      hubId: "",
      jobLevel: "none",
      gender: "none",
    });
    expect(data).toMatchObject({
      nationalId: "52987654",
      name: "Luisa",
      email: "luisa@acme.com.co",
      departmentId: null,
      hubId: null,
      jobLevel: null,
      gender: null,
      invite: false,
      role: "MEMBER",
    });
  });

  it("uses the form's translated messages", () => {
    const result = addEmployeeSchema({ nationalIdRequired: "La cédula es obligatoria" }).safeParse({
      nationalId: "",
      name: "Luisa",
      email: "luisa@acme.com.co",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["nationalId"], message: "La cédula es obligatoria" });
  });
});
