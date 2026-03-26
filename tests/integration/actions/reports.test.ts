import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession, createMemberSession, createManagerSession } from "../../helpers/mock-session";

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

const mockSendReportReleasedEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/templates", () => ({
  sendReportReleasedEmail: (...args: unknown[]) => mockSendReportReleasedEmail(...args),
}));

const mockGetEmployeeReport = vi.fn();
const mockGetCycleReportSummary = vi.fn();
vi.mock("@/lib/queries/reports", () => ({
  getEmployeeReport: (...args: unknown[]) => mockGetEmployeeReport(...args),
  getCycleReportSummary: (...args: unknown[]) => mockGetCycleReportSummary(...args),
}));

const mockNotifyEmployee = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/utils/notify-employee", () => ({
  notifyEmployee: (...args: unknown[]) => mockNotifyEmployee(...args),
}));

// Import AFTER mocks
import {
  releaseReport,
  releaseAllReports,
  exportReportCSV,
  unreleaseReport,
} from "@/lib/actions/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleParticipant = {
  id: "cp-1",
  cycleId: "cycle-1",
  employeeId: "emp-1",
  releasedAt: null,
  employee: {
    id: "emp-1",
    name: "John Doe",
    email: "john@acme.com",
    companyId: "company-1",
  },
  cycle: {
    id: "cycle-1",
    name: "Q1 Review",
    companyId: "company-1",
    anonymityThreshold: 3,
  },
};

const sampleReleasedParticipant = {
  ...sampleParticipant,
  releasedAt: new Date("2026-02-01"),
};

const sampleCycle = {
  id: "cycle-1",
  name: "Q1 Review",
  companyId: "company-1",
  anonymityThreshold: 3,
  participants: [
    {
      id: "cp-1",
      cycleId: "cycle-1",
      employeeId: "emp-1",
      releasedAt: null,
      employee: { id: "emp-1", name: "John Doe", email: "john@acme.com" },
    },
    {
      id: "cp-2",
      cycleId: "cycle-1",
      employeeId: "emp-2",
      releasedAt: null,
      employee: { id: "emp-2", name: "Jane Smith", email: "jane@acme.com" },
    },
    {
      id: "cp-3",
      cycleId: "cycle-1",
      employeeId: "emp-3",
      releasedAt: null,
      employee: { id: "emp-3", name: "Bob Brown", email: "bob@acme.com" },
    },
  ],
};

const sampleReport = {
  cycleId: "cycle-1",
  cycleName: "Q1 Review",
  participantId: "emp-1",
  participantName: "John Doe",
  overallScore: 4.2,
  sections: [
    {
      sectionId: "s-1",
      sectionTitle: "Leadership",
      questions: [
        {
          questionId: "q-1",
          questionText: "Rate communication skills",
          questionType: "RATING",
          byReviewerType: {
            PEER: { isVisible: true, rating: { average: 4.5, count: 3 } },
            MANAGER: { isVisible: true, rating: { average: 4.0, count: 1 } },
            SELF: { isVisible: false },
            DIRECT_REPORT: { isVisible: false },
            EXTERNAL: { isVisible: false },
          },
        },
      ],
    },
  ],
};

