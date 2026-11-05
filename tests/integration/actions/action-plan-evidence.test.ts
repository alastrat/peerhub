import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import type { ClimateActor } from "@/lib/auth/climate-actor";

let mockPrisma: MockPrismaClient;
let actor: ClimateActor | null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/climate-actor", () => ({
  getClimateActor: vi.fn(async () => actor),
  requireClimateActor: vi.fn(async () => {
    if (!actor) throw new Error("Unauthorized");
    return actor;
  }),
}));

vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// The action does a dynamic `import("@/lib/supabase/server")`
const upload = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseStorageClient: vi.fn(() => ({ storage: { from: vi.fn(() => ({ upload })) } })),
  CLIMATE_EVIDENCE_BUCKET: "climate-evidence",
}));

// Import AFTER mocks
import { uploadTaskEvidence } from "@/lib/actions/action-plans";
import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_MB } from "@/lib/constants/action-plan-evidence";
import nextConfig from "../../../next.config";

const leader: ClimateActor = { kind: "employee", companyId: "company-1", userId: null, employeeId: "lead-1", name: "Sara" };

function task() {
  return {
    id: "task-1",
    planId: "plan-1",
    ownerEmployeeId: null,
    plan: { id: "plan-1", surveyId: "survey-1", status: "ACTIVE", ownerEmployeeId: "lead-1", tasks: [] },
  };
}

/** "4.5mb" → bytes, the way Next reads `bodySizeLimit` (1 MB = 1024 KB). */
function parseMb(limit: string) {
  const match = /^(\d+(?:\.\d+)?)\s*mb$/i.exec(limit);
  if (!match) throw new Error(`Expected a size in MB, got ${limit}`);
  return Math.floor(Number(match[1]) * 1024 * 1024);
}

function withFile(size: number, type = "image/jpeg") {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(size)], "foto.jpg", { type }));
  return fd;
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockPrisma.company.findUnique.mockResolvedValue({ locale: "es" });
  mockPrisma.actionPlanTask.findFirst.mockResolvedValue(task());
  mockPrisma.actionPlanEvidence.count.mockResolvedValue(0);
  mockPrisma.actionPlanEvidence.create.mockResolvedValue({ id: "ev-1" });
  upload.mockReset().mockResolvedValue({ error: null });
  actor = leader;
});

describe("uploadTaskEvidence size limit", () => {
  it("is 4 MB", () => {
    expect(MAX_EVIDENCE_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_EVIDENCE_MB).toBe(4);
  });

  it("uploads a file of exactly 4 MB", async () => {
    const res = await uploadTaskEvidence("task-1", withFile(MAX_EVIDENCE_BYTES));

    expect(res).toEqual({ success: true, data: { id: "ev-1" } });
    expect(upload).toHaveBeenCalledOnce();
    expect(mockPrisma.actionPlanEvidence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ taskId: "task-1", sizeBytes: MAX_EVIDENCE_BYTES, mimeType: "image/jpeg" }),
    });
  });

  it("uploads a 2 MB file, which the default 1 MB Server Action limit used to reject", async () => {
    const res = await uploadTaskEvidence("task-1", withFile(2 * 1024 * 1024, "application/pdf"));

    expect(res.success).toBe(true);
    expect(upload).toHaveBeenCalledOnce();
  });

  it("rejects a file over 4 MB before it reaches storage", async () => {
    const res = await uploadTaskEvidence("task-1", withFile(MAX_EVIDENCE_BYTES + 1));

    expect(res).toEqual({ success: false, error: "Los archivos pueden pesar máximo 4 MB" });
    expect(upload).not.toHaveBeenCalled();
    expect(mockPrisma.actionPlanEvidence.count).not.toHaveBeenCalled();
    expect(mockPrisma.actionPlanEvidence.create).not.toHaveBeenCalled();
  });

  it("names the limit in the company language", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ locale: "en" });
    const res = await uploadTaskEvidence("task-1", withFile(5 * 1024 * 1024));

    expect(res).toEqual({ success: false, error: "Files can be at most 4 MB" });
  });

  it("fits a 4 MB file in the Server Action body limit, which stays within Vercel's 4.5 MB", () => {
    const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
    expect(limit).toBeDefined();
    const limitBytes = parseMb(String(limit));
    // Room for the multipart boundaries, headers and the task id argument
    expect(limitBytes).toBeGreaterThanOrEqual(MAX_EVIDENCE_BYTES + 64 * 1024);
    expect(limitBytes).toBeLessThanOrEqual(4.5 * 1024 * 1024);
  });
});
