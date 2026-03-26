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

// Import AFTER mocks
import {
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  getTeams,
  getTeamWithMembers,
} from "@/lib/actions/teams";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("team actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createTeam
  // =========================================================================

  describe("createTeam", () => {
    it("should create a team", async () => {
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.team.create.mockResolvedValue({ id: "team1" });

      const result = await createTeam({ name: "Enterprise Sales" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "team1" });
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Enterprise Sales",
            companyId: "company-1",
          }),
        })
      );
    });

    it("should fail when team name already exists", async () => {
      mockPrisma.team.findFirst.mockResolvedValue({ id: "existing" });

      const result = await createTeam({ name: "Existing Team" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it("should validate hub belongs to company", async () => {
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.hub.findUnique.mockResolvedValue(null);

      const result = await createTeam({ name: "Test", hubId: "invalid-hub" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Hub not found");
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it("should validate department belongs to company", async () => {
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.department.findUnique.mockResolvedValue(null);

      const result = await createTeam({ name: "Test", departmentId: "invalid-dept" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Department not found");
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it("should require admin role", async () => {
      mockSession = createMemberSession();

      const result = await createTeam({ name: "Blocked Team" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it("should return error when name is empty", async () => {
      const result = await createTeam({ name: "  " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.team.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.team.create).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.team.create.mockRejectedValue(new Error("DB connection failed"));

      const result = await createTeam({ name: "Failing Team" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
    });
  });

  // =========================================================================
  // updateTeam
  // =========================================================================

  describe("updateTeam", () => {
    it("should update team successfully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "t1",
        companyId: "company-1",
      });
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.team.update.mockResolvedValue({
        id: "t1",
        name: "Updated Name",
      });

      const result = await updateTeam({
        id: "t1",
        name: "Updated Name",
        description: "New description",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: expect.objectContaining({
          name: "Updated Name",
          description: "New description",
        }),
      });
    });

    it("should return error when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await updateTeam({ id: "nonexistent", name: "Nope" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.team.update).not.toHaveBeenCalled();
    });

    it("should return error when team belongs to different company", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "t1",
        companyId: "other",
      });

      const result = await updateTeam({ id: "t1", name: "Hijack" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.team.update).not.toHaveBeenCalled();
    });

    it("should return error when name is empty", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "t1",
        companyId: "company-1",
      });

      const result = await updateTeam({ id: "t1", name: "  " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.team.update).not.toHaveBeenCalled();
    });

    it("should return error when name already exists", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "t1",
        companyId: "company-1",
      });
      mockPrisma.team.findFirst.mockResolvedValue({ id: "dup" });

      const result = await updateTeam({ id: "t1", name: "Duplicate Name" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.team.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "t1",
        companyId: "company-1",
      });
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.team.update.mockRejectedValue(new Error("DB write failed"));

      const result = await updateTeam({ id: "t1", name: "Should Fail" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB write failed");
    });
  });

  // =========================================================================
  // addTeamMember
  // =========================================================================

  describe("addTeamMember", () => {
    it("should add a member from any department (cross-dept)", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
        departmentId: "sales-dept",
      });
      mockPrisma.employee.findUnique.mockResolvedValue({
        id: "emp-marketing",
        companyId: "company-1",
        departmentId: "marketing-dept",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);
      mockPrisma.teamMember.create.mockResolvedValue({ id: "tm1" });

      const result = await addTeamMember("team1", "emp-marketing", "MEMBER");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "tm1" });
      expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
        data: { teamId: "team1", employeeId: "emp-marketing", role: "MEMBER" },
      });
    });

    it("should not add duplicate member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.employee.findUnique.mockResolvedValue({
        id: "emp1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue({ id: "existing" });

      const result = await addTeamMember("team1", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already a member");
      expect(mockPrisma.teamMember.create).not.toHaveBeenCalled();
    });

    it("should return error when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await addTeamMember("nonexistent", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
    });

    it("should return error when employee not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const result = await addTeamMember("team1", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Employee not found");
      expect(mockPrisma.teamMember.create).not.toHaveBeenCalled();
    });

    it("should return error when team from different company", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "other",
      });

      const result = await addTeamMember("team1", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.employee.findUnique.mockResolvedValue({
        id: "emp1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);
      mockPrisma.teamMember.create.mockRejectedValue(new Error("FK constraint"));

      const result = await addTeamMember("team1", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint");
    });
  });

  // =========================================================================
  // removeTeamMember
  // =========================================================================

  describe("removeTeamMember", () => {
    it("should remove a member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: "team1",
        employeeId: "emp1",
      });
      mockPrisma.teamMember.delete.mockResolvedValue({});

      const result = await removeTeamMember("team1", "emp1");

      expect(result.success).toBe(true);
      expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
        where: { teamId_employeeId: { teamId: "team1", employeeId: "emp1" } },
      });
    });

    it("should return error when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await removeTeamMember("nonexistent", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.teamMember.delete).not.toHaveBeenCalled();
    });

    it("should return error when membership not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);

      const result = await removeTeamMember("team1", "emp-unknown");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Member not found");
      expect(mockPrisma.teamMember.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: "team1",
        employeeId: "emp1",
      });
      mockPrisma.teamMember.delete.mockRejectedValue(new Error("DB error"));

      const result = await removeTeamMember("team1", "emp1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // =========================================================================
  // updateTeamMemberRole
  // =========================================================================

  describe("updateTeamMemberRole", () => {
    it("should change role from MEMBER to LEAD", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: "team1",
        employeeId: "emp1",
        role: "MEMBER",
      });
      mockPrisma.teamMember.update.mockResolvedValue({ role: "LEAD" });

      const result = await updateTeamMemberRole("team1", "emp1", "LEAD");

      expect(result.success).toBe(true);
      expect(mockPrisma.teamMember.update).toHaveBeenCalledWith({
        where: { teamId_employeeId: { teamId: "team1", employeeId: "emp1" } },
        data: { role: "LEAD" },
      });
    });

    it("should return error when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await updateTeamMemberRole("nonexistent", "emp1", "LEAD");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.teamMember.update).not.toHaveBeenCalled();
    });

    it("should return error when membership not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);

      const result = await updateTeamMemberRole("team1", "emp-unknown", "LEAD");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Member not found");
      expect(mockPrisma.teamMember.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
      });
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: "team1",
        employeeId: "emp1",
        role: "MEMBER",
      });
      mockPrisma.teamMember.update.mockRejectedValue(new Error("Update failed"));

      const result = await updateTeamMemberRole("team1", "emp1", "LEAD");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  // =========================================================================
  // deleteTeam
  // =========================================================================

  describe("deleteTeam", () => {
    it("should not delete team with members", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
        _count: { members: 3 },
      });

      const result = await deleteTeam("team1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("3 members");
      expect(mockPrisma.team.delete).not.toHaveBeenCalled();
    });

    it("should delete empty team", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
        _count: { members: 0 },
      });
      mockPrisma.team.delete.mockResolvedValue({});

      const result = await deleteTeam("team1");

      expect(result.success).toBe(true);
      expect(mockPrisma.team.delete).toHaveBeenCalledWith({
        where: { id: "team1" },
      });
    });

    it("should return error when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await deleteTeam("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Team not found");
      expect(mockPrisma.team.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team1",
        companyId: "company-1",
        _count: { members: 0 },
      });
      mockPrisma.team.delete.mockRejectedValue(new Error("FK constraint"));

      const result = await deleteTeam("team1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FK constraint");
    });
  });

  // =========================================================================
  // getTeams
  // =========================================================================

  describe("getTeams", () => {
    it("should return teams for company", async () => {
      const teamsData = [
        {
          id: "t1",
          name: "Alpha",
          companyId: "company-1",
          department: { id: "d1", name: "Engineering" },
          hub: { id: "h1", name: "North" },
          _count: { members: 5 },
        },
        {
          id: "t2",
          name: "Beta",
          companyId: "company-1",
          department: null,
          hub: null,
          _count: { members: 0 },
        },
      ];
      mockPrisma.team.findMany.mockResolvedValue(teamsData);

      const result = await getTeams();

      expect(result).toEqual(teamsData);
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: "company-1" },
          orderBy: { name: "asc" },
        })
      );
    });

    it("should throw when unauthenticated", async () => {
      mockSession = null;

      await expect(getTeams()).rejects.toThrow("Unauthorized");
    });
  });

  // =========================================================================
  // getTeamWithMembers
  // =========================================================================

  describe("getTeamWithMembers", () => {
    it("should return team with members", async () => {
      const teamData = {
        id: "t1",
        name: "Alpha",
        companyId: "company-1",
        department: { id: "d1", name: "Engineering" },
        hub: { id: "h1", name: "North" },
        members: [
          {
            id: "tm1",
            role: "LEAD",
            joinedAt: new Date(),
            employee: {
              id: "emp1",
              name: "Alice",
              email: "alice@acme.com",
              title: "Staff Engineer",
              department: { name: "Engineering" },
            },
          },
          {
            id: "tm2",
            role: "MEMBER",
            joinedAt: new Date(),
            employee: {
              id: "emp2",
              name: "Bob",
              email: "bob@acme.com",
              title: "Designer",
              department: { name: "Design" },
            },
          },
        ],
      };
      mockPrisma.team.findFirst.mockResolvedValue(teamData);

      const result = await getTeamWithMembers("t1");

      expect(result).toEqual(teamData);
      expect(mockPrisma.team.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1", companyId: "company-1" },
        })
      );
    });

    it("should throw when unauthenticated", async () => {
      mockSession = null;

      await expect(getTeamWithMembers("t1")).rejects.toThrow("Unauthorized");
    });
  });
});
