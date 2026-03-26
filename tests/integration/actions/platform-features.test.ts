import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createSuperAdminSession, createAdminSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: ReturnType<typeof createSuperAdminSession> | null = null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/validations/platform", () => ({
  domainSchema: { parse: vi.fn((v: string) => v) },
  updateGlobalRoleSchema: { parse: vi.fn((v: unknown) => v) },
  createPlatformCompanySchema: { parse: vi.fn((v: unknown) => v) },
}));

// Import AFTER mocks
import { toggleCompanyFeature } from "@/lib/actions/platform";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("toggleCompanyFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createSuperAdminSession();
  });

  it("should enable a feature (hubs)", async () => {
    mockPrisma.company.update.mockResolvedValue({});

    const result = await toggleCompanyFeature({
      companyId: "c1",
      feature: "hubs",
      enabled: true,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { featureHubs: true },
    });
  });

  it("should disable a feature", async () => {
    mockPrisma.company.update.mockResolvedValue({});

    const result = await toggleCompanyFeature({
      companyId: "c1",
      feature: "onboarding",
      enabled: false,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { featureOnboarding: false },
    });
  });

  it("should require SUPER_ADMIN role", async () => {
    mockSession = createAdminSession();

    const result = await toggleCompanyFeature({
      companyId: "c1",
      feature: "hubs",
      enabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.company.update.mockRejectedValue(new Error("DB error"));

    const result = await toggleCompanyFeature({
      companyId: "c1",
      feature: "hubs",
      enabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });

  it("should return success for all valid feature keys", async () => {
    mockPrisma.company.update.mockResolvedValue({});

    const features = ["ats", "onboarding", "workEnv", "hubs"] as const;
    const expectedFields: Record<string, string> = {
      ats: "featureAts",
      onboarding: "featureOnboarding",
      workEnv: "featureWorkEnv",
      hubs: "featureHubs",
    };

    for (const feature of features) {
      vi.clearAllMocks();
      mockPrisma = createMockPrisma();
      mockPrisma.company.update.mockResolvedValue({});

      const result = await toggleCompanyFeature({
        companyId: "c1",
        feature,
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { [expectedFields[feature]]: true },
      });
    }
  });
});
