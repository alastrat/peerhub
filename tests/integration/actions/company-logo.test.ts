/**
 * updateCompanyLogo / removeCompanyLogo: a company admin sets the logo its
 * surveys show. Only admins of the active company may change it, and a failed
 * upload must not touch the saved logo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createManagerSession,
  createMemberSession,
  createSuperAdminSession,
} from "../../helpers/mock-session";

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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const storageMocks = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseStorageClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: storageMocks.upload,
        getPublicUrl: storageMocks.getPublicUrl,
      })),
    },
  })),
  SURVEY_ASSETS_BUCKET: "survey-assets",
}));

import { updateCompanyLogo, removeCompanyLogo } from "@/lib/actions/platform";
import { revalidatePath } from "next/cache";

const LOGO_URL = "https://cdn.example.com/companies/company-1/logo.png";

function logoForm(name = "logo.png", type = "image/png", sizeBytes = 500) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(sizeBytes)], name, { type }));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession("company-1");
  storageMocks.upload.mockResolvedValue({ error: null });
  storageMocks.getPublicUrl.mockReturnValue({ data: { publicUrl: LOGO_URL } });
  mockPrisma.company.update.mockResolvedValue({ id: "company-1" });
});

const nonAdmins = [
  ["a manager", () => createManagerSession("company-1")],
  ["a member", () => createMemberSession("company-1")],
  ["a signed-out visitor", () => null],
] as const;

describe("updateCompanyLogo", () => {
  it("uploads the logo under the admin's company and saves it there", async () => {
    const result = await updateCompanyLogo(logoForm());

    expect(result).toEqual({ success: true, data: { logo: LOGO_URL } });
    expect(storageMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^companies\/company-1\/logo-\d+\.png$/),
      expect.any(File),
      expect.objectContaining({ contentType: "image/png", upsert: false }),
    );
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { logo: LOGO_URL },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/company");
  });

  it("lets a super admin set the logo of the company they're viewing", async () => {
    mockSession = {
      ...createSuperAdminSession(),
      companyUser: { ...createAdminSession("company-9").companyUser, role: "MEMBER" },
    } as typeof mockSession;

    const result = await updateCompanyLogo(logoForm());

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "company-9" } }),
    );
  });

  it.each(nonAdmins)("rejects %s without uploading or saving", async (_label, session) => {
    mockSession = session();

    const result = await updateCompanyLogo(logoForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
    expect(storageMocks.upload).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types before uploading", async () => {
    const result = await updateCompanyLogo(logoForm("logo.gif", "image/gif"));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unsupported file type/);
    expect(storageMocks.upload).not.toHaveBeenCalled();
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("rejects files over 2MB", async () => {
    const result = await updateCompanyLogo(logoForm("big.png", "image/png", 3 * 1024 * 1024));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("keeps the saved logo when the upload fails", async () => {
    storageMocks.upload.mockResolvedValue({ error: { message: "bucket missing" } });

    const result = await updateCompanyLogo(logoForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("bucket missing");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });
});

describe("removeCompanyLogo", () => {
  it("clears the logo of the admin's company", async () => {
    const result = await removeCompanyLogo();

    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { logo: null },
    });
  });

  it.each(nonAdmins)("rejects %s", async (_label, session) => {
    mockSession = session();

    const result = await removeCompanyLogo();

    expect(result.success).toBe(false);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });
});
