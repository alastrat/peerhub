import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/email/portal-templates", () => ({
  sendPortalMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    __esModule: true,
    ...actual,
    default: { ...actual, randomUUID: () => "mock-notify-token" },
    randomUUID: () => "mock-notify-token",
  };
});

import { notifyEmployee } from "@/lib/utils/notify-employee";
import { sendPortalMagicLinkEmail } from "@/lib/email/portal-templates";

describe("notifyEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it("silently returns when employee not found", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const sendMemberEmail = vi.fn();

    await notifyEmployee({
      employeeId: "nonexistent",
      subject: "Test",
      dashboardUrl: "/my-reviews",
      sendMemberEmail,
    });

    expect(sendMemberEmail).not.toHaveBeenCalled();
    expect(sendPortalMagicLinkEmail).not.toHaveBeenCalled();
  });

  it("sends dashboard email when employee has CompanyUser", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp-1",
      email: "member@acme.com",
      name: "John Member",
      companyId: "company-1",
      companyUser: { id: "cu-1" }, // Has platform access
    });

    const sendMemberEmail = vi.fn();

    await notifyEmployee({
      employeeId: "emp-1",
      subject: "Review Assigned",
      dashboardUrl: "/my-reviews",
      sendMemberEmail,
    });

    expect(sendMemberEmail).toHaveBeenCalledWith(
      "member@acme.com",
      "John Member",
      "http://localhost:4999/my-reviews"
    );
    expect(sendPortalMagicLinkEmail).not.toHaveBeenCalled();
    expect(mockPrisma.accessToken.create).not.toHaveBeenCalled();
  });

  it("sends portal magic link when employee has no CompanyUser", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp-2",
      email: "external@acme.com",
      name: "Jane External",
      companyId: "company-1",
      companyUser: null, // No platform access
    });
    mockPrisma.accessToken.create.mockResolvedValue({});

    const sendMemberEmail = vi.fn();

    await notifyEmployee({
      employeeId: "emp-2",
      subject: "Review Assigned",
      dashboardUrl: "/my-reviews",
      sendMemberEmail,
    });

    expect(sendMemberEmail).not.toHaveBeenCalled();
    expect(mockPrisma.accessToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: "mock-notify-token",
        email: "external@acme.com",
        companyId: "company-1",
        employeeId: "emp-2",
        purpose: "EMPLOYEE_PORTAL",
      }),
    });
    expect(sendPortalMagicLinkEmail).toHaveBeenCalledWith(
      "external@acme.com",
      "Jane External",
      "http://localhost:4999/portal/verify/mock-notify-token"
    );
  });

  it("handles absolute dashboard URLs", async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: "emp-1",
      email: "member@acme.com",
      name: "John",
      companyId: "company-1",
      companyUser: { id: "cu-1" },
    });

    const sendMemberEmail = vi.fn();

    await notifyEmployee({
      employeeId: "emp-1",
      subject: "Test",
      dashboardUrl: "https://custom.domain.com/reviews",
      sendMemberEmail,
    });

    expect(sendMemberEmail).toHaveBeenCalledWith(
      "member@acme.com",
      "John",
      "https://custom.domain.com/reviews"
    );
  });
});
