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

    it("includes redirectTo in magic link when it starts with /portal/", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-1",
        email: "test@acme.com",
        name: "Test User",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.accessToken.create.mockResolvedValue({});

      await requestPortalAccess("test@acme.com", "/portal/climate-survey/dist-1");

      expect(sendPortalMagicLinkEmail).toHaveBeenCalledWith(
        "test@acme.com",
        "Test User",
        expect.stringContaining("?redirect=%2Fportal%2Fclimate-survey%2Fdist-1")
      );
    });

    it("ignores redirectTo that does not start with /portal/", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-1",
        email: "test@acme.com",
        name: "Test User",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.accessToken.create.mockResolvedValue({});

      await requestPortalAccess("test@acme.com", "/admin/dashboard");

      expect(sendPortalMagicLinkEmail).toHaveBeenCalledWith(
        "test@acme.com",
        "Test User",
        expect.stringMatching(/\/portal\/verify\/mock-uuid-token$/) // no ?redirect= appended
      );
    });

    it("marks token as used when email delivery fails", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue({
        id: "emp-1",
        email: "test@acme.com",
        name: "Test User",
        companyId: "company-1",
        isActive: true,
      });
      mockPrisma.accessToken.create.mockResolvedValue({});
      vi.mocked(sendPortalMagicLinkEmail).mockRejectedValue(new Error("SMTP down"));
      mockPrisma.accessToken.update.mockResolvedValue({});

      const result = await requestPortalAccess("test@acme.com");

      // Still returns success to prevent email enumeration
      expect(result.success).toBe(true);
      expect(mockPrisma.accessToken.update).toHaveBeenCalledWith({
        where: { token: "mock-uuid-token" },
        data: { usedAt: expect.any(Date) },
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

    it("handles database errors gracefully", async () => {
      mockPrisma.accessToken.findFirst.mockRejectedValue(new Error("DB crashed"));

      const result = await verifyPortalToken("any-token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("queries with correct filters for unexpired unused tokens", async () => {
      mockPrisma.accessToken.findFirst.mockResolvedValue(null);

      await verifyPortalToken("some-token");

      expect(mockPrisma.accessToken.findFirst).toHaveBeenCalledWith({
        where: {
          token: "some-token",
          purpose: "EMPLOYEE_PORTAL",
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        include: { employee: true },
      });
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

      mockPrisma.employee.findUnique.mockResolvedValue(null);

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
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const result = await getPortalDashboard("emp-1");

      expect(result.pendingReviews).toEqual([]);
      expect(result.pendingNominations).toEqual([]);
      expect(result.releasedReports).toEqual([]);
      expect(result.pendingClimateSurveys).toEqual([]);
    });

    it("returns empty climate surveys when employee not found", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const result = await getPortalDashboard("nonexistent-emp");

      expect(result.pendingClimateSurveys).toEqual([]);
      expect(mockPrisma.surveyDistribution.findMany).not.toHaveBeenCalled();
    });

    it("includes pending climate surveys with target filters", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue({
        companyId: "company-1",
        departmentId: "dept-1",
        hubId: "hub-1",
        teamMemberships: [{ teamId: "team-1" }, { teamId: "team-2" }],
      });
      mockPrisma.surveyDistribution.findMany.mockResolvedValue([
        {
          id: "dist-1",
          dueDate: new Date("2025-07-01"),
          survey: {
            id: "survey-1",
            name: "Q2 Climate Check",
            type: "CLIMATE",
            isAnonymous: true,
          },
        },
      ]);

      const result = await getPortalDashboard("emp-1");

      expect(result.pendingClimateSurveys).toHaveLength(1);
      expect(result.pendingClimateSurveys[0]).toEqual({
        distributionId: "dist-1",
        surveyName: "Q2 Climate Check",
        surveyType: "CLIMATE",
        dueDate: new Date("2025-07-01").toISOString(),
        isAnonymous: true,
      });

      // Verify the target filters include department, hub, team, custom, and ALL
      const findManyCall = mockPrisma.surveyDistribution.findMany.mock.calls[0][0];
      const orFilters = findManyCall.where.OR;
      expect(orFilters).toEqual(expect.arrayContaining([
        { targetType: "ALL" },
        { targetType: "DEPARTMENT", targetIds: { has: "dept-1" } },
        { targetType: "HUB", targetIds: { has: "hub-1" } },
        { targetType: "TEAM", targetIds: { hasSome: ["team-1", "team-2"] } },
        { targetType: "CUSTOM", targetIds: { has: "emp-1" } },
      ]));
    });

    it("omits department/hub/team filters when employee lacks them", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue({
        companyId: "company-1",
        departmentId: null,
        hubId: null,
        teamMemberships: [],
      });
      mockPrisma.surveyDistribution.findMany.mockResolvedValue([]);

      await getPortalDashboard("emp-1");

      const findManyCall = mockPrisma.surveyDistribution.findMany.mock.calls[0][0];
      const orFilters = findManyCall.where.OR;
      // Should only have ALL and CUSTOM, not DEPARTMENT/HUB/TEAM
      expect(orFilters).toEqual([
        { targetType: "ALL" },
        { targetType: "CUSTOM", targetIds: { has: "emp-1" } },
      ]);
    });

    it("filters climate distributions by active survey and company", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue({
        companyId: "company-1",
        departmentId: null,
        hubId: null,
        teamMemberships: [],
      });
      mockPrisma.surveyDistribution.findMany.mockResolvedValue([]);

      await getPortalDashboard("emp-1");

      const findManyCall = mockPrisma.surveyDistribution.findMany.mock.calls[0][0];
      expect(findManyCall.where.survey).toEqual({
        status: "ACTIVE",
        companyId: "company-1",
      });
      expect(findManyCall.where.NOT).toEqual({
        responses: { some: { employeeId: "emp-1", isComplete: true } },
      });
    });

    it("returns multiple pending reviews sorted by due date", async () => {
      mockPrisma.reviewAssignment.findMany.mockResolvedValue([
        {
          id: "ra-1",
          reviewerType: "PEER",
          reviewee: { name: "Alice" },
          cycle: { name: "Q1", reviewEndDate: new Date("2025-03-15") },
        },
        {
          id: "ra-2",
          reviewerType: "MANAGER",
          reviewee: { name: "Bob" },
          cycle: { name: "Q2", reviewEndDate: new Date("2025-06-15") },
        },
      ]);
      mockPrisma.cycleParticipant.findMany.mockResolvedValue([]);
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const result = await getPortalDashboard("emp-1");

      expect(result.pendingReviews).toHaveLength(2);
      expect(result.pendingReviews[0].revieweeName).toBe("Alice");
      expect(result.pendingReviews[0].reviewerType).toBe("PEER");
      expect(result.pendingReviews[1].revieweeName).toBe("Bob");
      expect(result.pendingReviews[1].reviewerType).toBe("MANAGER");
    });
  });
});
