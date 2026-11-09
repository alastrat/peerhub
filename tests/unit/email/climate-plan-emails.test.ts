/**
 * emailUsersViaDashboard: follow-up users and addresses typed in by hand each
 * get one email.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;
const sendEmail = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));

import { emailEmployeeViaPortal, emailUsersViaDashboard, planEmails } from "@/lib/email/climate-plan-emails";

const build = planEmails.planSubmitted("Sara", "Pausas activas", "Calidad de vida", "Clima 2026");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockPrisma.company.findUnique.mockResolvedValue({ locale: "es" });
  sendEmail.mockResolvedValue({ success: true });
});

describe("emailUsersViaDashboard", () => {
  it("emails the follow-up users and the typed addresses, once per address", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { email: "Ana@Kultiva.com.co", name: "Ana" },
      { email: "luis@kultiva.com.co", name: null },
    ]);

    const sent = await emailUsersViaDashboard("company-1", ["u1", "u2"], "/surveys/climate/s1", build, [
      "ana@kultiva.com.co",
      " pablo@cliente.com ",
    ]);

    expect(sent).toBe(3);
    expect(sendEmail.mock.calls.map(([arg]) => (arg as { to: string }).to)).toEqual([
      "ana@kultiva.com.co",
      "luis@kultiva.com.co",
      "pablo@cliente.com",
    ]);
  });

  it("emails typed addresses when no user follows up", async () => {
    const sent = await emailUsersViaDashboard("company-1", [], "/surveys/climate/s1", build, ["pablo@cliente.com"]);

    expect(sent).toBe(1);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "pablo@cliente.com" }));
  });

  it("sends nothing when nobody follows up", async () => {
    expect(await emailUsersViaDashboard("company-1", [], "/", build)).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("emailEmployeeViaPortal", () => {
  it("emails a task owner a portal link", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "e1", name: "Santi", email: "santi@acme.com", companyId: "company-1", isActive: true, company: { locale: "es" } });
    expect(await emailEmployeeViaPortal("e1", "/portal/my-tasks", build)).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "santi@acme.com" }));
  });

  it("sends nothing, and makes no sign-in link, for someone without an email", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: "e2", name: "Sin Correo", email: null, companyId: "company-1", isActive: true, company: { locale: "es" } });
    expect(await emailEmployeeViaPortal("e2", "/portal/my-tasks", build)).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(mockPrisma.accessToken.create).not.toHaveBeenCalled();
  });
});
