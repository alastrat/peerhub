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
import { createHub, updateHub, deleteHub, getHubs } from "@/lib/actions/hubs";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("hub actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // =========================================================================
  // createHub
  // =========================================================================

  describe("createHub", () => {
    it("should create a hub when featureHubs is enabled", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.hub.create.mockResolvedValue({ id: "hub1" });

      const result = await createHub({
        name: "Bogota Office",
        description: "Main office",
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("data");
      if (result.success) {
        expect(result.data).toEqual({ id: "hub1" });
      }
      expect(mockPrisma.hub.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Bogota Office",
            companyId: "company-1",
            description: "Main office",
          }),
        })
      );
    });

    it("should fail when featureHubs is disabled", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: false });

      const result = await createHub({ name: "Test Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not enabled");
      expect(mockPrisma.hub.create).not.toHaveBeenCalled();
    });

    it("should fail when name already exists", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "existing" });

      const result = await createHub({ name: "Existing Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.hub.create).not.toHaveBeenCalled();
    });

    it("should require admin role", async () => {
      mockSession = createMemberSession();

      const result = await createHub({ name: "Blocked Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mockPrisma.hub.create).not.toHaveBeenCalled();
    });

    it("should return error when name is empty or whitespace", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });

      const result = await createHub({ name: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.hub.create).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.hub.create.mockRejectedValue(new Error("DB error"));

      const result = await createHub({ name: "Failing Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });

    it("should trim name and description", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.hub.create.mockResolvedValue({ id: "hub1" });

      await createHub({
        name: "  Trimmed Name  ",
        description: "  Trimmed Desc  ",
      });

      expect(mockPrisma.hub.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Trimmed Name",
            description: "Trimmed Desc",
          }),
        })
      );
    });
  });

  // =========================================================================
  // updateHub
  // =========================================================================

  describe("updateHub", () => {
    it("should update hub successfully", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
      });
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.hub.update.mockResolvedValue({});

      const result = await updateHub({
        id: "hub1",
        name: "Updated Hub",
        description: "New description",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.hub.update).toHaveBeenCalledWith({
        where: { id: "hub1" },
        data: expect.objectContaining({
          name: "Updated Hub",
          description: "New description",
        }),
      });
    });

    it("should return error when hub not found", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue(null);

      const result = await updateHub({ id: "nonexistent", name: "Nope" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.hub.update).not.toHaveBeenCalled();
    });

    it("should return error when hub belongs to different company", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "other-company",
      });

      const result = await updateHub({ id: "hub1", name: "Stolen Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(mockPrisma.hub.update).not.toHaveBeenCalled();
    });

    it("should return error when name is empty", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
      });

      const result = await updateHub({ id: "hub1", name: "  " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(mockPrisma.hub.update).not.toHaveBeenCalled();
    });

    it("should return error when name already exists", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
      });
      mockPrisma.hub.findFirst.mockResolvedValue({ id: "other-hub" });

      const result = await updateHub({ id: "hub1", name: "Duplicate Name" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
      expect(mockPrisma.hub.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
      });
      mockPrisma.hub.findFirst.mockResolvedValue(null);
      mockPrisma.hub.update.mockRejectedValue(new Error("DB error"));

      const result = await updateHub({ id: "hub1", name: "Failing Hub" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // =========================================================================
  // deleteHub
  // =========================================================================

  describe("deleteHub", () => {
    it("should not delete the default hub", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
        isDefault: true,
        _count: { employees: 0, teams: 0 },
      });

      const result = await deleteHub("hub1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("default hub");
      expect(mockPrisma.hub.delete).not.toHaveBeenCalled();
    });

    it("should not delete hub with employees", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
        isDefault: false,
        _count: { employees: 5, teams: 0 },
      });

      const result = await deleteHub("hub1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("5 employees");
      expect(mockPrisma.hub.delete).not.toHaveBeenCalled();
    });

    it("should not delete hub with teams", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
        isDefault: false,
        _count: { employees: 0, teams: 2 },
      });

      const result = await deleteHub("hub1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("2 teams");
      expect(mockPrisma.hub.delete).not.toHaveBeenCalled();
    });

    it("should delete empty non-default hub", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
        isDefault: false,
        _count: { employees: 0, teams: 0 },
      });
      mockPrisma.hub.delete.mockResolvedValue({});

      const result = await deleteHub("hub1");

      expect(result.success).toBe(true);
      expect(mockPrisma.hub.delete).toHaveBeenCalledWith({
        where: { id: "hub1" },
      });
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.hub.findUnique.mockResolvedValue({
        id: "hub1",
        companyId: "company-1",
        isDefault: false,
        _count: { employees: 0, teams: 0 },
      });
      mockPrisma.hub.delete.mockRejectedValue(new Error("DB error"));

      const result = await deleteHub("hub1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // =========================================================================
  // getHubs
  // =========================================================================

  describe("getHubs", () => {
    it("should return hubs for company", async () => {
      const hubsList = [
        {
          id: "hub1",
          name: "HQ",
          isDefault: true,
          _count: { employees: 10, teams: 3 },
        },
        {
          id: "hub2",
          name: "Remote Office",
          isDefault: false,
          _count: { employees: 5, teams: 1 },
        },
      ];
      mockPrisma.hub.findMany.mockResolvedValue(hubsList);

      const result = await getHubs();

      expect(result).toEqual(hubsList);
      expect(mockPrisma.hub.findMany).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
        include: { _count: { select: { employees: true, teams: true } } },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
    });

    it("should throw when unauthenticated", async () => {
      mockSession = null;

      await expect(getHubs()).rejects.toThrow("Unauthorized");
    });
  });
});
