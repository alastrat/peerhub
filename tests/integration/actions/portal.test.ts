import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";

// Mock prisma before importing actions
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
    default: { ...actual, randomUUID: () => "mock-uuid-token" },
    randomUUID: () => "mock-uuid-token",
  };
});

import { requestPortalAccess, verifyPortalToken, getPortalDashboard } from "@/lib/actions/portal";
import { sendPortalMagicLinkEmail } from "@/lib/email/portal-templates";

describe("portal actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  describe("requestPortalAccess", () => {
    it("returns success even if employee not found (prevents enumeration)", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      const result = await requestPortalAccess("nonexistent@example.com");

      expect(result.success).toBe(true);
      expect(mockPrisma.accessToken.create).not.toHaveBeenCalled();
      expect(sendPortalMagicLinkEmail).not.toHaveBeenCalled();
    });

    it("creates access token and sends email for valid employee", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-1",
        email: "test@acme.com",
        name: "Test User",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.accessToken.create.mockResolvedValue({});

      const result = await requestPortalAccess("Test@Acme.com");

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith({
        where: {
          email: "test@acme.com",
          isActive: true,
        },
      });
      expect(mockPrisma.accessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: "mock-uuid-token",
          email: "test@acme.com",
          companyId: "company-1",
          employeeId: "emp-1",
          purpose: "EMPLOYEE_PORTAL",
        }),
      });
      expect(sendPortalMagicLinkEmail).toHaveBeenCalledWith(
        "test@acme.com",
        "Test User",
        "http://localhost:4999/portal/verify/mock-uuid-token"
      );
    });

    it("normalizes email to lowercase", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      await requestPortalAccess("  USER@ACME.COM  ");

      expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith({
        where: {
          email: "user@acme.com",
          isActive: true,
        },
      });
    });

    it("returns error on unexpected failure", async () => {
      mockPrisma.employee.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await requestPortalAccess("test@acme.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("verifyPortalToken", () => {
    it("returns error for invalid token", async () => {
      mockPrisma.accessToken.findFirst.mockResolvedValue(null);

      const result = await verifyPortalToken("invalid-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired");
    });

    it("verifies valid token and marks as used", async () => {
      mockPrisma.accessToken.findFirst.mockResolvedValue({
        id: "at-1",
        token: "valid-token",
        email: "test@acme.com",
        companyId: "company-1",
        employeeId: "emp-1",
        purpose: "EMPLOYEE_PORTAL",
        employee: {
          id: "emp-1",
          email: "test@acme.com",
          companyId: "company-1",
        },
        usedAt: null,
      });
      mockPrisma.accessToken.update.mockResolvedValue({});

      const result = await verifyPortalToken("valid-token");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        employeeId: "emp-1",
        companyId: "company-1",
        email: "test@acme.com",
      });
      expect(mockPrisma.accessToken.update).toHaveBeenCalledWith({
        where: { id: "at-1" },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("returns error when token has no employee", async () => {
      mockPrisma.accessToken.findFirst.mockResolvedValue({
        id: "at-1",
        employee: null,
      });

      const result = await verifyPortalToken("orphan-token");

      expect(result.success).toBe(false);
    });
  });

  describe("getPortalDashboard", () => {
    it("returns pending reviews, nominations, and reports", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([
        {
          id: "ra-1",
          reviewerType: "PEER",
          reviewee: { name: "John Doe" },
          cycle: {
            name: "Q1 Review",
            reviewEndDate: new Date("2025-06-15"),
          },
        },
      ]);

      mockPrisma.cycleParticipant.findMany
        .mockResolvedValueOnce([
          {
            cycle: {
              id: "cycle-1",
              name: "Q1 Review",
              minPeers: 2,
              maxPeers: 5,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            cycle: { id: "cycle-2", name: "Q4 Review" },
            releasedAt: new Date("2025-01-15"),
          },
        ]);

      const result = await getPortalDashboard("emp-1");

      expect(result.pendingReviews).toHaveLength(1);
      expect(result.pendingReviews[0].revieweeName).toBe("John Doe");
      expect(result.pendingNominations).toHaveLength(1);
      expect(result.pendingNominations[0].cycleName).toBe("Q1 Review");
      expect(result.releasedReports).toHaveLength(1);
      expect(result.releasedReports[0].cycleName).toBe("Q4 Review");
    });

    it("returns empty arrays when no data", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);

      const result = await getPortalDashboard("emp-1");

      expect(result.pendingReviews).toEqual([]);
      expect(result.pendingNominations).toEqual([]);
      expect(result.releasedReports).toEqual([]);
    });
  });
});