const sampleCycleSummary = {
  cycleId: "cycle-1",
  cycleName: "Q1 Review",
  participants: [
    {
      participantId: "emp-1",
      participantName: "John Doe",
      email: "john@acme.com",
      completedReviews: 5,
      totalReviews: 6,
      releasedAt: new Date("2026-02-01"),
    },
    {
      participantId: "emp-2",
      participantName: "Jane Smith",
      email: "jane@acme.com",
      completedReviews: 3,
      totalReviews: 5,
      releasedAt: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("report actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // releaseReport
  // =========================================================================

  describe("releaseReport", () => {
    it("releases a report when minimum reviews met", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleParticipant);
      mockPrisma.reviewAssignment.count.mockResolvedValue(4); // >= anonymityThreshold (3)
      mockPrisma.cycleParticipant.update.mockResolvedValue({
        ...sampleParticipant,
        releasedAt: new Date(),
      });

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.cycleParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          employeeId: "emp-1",
          cycle: { companyId: "company-1" },
        },
        include: {
          employee: true,
          cycle: true,
        },
      });
      expect(mockPrisma.reviewAssignment.count).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          revieweeId: "emp-1",
          status: "COMPLETED",
        },
      });
      expect(mockPrisma.cycleParticipant.update).toHaveBeenCalledWith({
        where: { id: "cp-1" },
        data: { releasedAt: expect.any(Date) },
      });
    });

    it("sends email notification by default", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleParticipant);
      mockPrisma.reviewAssignment.count.mockResolvedValue(4);
      mockPrisma.cycleParticipant.update.mockResolvedValue({
        ...sampleParticipant,
        releasedAt: new Date(),
      });

      await releaseReport("cycle-1", "emp-1");

      expect(mockNotifyEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "emp-1",
          subject: expect.stringContaining("Q1 Review"),
          dashboardUrl: "/my-feedback/cycle-1",
        })
      );
    });

    it("skips email when sendEmail is false", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleParticipant);
      mockPrisma.reviewAssignment.count.mockResolvedValue(4);
      mockPrisma.cycleParticipant.update.mockResolvedValue({
        ...sampleParticipant,
        releasedAt: new Date(),
      });

      await releaseReport("cycle-1", "emp-1", false);

      expect(mockNotifyEmployee).not.toHaveBeenCalled();
    });

    it("succeeds even if email sending fails", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleParticipant);
      mockPrisma.reviewAssignment.count.mockResolvedValue(4);
      mockPrisma.cycleParticipant.update.mockResolvedValue({
        ...sampleParticipant,
        releasedAt: new Date(),
      });
      mockNotifyEmployee.mockRejectedValueOnce(new Error("Email failed"));

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(true);
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.cycleParticipant.findFirst).not.toHaveBeenCalled();
    });

    it("returns error when user is not admin", async () => {
      mockSession = createMemberSession();

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when user is manager (not admin)", async () => {
      mockSession = createManagerSession();

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when participant not found", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(null);

      const result = await releaseReport("cycle-1", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Participant not found");
      expect(mockPrisma.reviewAssignment.count).not.toHaveBeenCalled();
    });

    it("returns error when report already released", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleReleasedParticipant);

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Report already released");
      expect(mockPrisma.reviewAssignment.count).not.toHaveBeenCalled();
    });

    it("returns error when below anonymity threshold", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(sampleParticipant);
      mockPrisma.reviewAssignment.count.mockResolvedValue(2); // < anonymityThreshold (3)

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Minimum 3 completed reviews required");
      expect(mockPrisma.cycleParticipant.update).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycleParticipant.findFirst.mockRejectedValue(
        new Error("DB error")
      );

      const result = await releaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to release report");
    });
  });

  // =========================================================================
  // releaseAllReports
  // =========================================================================

  describe("releaseAllReports", () => {
    it("releases reports for all participants meeting threshold", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(sampleCycle);
      // emp-1: 4 completed (>= 3 threshold) => released
      // emp-2: 3 completed (>= 3 threshold) => released
      // emp-3: 1 completed (< 3 threshold) => skipped
      mockPrisma.reviewAssignment.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      mockPrisma.cycleParticipant.update.mockResolvedValue({});

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ released: 2, skipped: 1 });
      expect(mockPrisma.cycleParticipant.update).toHaveBeenCalledTimes(2);
    });

    it("sends emails for each released participant when sendEmails is true", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...sampleCycle,
        participants: [sampleCycle.participants[0]], // just one
      });
      mockPrisma.reviewAssignment.count.mockResolvedValue(5);
      mockPrisma.cycleParticipant.update.mockResolvedValue({});

      await releaseAllReports("cycle-1", true);

      expect(mockNotifyEmployee).toHaveBeenCalledTimes(1);
      expect(mockNotifyEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "emp-1",
          subject: expect.stringContaining("Q1 Review"),
          dashboardUrl: "/my-feedback/cycle-1",
        })
      );
    });

    it("skips emails when sendEmails is false", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...sampleCycle,
        participants: [sampleCycle.participants[0]],
      });
      mockPrisma.reviewAssignment.count.mockResolvedValue(5);
      mockPrisma.cycleParticipant.update.mockResolvedValue({});

      await releaseAllReports("cycle-1", false);

      expect(mockNotifyEmployee).not.toHaveBeenCalled();
    });

    it("continues releasing even if one email fails", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...sampleCycle,
        participants: [sampleCycle.participants[0], sampleCycle.participants[1]],
      });
      mockPrisma.reviewAssignment.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);
      mockPrisma.cycleParticipant.update.mockResolvedValue({});
      // First email fails, second succeeds
      mockNotifyEmployee
        .mockRejectedValueOnce(new Error("SMTP error"))
        .mockResolvedValueOnce(undefined);

      const result = await releaseAllReports("cycle-1", true);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ released: 2, skipped: 0 });
    });

    it("returns all skipped when no participants meet threshold", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(sampleCycle);
      mockPrisma.reviewAssignment.count.mockResolvedValue(0); // nobody has reviews

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ released: 0, skipped: 3 });
      expect(mockPrisma.cycleParticipant.update).not.toHaveBeenCalled();
    });

    it("returns empty counts when no unreleased participants", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue({
        ...sampleCycle,
        participants: [], // query filters releasedAt: null, so empty when all released
      });

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ released: 0, skipped: 0 });
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when user is not admin", async () => {
      mockSession = createMemberSession();

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when cycle not found", async () => {
      mockPrisma.cycle.findFirst.mockResolvedValue(null);

      const result = await releaseAllReports("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycle.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await releaseAllReports("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to release reports");
    });
  });

  // =========================================================================
  // exportReportCSV
  // =========================================================================

  describe("exportReportCSV", () => {
    it("exports individual participant report as CSV", async () => {
      mockGetEmployeeReport.mockResolvedValue(sampleReport);

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(true);
      expect(result.data).toContain("Section,Question,Reviewer Type,Average Rating,Response Count");
      expect(result.data).toContain('"Leadership","Rate communication skills","PEER",4.5,3');
      expect(result.data).toContain('"Leadership","Rate communication skills","MANAGER",4,1');

      expect(mockGetEmployeeReport).toHaveBeenCalledWith({
        cycleId: "cycle-1",
        companyId: "company-1",
        employeeId: "emp-1",
      });
    });

    it("skips non-visible reviewer types in individual export", async () => {
      mockGetEmployeeReport.mockResolvedValue(sampleReport);

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(true);
      // SELF, DIRECT_REPORT, EXTERNAL are not visible so should not appear
      expect(result.data).not.toContain('"SELF"');
      expect(result.data).not.toContain('"DIRECT_REPORT"');
      expect(result.data).not.toContain('"EXTERNAL"');
    });

    it("exports cycle summary CSV when no participantId", async () => {
      mockGetCycleReportSummary.mockResolvedValue(sampleCycleSummary);

      const result = await exportReportCSV("cycle-1");

      expect(result.success).toBe(true);
      expect(result.data).toContain("Participant,Email,Completed Reviews,Total Reviews,Released");
      expect(result.data).toContain('"John Doe","john@acme.com",5,6,Yes');
      expect(result.data).toContain('"Jane Smith","jane@acme.com",3,5,No');

      expect(mockGetCycleReportSummary).toHaveBeenCalledWith({
        cycleId: "cycle-1",
        companyId: "company-1",
      });
    });

    it("returns error when individual report not found", async () => {
      mockGetEmployeeReport.mockResolvedValue(null);

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Report not found");
    });

    it("returns error when cycle summary not found", async () => {
      mockGetCycleReportSummary.mockResolvedValue(null);

      const result = await exportReportCSV("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cycle not found");
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockGetEmployeeReport).not.toHaveBeenCalled();
    });

    it("returns error when user is not admin", async () => {
      mockSession = createMemberSession();

      const result = await exportReportCSV("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles getEmployeeReport errors gracefully", async () => {
      mockGetEmployeeReport.mockRejectedValue(new Error("Query error"));

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to export report");
    });

    it("handles getCycleReportSummary errors gracefully", async () => {
      mockGetCycleReportSummary.mockRejectedValue(new Error("Query error"));

      const result = await exportReportCSV("cycle-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to export report");
    });

    it("exports CSV with only header when report has no visible data", async () => {
      const emptyReport = {
        ...sampleReport,
        sections: [
          {
            sectionId: "s-1",
            sectionTitle: "Leadership",
            questions: [
              {
                questionId: "q-1",
                questionText: "Rate communication",
                questionType: "RATING",
                byReviewerType: {
                  PEER: { isVisible: false },
                  MANAGER: { isVisible: false },
                  SELF: { isVisible: false },
                  DIRECT_REPORT: { isVisible: false },
                  EXTERNAL: { isVisible: false },
                },
              },
            ],
          },
        ],
      };
      mockGetEmployeeReport.mockResolvedValue(emptyReport);

      const result = await exportReportCSV("cycle-1", "emp-1");

      expect(result.success).toBe(true);
      // Should only contain the header row
      expect(result.data).toBe("Section,Question,Reviewer Type,Average Rating,Response Count");
    });
  });

  // =========================================================================
  // unreleaseReport
  // =========================================================================

  describe("unreleaseReport", () => {
    it("unreleases a previously released report", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({
        id: "cp-1",
        cycleId: "cycle-1",
        employeeId: "emp-1",
        releasedAt: new Date("2026-02-01"),
      });
      mockPrisma.cycleParticipant.update.mockResolvedValue({
        id: "cp-1",
        releasedAt: null,
      });

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.cycleParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          cycleId: "cycle-1",
          employeeId: "emp-1",
          cycle: { companyId: "company-1" },
        },
      });
      expect(mockPrisma.cycleParticipant.update).toHaveBeenCalledWith({
        where: { id: "cp-1" },
        data: { releasedAt: null },
      });
    });

    it("returns error when not authenticated", async () => {
      mockSession = null;

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.cycleParticipant.findFirst).not.toHaveBeenCalled();
    });

    it("returns error when user is not admin", async () => {
      mockSession = createMemberSession();

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when participant not found", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue(null);

      const result = await unreleaseReport("cycle-1", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Participant not found");
      expect(mockPrisma.cycleParticipant.update).not.toHaveBeenCalled();
    });

    it("returns error when report is not released", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({
        id: "cp-1",
        cycleId: "cycle-1",
        employeeId: "emp-1",
        releasedAt: null,
      });

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Report not released");
      expect(mockPrisma.cycleParticipant.update).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockPrisma.cycleParticipant.findFirst.mockRejectedValue(
        new Error("DB error")
      );

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to unrelease report");
    });

    it("handles update errors gracefully", async () => {
      mockPrisma.cycleParticipant.findFirst.mockResolvedValue({
        id: "cp-1",
        cycleId: "cycle-1",
        employeeId: "emp-1",
        releasedAt: new Date("2026-02-01"),
      });
      mockPrisma.cycleParticipant.update.mockRejectedValue(
        new Error("Update failed")
      );

      const result = await unreleaseReport("cycle-1", "emp-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to unrelease report");
    });
  });
});
