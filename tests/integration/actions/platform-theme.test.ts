import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import {
  createSuperAdminSession,
  createAdminSession,
  createManagerSession,
  createMemberSession,
  createMockSession,
} from "../../helpers/mock-session";

const mockPrisma = {
  platformSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};
let mockSession: Session | null = null;

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
  updateTag: vi.fn(),
  // Pass-through: the tests read the database directly.
  unstable_cache: vi.fn((fn: unknown) => fn),
}));

// Import AFTER mocks
import { revalidatePath, updateTag } from "next/cache";
import { updatePlatformTheme } from "@/lib/actions/platform-theme";
import { readPlatformTheme } from "@/lib/queries/platform-theme";
import type { PlatformTheme } from "@/lib/constants/platform-theme";

describe("updatePlatformTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = createSuperAdminSession();
    mockPrisma.platformSetting.upsert.mockResolvedValue({});
  });

  it("lets a super admin switch the platform theme", async () => {
    const result = await updatePlatformTheme("kultiva");

    expect(result).toEqual({ success: true, data: { theme: "kultiva" } });
    expect(mockPrisma.platformSetting.upsert).toHaveBeenCalledWith({
      where: { key: "theme" },
      create: { key: "theme", value: "kultiva", updatedById: "super-admin-user" },
      update: { value: "kultiva", updatedById: "super-admin-user" },
    });
  });

  it("refreshes every page so the new theme shows up everywhere", async () => {
    await updatePlatformTheme("classic");

    expect(updateTag).toHaveBeenCalledWith("platform-theme");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["company admin", createAdminSession()],
    ["manager", createManagerSession()],
    ["member", createMemberSession()],
    ["user without a company", createMockSession({ globalRole: "USER", companyUser: null })],
  ])("rejects a %s", async (_label, session) => {
    mockSession = session;

    const result = await updatePlatformTheme("kultiva");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockPrisma.platformSetting.upsert).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a signed-out caller", async () => {
    mockSession = null;

    const result = await updatePlatformTheme("kultiva");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockPrisma.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it("checks permission before validating the theme", async () => {
    mockSession = createAdminSession();

    const result = await updatePlatformTheme("dark" as PlatformTheme);

    expect(result.error).toBe("Unauthorized");
  });

  it("rejects an unknown theme", async () => {
    const result = await updatePlatformTheme("dark" as PlatformTheme);

    expect(result).toEqual({ success: false, error: "Invalid theme" });
    expect(mockPrisma.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it("reports a failed save without refreshing pages", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPrisma.platformSetting.upsert.mockRejectedValue(new Error("db down"));

    const result = await updatePlatformTheme("kultiva");

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("readPlatformTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the saved theme", async () => {
    mockPrisma.platformSetting.findUnique.mockResolvedValue({ value: "kultiva" });

    await expect(readPlatformTheme()).resolves.toBe("kultiva");
    expect(mockPrisma.platformSetting.findUnique).toHaveBeenCalledWith({
      where: { key: "theme" },
      select: { value: true },
    });
  });

  it("defaults to classic when nothing is saved", async () => {
    mockPrisma.platformSetting.findUnique.mockResolvedValue(null);

    await expect(readPlatformTheme()).resolves.toBe("classic");
  });

  it("ignores an unknown saved value", async () => {
    mockPrisma.platformSetting.findUnique.mockResolvedValue({ value: "neon" });

    await expect(readPlatformTheme()).resolves.toBe("classic");
  });

  it("falls back to classic when the database can't be read", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPrisma.platformSetting.findUnique.mockRejectedValue(new Error("no table"));

    await expect(readPlatformTheme()).resolves.toBe("classic");
    consoleError.mockRestore();
  });
});
