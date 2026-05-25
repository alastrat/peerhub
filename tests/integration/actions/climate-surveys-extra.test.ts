/**
 * Extended tests for climate-surveys actions that cover the recent UX-overhaul
 * additions: anonymity threshold clamping, full-presentation fields on create,
 * the inline `updateClimateSurveyQuestion`, the supabase-backed `uploadSurveyLogo`,
 * and the duplicate-copies-threshold path. Kept in a separate file from
 * `climate-surveys.test.ts` to avoid touching the existing baseline.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import {
  createAdminSession,
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

// Default behaviour: pretend next-intl's request context is missing — the
// production code falls back to the English baseline, which the tests below
// assert against. Individual tests can override this to simulate a translated
// runtime context.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() =>
    Promise.reject(new Error("No request context")),
  ),
}));

// Mock the supabase storage client lazily — the action does a dynamic
// `import("@/lib/supabase/server")` so we need a static module hook here.
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

import {
  createClimateSurvey,
  updateClimateSurvey,
  duplicateClimateSurvey,
  updateSurveySettings,
  updateClimateSurveyQuestion,
  uploadSurveyLogo,
  uploadSurveyWallpaper,
} from "@/lib/actions/climate-surveys";
import { getTranslations } from "next-intl/server";
const mockedGetTranslations = getTranslations as unknown as ReturnType<typeof vi.fn>;

const baseQuestion = {
  text: "Q1?",
  type: "LIKERT" as const,
  order: 1,
  isRequired: true,
};

const baseSurvey = {
  id: "survey-1",
  companyId: "company-1",
  status: "DRAFT",
  name: "Q1",
  description: null,
  type: "CLIMATE",
  frequency: "ONCE",
  isAnonymous: true,
  anonymityThreshold: 3,
  templateId: null,
  questions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession();
  storageMocks.upload.mockReset();
  storageMocks.getPublicUrl.mockReset();
  // restore default no-context behaviour for getTranslations
  mockedGetTranslations.mockImplementation(() =>
    Promise.reject(new Error("No request context")),
  );
});

// ---------------------------------------------------------------------------
// anonymityThreshold clamping
// ---------------------------------------------------------------------------

describe("anonymityThreshold clamping", () => {
  it("createClimateSurvey clamps fractional thresholds to floor via Math.trunc, min 1", async () => {
    mockPrisma.climateSurvey.create.mockResolvedValue({ ...baseSurvey, anonymityThreshold: 4 });

    await createClimateSurvey({
      name: "S",
      type: "CLIMATE",
      anonymityThreshold: 4.9,
      questions: [baseQuestion],
    });

    expect(mockPrisma.climateSurvey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymityThreshold: 4 }),
      }),
    );
  });

  it("createClimateSurvey clamps zero and negative thresholds up to 1", async () => {
    mockPrisma.climateSurvey.create.mockResolvedValue(baseSurvey);

    await createClimateSurvey({
      name: "S",
      type: "CLIMATE",
      anonymityThreshold: 0,
      questions: [baseQuestion],
    });
    expect(mockPrisma.climateSurvey.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymityThreshold: 1 }),
      }),
    );

    mockPrisma.climateSurvey.create.mockClear();

    await createClimateSurvey({
      name: "S",
      type: "CLIMATE",
      anonymityThreshold: -10,
      questions: [baseQuestion],
    });
    expect(mockPrisma.climateSurvey.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymityThreshold: 1 }),
      }),
    );
  });

  it("createClimateSurvey omits anonymityThreshold from payload when not provided", async () => {
    mockPrisma.climateSurvey.create.mockResolvedValue(baseSurvey);

    await createClimateSurvey({
      name: "S",
      type: "CLIMATE",
      questions: [baseQuestion],
    });

    const data = mockPrisma.climateSurvey.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("anonymityThreshold");
  });

  it("updateClimateSurvey clamps anonymityThreshold on the update payload", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
    mockPrisma.climateSurvey.update.mockResolvedValue({ ...baseSurvey, anonymityThreshold: 1 });

    await updateClimateSurvey("survey-1", { anonymityThreshold: 0.4 });

    expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymityThreshold: 1 }),
      }),
    );
  });

  it("updateSurveySettings clamps anonymityThreshold", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
    mockPrisma.climateSurvey.update.mockResolvedValue({});

    await updateSurveySettings("survey-1", { anonymityThreshold: 7.7 });

    expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
      where: { id: "survey-1" },
      data: { anonymityThreshold: 7 },
    });
  });

  it("updateSurveySettings rounds floor on -5 to 1", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);
    mockPrisma.climateSurvey.update.mockResolvedValue({});

    await updateSurveySettings("survey-1", { anonymityThreshold: -5 });

    expect(mockPrisma.climateSurvey.update).toHaveBeenCalledWith({
      where: { id: "survey-1" },
      data: { anonymityThreshold: 1 },
    });
  });
});

// ---------------------------------------------------------------------------
// createClimateSurvey — full presentation fields
// ---------------------------------------------------------------------------

describe("createClimateSurvey — presentation fields", () => {
  it("writes all welcome / thankYou / theme / wallpaper / color / questionsPerPage fields", async () => {
    mockPrisma.climateSurvey.create.mockResolvedValue({ ...baseSurvey });

    await createClimateSurvey({
      name: "Branded Survey",
      type: "CLIMATE",
      welcomeTitle: "  Hello team  ",
      welcomeBody: "Body text",
      welcomeBannerUrl: "  https://cdn.example.com/banner.png  ",
      welcomeCtaText: " Get started ",
      themeColor: " #613171 ",
      thankYouTitle: "  Thanks!  ",
      thankYouBody: "We appreciate it",
      thankYouCtaText: " Done ",
      wallpaperConfig: { style: "fill", color: "#abc" },
      colorConfig: { background: "#fff" },
      questionsPerPage: 3,
      questions: [baseQuestion],
    });

    const data = mockPrisma.climateSurvey.create.mock.calls[0][0].data;
    expect(data.welcomeTitle).toBe("Hello team");
    expect(data.welcomeBody).toBe("Body text");
    expect(data.welcomeBannerUrl).toBe("https://cdn.example.com/banner.png");
    expect(data.welcomeCtaText).toBe("Get started");
    expect(data.themeColor).toBe("#613171");
    expect(data.thankYouTitle).toBe("Thanks!");
    expect(data.thankYouBody).toBe("We appreciate it");
    expect(data.thankYouCtaText).toBe("Done");
    expect(data.wallpaperConfig).toEqual({ style: "fill", color: "#abc" });
    expect(data.colorConfig).toEqual({ background: "#fff" });
    expect(data.questionsPerPage).toBe(3);
  });

  it("nulls empty strings and null configs on create", async () => {
    mockPrisma.climateSurvey.create.mockResolvedValue({ ...baseSurvey });

    await createClimateSurvey({
      name: "Bare",
      type: "CLIMATE",
      welcomeTitle: "  ",
      welcomeBannerUrl: "   ",
      welcomeCtaText: "",
      themeColor: "",
      thankYouTitle: "",
      thankYouCtaText: "",
      wallpaperConfig: null,
      colorConfig: null,
      questionsPerPage: null,
      questions: [baseQuestion],
    });

    const data = mockPrisma.climateSurvey.create.mock.calls[0][0].data;
    expect(data.welcomeTitle).toBeNull();
    expect(data.welcomeBannerUrl).toBeNull();
    expect(data.welcomeCtaText).toBeNull();
    expect(data.themeColor).toBeNull();
    expect(data.thankYouTitle).toBeNull();
    expect(data.thankYouCtaText).toBeNull();
    expect(data.questionsPerPage).toBeNull();
  });

  it("handles Prisma known-request errors with the code prefix", async () => {
    // Build a fake error that looks like a PrismaClientKnownRequestError.
    // Prisma's `instanceof` check uses runtime classes, so we lazily import
    // the constructor and instantiate one.
    const { Prisma } = await import("@prisma/client");
    const knownErr = new (Prisma.PrismaClientKnownRequestError as unknown as new (
      msg: string,
      meta: { code: string; clientVersion: string },
    ) => Error)("Unique constraint failed\non field x", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    mockPrisma.climateSurvey.create.mockRejectedValue(knownErr);

    const result = await createClimateSurvey({
      name: "Dup",
      type: "CLIMATE",
      questions: [baseQuestion],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^P2002:/);
  });
});

// ---------------------------------------------------------------------------
// updateClimateSurvey — non-DRAFT translations
// ---------------------------------------------------------------------------

describe("updateClimateSurvey non-DRAFT translations", () => {
  it("uses translated message when next-intl request context is present", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      status: "ACTIVE",
    });
    // Simulate a translator function that returns Spanish text
    mockedGetTranslations.mockResolvedValueOnce((key: string) => {
      if (key === "questions_locked_after_send") return "ES_LOCKED";
      return key;
    });

    const result = await updateClimateSurvey("survey-1", {
      questions: [baseQuestion],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("ES_LOCKED");
  });

  it("falls back to English when next-intl context is unavailable", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      status: "ACTIVE",
    });

    const result = await updateClimateSurvey("survey-1", {
      questions: [baseQuestion],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Questions cannot be changed after the survey has been sent",
    );
  });

  it("returns 'At least one question is required' when DRAFT + empty array", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(baseSurvey);

    const result = await updateClimateSurvey("survey-1", { questions: [] });

    expect(result.success).toBe(false);
    expect(result.error).toBe("At least one question is required");
  });
});

// ---------------------------------------------------------------------------
// duplicateClimateSurvey — anonymityThreshold copy
// ---------------------------------------------------------------------------

describe("duplicateClimateSurvey", () => {
  it("copies anonymityThreshold from the original survey", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({
      ...baseSurvey,
      anonymityThreshold: 7,
      welcomeTitle: "Hi",
      questionsPerPage: 4,
      questions: [],
    });
    mockPrisma.climateSurvey.create.mockResolvedValue({ ...baseSurvey, id: "copy" });

    await duplicateClimateSurvey("survey-1");

    const data = mockPrisma.climateSurvey.create.mock.calls[0][0].data;
    expect(data.anonymityThreshold).toBe(7);
    expect(data.welcomeTitle).toBe("Hi");
    expect(data.questionsPerPage).toBe(4);
    expect(data.name).toBe("Q1 (Copy)");
  });

  it("rejects unauthenticated callers via wrapping error", async () => {
    mockSession = createUnauthenticatedSession();

    const result = await duplicateClimateSurvey("survey-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to duplicate survey");
  });
});

// ---------------------------------------------------------------------------
// updateClimateSurveyQuestion (inline pencil edit)
// ---------------------------------------------------------------------------

describe("updateClimateSurveyQuestion", () => {
  const draftSurvey = { id: "survey-1", status: "DRAFT" };
  const activeSurvey = { id: "survey-1", status: "ACTIVE" };
  const archivedSurvey = { id: "survey-1", status: "ARCHIVED" };

  it("DRAFT: updates text + type + isRequired in one call", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });
    mockPrisma.surveyQuestion.update.mockResolvedValue({});

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "  New text  ",
      type: "TEXT",
      isRequired: false,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.surveyQuestion.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { text: "New text", type: "TEXT", isRequired: false },
    });
  });

  it("DRAFT: connects to dimension when dimensionId is valid + tenant-scoped", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });
    mockPrisma.climateDimension.findFirst.mockResolvedValue({ id: "dim-1" });
    mockPrisma.surveyQuestion.update.mockResolvedValue({});

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "Q",
      dimensionId: "dim-1",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.climateDimension.findFirst).toHaveBeenCalledWith({
      where: {
        id: "dim-1",
        OR: [{ companyId: "company-1" }, { companyId: null, isDefault: true }],
      },
      select: { id: true },
    });
    expect(mockPrisma.surveyQuestion.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { text: "Q", dimension: { connect: { id: "dim-1" } } },
    });
  });

  it("DRAFT: disconnects dimension when dimensionId is empty string", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });
    mockPrisma.surveyQuestion.update.mockResolvedValue({});

    await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "Q",
      dimensionId: "",
    });

    expect(mockPrisma.surveyQuestion.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { text: "Q", dimension: { disconnect: true } },
    });
  });

  it("DRAFT: rejects cross-tenant dimension (not in OR clause)", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });
    mockPrisma.climateDimension.findFirst.mockResolvedValue(null);

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "Q",
      dimensionId: "dim-from-other-company",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dimension not found");
    expect(mockPrisma.surveyQuestion.update).not.toHaveBeenCalled();
  });

  it("ACTIVE: only updates text — structural fields are dropped silently", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(activeSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });
    mockPrisma.surveyQuestion.update.mockResolvedValue({});

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "New wording",
      type: "TEXT",
      isRequired: false,
      dimensionId: "dim-1",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.surveyQuestion.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { text: "New wording" },
    });
    // No tenant check needed when structural fields are ignored
    expect(mockPrisma.climateDimension.findFirst).not.toHaveBeenCalled();
  });

  it("ARCHIVED: refuses any edit", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(archivedSurvey);

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "Try anyway",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Archived surveys cannot be edited");
    expect(mockPrisma.surveyQuestion.findFirst).not.toHaveBeenCalled();
  });

  it("requires non-empty trimmed text", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue({ id: "q1" });

    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "   ",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Question text is required");
  });

  it("returns 'Survey not found' when survey id is wrong", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);

    const result = await updateClimateSurveyQuestion("nope", "q1", {
      text: "X",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey not found");
  });

  it("returns 'Question not found' when question is not in survey", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(draftSurvey);
    mockPrisma.surveyQuestion.findFirst.mockResolvedValue(null);

    const result = await updateClimateSurveyQuestion("survey-1", "missing", {
      text: "X",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Question not found");
  });

  it("rejects non-admins via the wrapping error", async () => {
    mockSession = createMemberSession();
    const result = await updateClimateSurveyQuestion("survey-1", "q1", {
      text: "x",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// uploadSurveyLogo
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, sizeBytes: number) {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  // Wrap as File so `instanceof File` checks pass in jsdom
  return new File([blob], name, { type });
}

describe("uploadSurveyLogo", () => {
  it("rejects when no file is provided", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({ id: "survey-1" });
    const fd = new FormData();
    const result = await uploadSurveyLogo("survey-1", fd);
    expect(result.success).toBe(false);
    expect(result.error).toBe("No file provided");
  });

  it("rejects when survey is not found", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 100));

    const result = await uploadSurveyLogo("nope", fd);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey not found");
  });

  it("rejects unsupported mime types", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({ id: "survey-1" });
    const fd = new FormData();
    fd.append("file", makeFile("evil.exe", "application/x-msdownload", 100));

    const result = await uploadSurveyLogo("survey-1", fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unsupported file type/);
  });

  it("rejects oversized files (>2MB)", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({ id: "survey-1" });
    const fd = new FormData();
    fd.append("file", makeFile("big.png", "image/png", 3 * 1024 * 1024));

    const result = await uploadSurveyLogo("survey-1", fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/);
  });

  it("returns the public URL on a successful upload", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({ id: "survey-1" });
    storageMocks.upload.mockResolvedValue({ error: null });
    storageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/survey-assets/path.png" },
    });

    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 500));

    const result = await uploadSurveyLogo("survey-1", fd);

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe(
      "https://cdn.example.com/survey-assets/path.png",
    );
    expect(storageMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^surveys\/survey-1\/logo-\d+\.png$/),
      expect.any(File),
      expect.objectContaining({
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      }),
    );
  });

  it("surfaces upload errors from supabase", async () => {
    mockPrisma.climateSurvey.findFirst.mockResolvedValue({ id: "survey-1" });
    storageMocks.upload.mockResolvedValue({ error: { message: "5xx" } });

    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 500));

    const result = await uploadSurveyLogo("survey-1", fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload failed: 5xx");
  });

  it("rejects non-admin callers", async () => {
    mockSession = createMemberSession();
    const fd = new FormData();
    const result = await uploadSurveyLogo("survey-1", fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// uploadSurveyWallpaper — company-scoped, no surveyId required so the wizard
// can call it before the survey row exists.
// ---------------------------------------------------------------------------

describe("uploadSurveyWallpaper", () => {
  it("rejects when no file is provided", async () => {
    const fd = new FormData();
    const result = await uploadSurveyWallpaper(fd);
    expect(result.success).toBe(false);
    expect(result.error).toBe("No file provided");
  });

  it("rejects unsupported mime types", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("evil.exe", "application/x-msdownload", 100));

    const result = await uploadSurveyWallpaper(fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unsupported file type/);
  });

  it("rejects oversized files (>2MB)", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("big.png", "image/png", 3 * 1024 * 1024));

    const result = await uploadSurveyWallpaper(fd);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/);
  });

  it("uploads to the company-scoped wallpapers path and returns the public URL", async () => {
    storageMocks.upload.mockResolvedValue({ error: null });
    storageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/survey-assets/wp.jpg" },
    });

    const fd = new FormData();
    fd.append("file", makeFile("hero.jpg", "image/jpeg", 1024));

    const result = await uploadSurveyWallpaper(fd);

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe(
      "https://cdn.example.com/survey-assets/wp.jpg",
    );
    expect(storageMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^companies\/company-1\/wallpapers\/\d+\.jpg$/,
      ),
      expect.any(File),
      expect.objectContaining({
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      }),
    );
  });

  it("surfaces upload errors from supabase", async () => {
    storageMocks.upload.mockResolvedValue({ error: { message: "boom" } });

    const fd = new FormData();
    fd.append("file", makeFile("hero.png", "image/png", 500));

    const result = await uploadSurveyWallpaper(fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload failed: boom");
  });

  it("rejects non-admin callers via the wrapping error", async () => {
    mockSession = createMemberSession();
    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 100));

    const result = await uploadSurveyWallpaper(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects unauthenticated callers via the wrapping error", async () => {
    mockSession = createUnauthenticatedSession() as never;
    const fd = new FormData();
    fd.append("file", makeFile("logo.png", "image/png", 100));

    const result = await uploadSurveyWallpaper(fd);
    expect(result.success).toBe(false);
  });
});
