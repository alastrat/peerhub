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

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendBulkEmails: vi.fn(() => Promise.resolve({ failureCount: 0 })),
}));

vi.mock("@/lib/email/portal-templates", () => ({
  buildSurveyInvitationEmail: vi.fn(() => ({
    subject: "Test Subject",
    html: "<p>test</p>",
    text: "test",
  })),
}));

// Import AFTER mocks
import { distributeSurvey, closeSurvey } from "@/lib/actions/climate-distribution";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseSurvey = {
  id: "s1",
  companyId: "company-1",
  isAnonymous: false,
  status: "DRAFT",
  name: "Climate Survey Q1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseDueDate = new Date("2026-04-01");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("climate distribution actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // distributeSurvey
  // =========================================================================

  describe("distributeSurvey", () => {
    it("should distribute to ALL active employees", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: "e1", name: "Alice", email: "alice@acme.com" },
        { id: "e2", name: "Bob", email: "bob@acme.com" },
      ]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "d1" });
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
        where: { companyId: "company-1", isActive: true },
        select: { id: true, name: true, email: true },
      });
      expect(mockPrisma.surveyDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          surveyId: "s1",
          targetType: "ALL",
          targetIds: [],
          dueDate: baseDueDate,
          responses: {
            create: [
              { employeeId: "e1" },
              { employeeId: "e2" },
            ],
          },
        }),
      });
    });

    it("should distribute to employees in specified HUBs", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([{ id: "e1", name: "Alice", email: "alice@acme.com" }]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "HUB",
        targetIds: ["hub1"],
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
        where: { companyId: "company-1", isActive: true, hubId: { in: ["hub1"] } },
        select: { id: true, name: true, email: true },
      });
      expect(mockPrisma.surveyDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetType: "HUB",
          targetIds: ["hub1"],
          responses: {
            create: [{ employeeId: "e1" }],
          },
        }),
      });
    });

    it("should distribute to employees in specified DEPARTMENTs", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([{ id: "e1", name: "Alice", email: "alice@acme.com" }]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "DEPARTMENT",
        targetIds: ["dept1"],
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
        where: { companyId: "company-1", isActive: true, departmentId: { in: ["dept1"] } },
        select: { id: true, name: true, email: true },
      });
      expect(mockPrisma.surveyDistribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetType: "DEPARTMENT",
          targetIds: ["dept1"],
          responses: {
            create: [{ employeeId: "e1" }],
          },
        }),
      });
    });

    it("should distribute to TEAM members with deduplication", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.teamMember.findMany.mockResolvedValue([
        { employee: { id: "e1", name: "Alice", email: "alice@acme.com" } },
        { employee: { id: "e1", name: "Alice", email: "alice@acme.com" } },
        { employee: { id: "e2", name: "Bob", email: "bob@acme.com" } },
      ]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "TEAM",
        targetIds: ["t1"],
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith({
        where: {
          team: { companyId: "company-1", id: { in: ["t1"] } },
          employee: { isActive: true },
        },
        select: {
          employee: { select: { id: true, name: true, email: true } },
        },
      });

      // Verify deduplication: only 2 unique employees
      const createCall = mockPrisma.surveyDistribution.create.mock.calls[0][0];
      expect(createCall.data.responses.create).toHaveLength(2);
      expect(createCall.data.responses.create).toEqual(
        expect.arrayContaining([
          { employeeId: "e1" },
          { employeeId: "e2" },
        ])
      );
    });

    it("should distribute to CUSTOM employee list", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: "e1", name: "Alice", email: "alice@acme.com" },
        { id: "e2", name: "Bob", email: "bob@acme.com" },
      ]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "CUSTOM",
        targetIds: ["e1", "e2"],
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["e1", "e2"] }, companyId: "company-1", isActive: true },
        select: { id: true, name: true, email: true },
      });
    });

    it("should return error when survey not found", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

      const result = await distributeSurvey({
        surveyId: "nonexistent",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should return error when no targetIds for HUB scope", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "HUB",
        targetIds: undefined,
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Select at least one hub");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should return error when no targetIds for DEPARTMENT scope", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "DEPARTMENT",
        targetIds: undefined,
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Select at least one department");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should return error when no targetIds for TEAM scope", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "TEAM",
        targetIds: undefined,
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Select at least one team");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should return error when no targetIds for CUSTOM scope", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "CUSTOM",
        targetIds: undefined,
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Select at least one employee");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should return error when resolved employees list is empty", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([]);

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No employees found for the selected target");
      expect(mockPrisma.surveyDistribution.create).not.toHaveBeenCalled();
    });

    it("should keep employeeId for anonymous surveys (anonymity handled at read time)", async () => {
      const anonymousSurvey = { ...baseSurvey, isAnonymous: true };
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(anonymousSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: "e1" },
        { id: "e2" },
      ]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(true);

      const createCall = mockPrisma.surveyDistribution.create.mock.calls[0][0];
      expect(createCall.data.responses.create).toEqual([
        { employeeId: "e1" },
        { employeeId: "e2" },
      ]);
    });

    it("should transition DRAFT survey to ACTIVE on distribution", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
      mockPrisma.employee.findMany.mockResolvedValue([{ id: "e1" }]);
      mockPrisma.surveyDistribution.create.mockResolvedValue({ id: "d1" });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      await distributeSurvey({
        surveyId: "s1",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { status: "ACTIVE" },
      });
    });

    it("should require admin role", async () => {
      mockSession = createMemberSession();

      const result = await distributeSurvey({
        surveyId: "s1",
        targetType: "ALL",
        dueDate: baseDueDate,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to distribute survey");
      expect(mockPrisma.climateSurvey.findFirst).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // closeSurvey
  // =========================================================================

  describe("closeSurvey", () => {
    it("should close an active survey", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...baseSurvey,
        status: "ACTIVE",
      });
      mockPrisma.climateSurvey.update.mockResolvedValue({});

      const result = await closeSurvey("s1");

      expect(result.success).toBe(true);
      expect(mockPrisma.climateSurvey.findFirst).toHaveBeenCalledWith({
        where: { id: "s1", companyId: "company-1" },
      });
      expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { status: "CLOSED" },
      });
    });

    it("should return error when survey not found", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

      const result = await closeSurvey("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Survey not found");
      expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
    });

    it("should return error when survey is not active", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...baseSurvey,
        status: "DRAFT",
      });

      const result = await closeSurvey("s1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Only active surveys can be closed");
      expect(mockPrisma.climateSurvey.update).not.toHaveBeenCalled();
    });

    it("should require admin role", async () => {
      mockSession = createMemberSession();

      const result = await closeSurvey("s1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.climateSurvey.findFirst).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.climateSurvey.findFirst.mockResolvedValue({
        ...baseSurvey,
        status: "ACTIVE",
      });
      mockPrisma.climateSurvey.update.mockRejectedValue(new Error("DB fail"));

      const result = await closeSurvey("s1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB fail");
    });
  });
});
