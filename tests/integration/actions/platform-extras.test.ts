/**
 * Coverage for the platform.ts surfaces that aren't exercised by the
 * baseline platform-management.test.ts: uploadCompanyLogo,
 * createPlatformCompanyWithAdmin, checkUserExistsByEmail, toggleCompanyFeature,
 * updateCompanyLocale, getPersonalInfo, updatePersonalInfo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
  createSuperAdminSession,
  createMemberSession,
  createUnauthenticatedSession,
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

// Pass real schemas through (we want their .parse logic exercised).
vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

const supabaseStorageMocks = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseStorageClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: supabaseStorageMocks.upload,
        getPublicUrl: supabaseStorageMocks.getPublicUrl,
      })),
    },
  })),
  SURVEY_ASSETS_BUCKET: "survey-assets",
}));

// Mock @/i18n/routing so updateCompanyLocale's dynamic import resolves.
vi.mock("@/i18n/routing", () => ({
  SUPPORTED_LOCALES: ["es", "en"],
}));

import {
  uploadCompanyLogo,
  createPlatformCompanyWithAdmin,
  checkUserExistsByEmail,
  toggleCompanyFeature,
  updateCompanyLocale,
  getPersonalInfo,
  updatePersonalInfo,
} from "@/lib/actions/platform";
import { sendEmail } from "@/lib/email/resend";
const mockSendEmail = sendEmail as unknown as ReturnType<typeof vi.fn>;

function makeFile(name: string, type: string, sizeBytes: number) {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createSuperAdminSession();
  supabaseStorageMocks.upload.mockReset();
  supabaseStorageMocks.getPublicUrl.mockReset();
  mockSendEmail.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// uploadCompanyLogo
// ---------------------------------------------------------------------------

describe("uploadCompanyLogo", () => {
  it("rejects when no file is provided", async () => {
    const fd = new FormData();
    const result = await uploadCompanyLogo(fd);
    expect(result.success).toBe(false);
    expect(result.error).toBe("No file provided");
  });

  it("rejects unsupported mime types", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("evil.gif", "image/gif", 200));
    const result = await uploadCompanyLogo(fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unsupported file type/);
  });

  it("rejects files larger than 2MB", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("big.png", "image/png", 3 * 1024 * 1024));
    const result = await uploadCompanyLogo(fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/);
  });

  it("uploads to the _pending/ prefix and returns the public URL", async () => {
    supabaseStorageMocks.upload.mockResolvedValue({ error: null });
    supabaseStorageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/p/logo.png" },
    });

    const fd = new FormData();
    fd.append("file", makeFile("brand.png", "image/png", 500));

    const result = await uploadCompanyLogo(fd);

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe("https://cdn.example.com/p/logo.png");
    expect(supabaseStorageMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^companies\/_pending\/[a-z0-9-]+-\d+\.png$/i),
      expect.any(File),
      expect.objectContaining({ contentType: "image/png", upsert: false }),
    );
  });

  it("surfaces supabase upload errors", async () => {
    supabaseStorageMocks.upload.mockResolvedValue({
      error: { message: "permission denied" },
    });
    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 500));

    const result = await uploadCompanyLogo(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload failed: permission denied");
  });

  it("rejects non-super-admins", async () => {
    mockSession = createAdminSession();
    const fd = new FormData();
    const result = await uploadCompanyLogo(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// createPlatformCompanyWithAdmin
// ---------------------------------------------------------------------------

describe("createPlatformCompanyWithAdmin", () => {
  const validInput = {
    name: "Acme Inc",
    slug: "acme-inc",
    taxId: "900123456-7",
    logo: "",
    domain: "",
    primaryColor: "",
    locale: "es" as const,
    featureAts: false,
    featureOnboarding: false,
    featureWorkEnv: true,
    featureHubs: false,
    admin: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.com",
    },
  };

  it("creates the company + invitation + sends email (happy path, new user)", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
        const tx = createMockPrisma();
        tx.company.create.mockResolvedValue({
          id: "comp-new",
          name: "Acme Inc",
        });
        tx.invitation.create.mockResolvedValue({
          id: "inv-new",
          token: "tok-xyz",
        });
        return fn(tx);
      },
    );

    const result = await createPlatformCompanyWithAdmin(validInput);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("comp-new");
    expect(result.data?.inviteUrl).toContain("/invite/tok-xyz");
    expect(result.data?.adminAlreadyExisted).toBe(false);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("reports adminAlreadyExisted when the admin email already has a User row", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
        const tx = createMockPrisma();
        tx.company.create.mockResolvedValue({ id: "comp-1", name: "Acme Inc" });
        tx.invitation.create.mockResolvedValue({
          id: "inv-1",
          token: "abc",
        });
        return fn(tx);
      },
    );

    const result = await createPlatformCompanyWithAdmin(validInput);

    expect(result.success).toBe(true);
    expect(result.data?.adminAlreadyExisted).toBe(true);
  });

  it("returns 'Slug is already taken' before doing any creation", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createPlatformCompanyWithAdmin(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Slug is already taken");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rolls back company + invitation when email sending fails", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrismaClient) => Promise<unknown>) => {
        const tx = createMockPrisma();
        tx.company.create.mockResolvedValue({ id: "comp-1", name: "Acme Inc" });
        tx.invitation.create.mockResolvedValue({ id: "inv-1", token: "x" });
        return fn(tx);
      },
    );
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));
    mockPrisma.invitation.delete.mockResolvedValue({});
    mockPrisma.company.delete.mockResolvedValue({});

    const result = await createPlatformCompanyWithAdmin(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMTP down");
    expect(mockPrisma.invitation.delete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
    expect(mockPrisma.company.delete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
  });

  it("rejects non-super-admins", async () => {
    mockSession = createAdminSession();
    const result = await createPlatformCompanyWithAdmin(validInput);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects invalid input via zod parse", async () => {
    const result = await createPlatformCompanyWithAdmin({
      ...validInput,
      name: "A", // too short
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkUserExistsByEmail
// ---------------------------------------------------------------------------

describe("checkUserExistsByEmail", () => {
  it("returns { exists: true } when user is found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
    const result = await checkUserExistsByEmail("user@acme.com");
    expect(result).toEqual({ success: true, data: { exists: true } });
  });

  it("returns { exists: false } when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await checkUserExistsByEmail("user@acme.com");
    expect(result).toEqual({ success: true, data: { exists: false } });
  });

  it("returns { exists: false } for malformed email without querying DB", async () => {
    const result = await checkUserExistsByEmail("not-an-email");
    expect(result).toEqual({ success: true, data: { exists: false } });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("normalises email to lowercase trimmed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await checkUserExistsByEmail("  Foo@ACME.com  ");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "foo@acme.com" },
      select: { id: true },
    });
  });

  it("rejects non-super-admins via error wrapping", async () => {
    mockSession = createAdminSession();
    const result = await checkUserExistsByEmail("user@acme.com");
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleCompanyFeature
// ---------------------------------------------------------------------------

describe("toggleCompanyFeature", () => {
  it("maps the 'ats' alias to featureAts column", async () => {
    mockPrisma.company.update.mockResolvedValue({});
    const result = await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "ats",
      enabled: true,
    });
    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { featureAts: true },
    });
  });

  it("maps 'workEnv' → featureWorkEnv", async () => {
    mockPrisma.company.update.mockResolvedValue({});
    await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "workEnv",
      enabled: false,
    });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { featureWorkEnv: false },
    });
  });

  it("maps 'onboarding' and 'hubs' aliases", async () => {
    mockPrisma.company.update.mockResolvedValue({});
    await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "onboarding",
      enabled: true,
    });
    await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "hubs",
      enabled: true,
    });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { featureOnboarding: true },
    });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: { featureHubs: true },
    });
  });

  it("rejects non-super-admins", async () => {
    mockSession = createAdminSession();
    const result = await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "ats",
      enabled: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("surfaces DB errors", async () => {
    mockPrisma.company.update.mockRejectedValue(new Error("boom"));
    const result = await toggleCompanyFeature({
      companyId: "comp-1",
      feature: "ats",
      enabled: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("boom");
  });
});

// ---------------------------------------------------------------------------
// updateCompanyLocale
// ---------------------------------------------------------------------------

describe("updateCompanyLocale", () => {
  beforeEach(() => {
    mockSession = createAdminSession();
  });

  it("updates company locale when admin + locale is supported", async () => {
    mockPrisma.company.update.mockResolvedValue({});
    const result = await updateCompanyLocale("en");
    expect(result.success).toBe(true);
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { locale: "en" },
    });
  });

  it("rejects unsupported locales", async () => {
    const result = await updateCompanyLocale("zh");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unsupported locale");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it("rejects non-admins", async () => {
    mockSession = createMemberSession();
    const result = await updateCompanyLocale("en");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// getPersonalInfo
// ---------------------------------------------------------------------------

describe("getPersonalInfo", () => {
  beforeEach(() => {
    mockSession = createAdminSession();
  });

  it("returns user + jobTitle from employee when employeeId exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+573001234567",
      name: "Jane Doe",
    });
    mockPrisma.employee.findUnique.mockResolvedValue({ title: "CTO" });

    const result = await getPersonalInfo();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+573001234567",
      name: "Jane Doe",
      jobTitle: "CTO",
    });
  });

  it("returns null jobTitle when no employee is linked to the session", async () => {
    mockSession = createSuperAdminSession();
    mockPrisma.user.findUnique.mockResolvedValue({
      firstName: "A",
      lastName: "B",
      phone: null,
      name: "A B",
    });

    const result = await getPersonalInfo();

    expect(result.success).toBe(true);
    expect(result.data?.jobTitle).toBeNull();
    expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
  });

  it("returns null jobTitle when employee has no title", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      firstName: "A",
      lastName: "B",
      phone: null,
      name: "A B",
    });
    mockPrisma.employee.findUnique.mockResolvedValue(null);

    const result = await getPersonalInfo();
    expect(result.success).toBe(true);
    expect(result.data?.jobTitle).toBeNull();
  });

  it("rejects unauthenticated", async () => {
    mockSession = createUnauthenticatedSession();
    const result = await getPersonalInfo();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("returns 'User not found' when user row was deleted", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await getPersonalInfo();
    expect(result.success).toBe(false);
    expect(result.error).toBe("User not found");
  });
});

// ---------------------------------------------------------------------------
// updatePersonalInfo
// ---------------------------------------------------------------------------

describe("updatePersonalInfo", () => {
  beforeEach(() => {
    mockSession = createAdminSession();
  });

  it("writes firstName, lastName, computed name and phone", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.employee.update.mockResolvedValue({});

    const result = await updatePersonalInfo({
      firstName: "Jane",
      lastName: "Doe",
      phone: "+573001234567",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "admin-user" },
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "+573001234567",
        name: "Jane Doe",
      },
    });
    // jobTitle omitted → employee.update should NOT be called
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("treats empty-string phone as null", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await updatePersonalInfo({
      firstName: "Jane",
      lastName: "Doe",
      phone: "",
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "admin-user" },
      data: expect.objectContaining({ phone: null }),
    });
  });

  it("mirrors jobTitle onto employee.title when provided + session has employeeId", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.employee.update.mockResolvedValue({});

    await updatePersonalInfo({
      firstName: "Jane",
      lastName: "Doe",
      jobTitle: "VP People",
    });

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-admin" },
      data: { title: "VP People" },
    });
  });

  it("clears employee.title when jobTitle is explicitly empty string", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.employee.update.mockResolvedValue({});

    await updatePersonalInfo({
      firstName: "Jane",
      lastName: "Doe",
      jobTitle: "",
    });

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-admin" },
      data: { title: null },
    });
  });

  it("skips employee.update when session has no employeeId (no current company)", async () => {
    mockSession = createSuperAdminSession();
    mockPrisma.user.update.mockResolvedValue({});

    await updatePersonalInfo({
      firstName: "S",
      lastName: "A",
      jobTitle: "x",
    });

    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated", async () => {
    mockSession = createUnauthenticatedSession();
    const result = await updatePersonalInfo({
      firstName: "A",
      lastName: "B",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects invalid input via zod", async () => {
    const result = await updatePersonalInfo({
      firstName: "",
      lastName: "B",
    });
    expect(result.success).toBe(false);
  });
});
