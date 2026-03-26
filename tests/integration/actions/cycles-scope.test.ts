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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/email/templates", () => ({
  sendReviewRequestEmail: vi.fn(),
  sendNominationRequestEmail: vi.fn(),
  sendExternalReviewRequestEmail: vi.fn(),
}));

vi.mock("@/lib/utils/dates", () => ({
  formatDate: vi.fn((d: Date) => d.toISOString()),
}));

vi.mock("@/lib/utils/notify-employee", () => ({
  notifyEmployee: vi.fn(),
}));

vi.mock("@/lib/utils/tokens", () => ({
  generateReviewToken: vi.fn(() => "test-token"),
}));

// Import AFTER mocks
import { createCycle } from "@/lib/actions/cycles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseInput = {
  name: "Test Cycle",
  templateId: "t1",
  reviewStartDate: new Date("2026-04-01"),
  reviewEndDate: new Date("2026-04-30"),
};

const fakeCycle = {
  id: "c1",
  name: "Test Cycle",
  companyId: "company-1",
  templateId: "t1",
  status: "DRAFT",
};

function mockTemplateFound() {
  mockPrisma.template.findFirst.mockResolvedValue({
    id: "t1",
    companyId: "company-1",
  });
}

function mockCycleCreate() {
  mockPrisma.cycle.create.mockResolvedValue(fakeCycle);
}

function mockParticipantCreateMany() {
  mockPrisma.cycleParticipant.createMany.mockResolvedValue({});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createCycle scope resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockSession = createAdminSession();
  });

  // 1. ALL scope
  it("should resolve ALL scope to all active employees", async () => {
    mockTemplateFound();
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "e1" },
      { id: "e2" },
    ]);
    mockCycleCreate();
    mockParticipantCreateMany();

    const result = await createCycle({ ...baseInput, scope: "ALL" });

    expect(result.success).toBe(true);
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", isActive: true },
      select: { id: true },
    });
    expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { cycleId: "c1", employeeId: "e1" },
        { cycleId: "c1", employeeId: "e2" },
      ],
    });
  });

  // 2. HUB scope
  it("should resolve HUB scope to employees in specified hubs", async () => {
    mockTemplateFound();
    mockPrisma.employee.findMany.mockResolvedValue([{ id: "e1" }]);
    mockCycleCreate();
    mockParticipantCreateMany();

    const result = await createCycle({
      ...baseInput,
      scope: "HUB",
      scopeIds: ["hub1"],
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        isActive: true,
        hubId: { in: ["hub1"] },
      },
      select: { id: true },
    });
    expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
      data: [{ cycleId: "c1", employeeId: "e1" }],
    });
  });

  // 3. DEPARTMENT scope
  it("should resolve DEPARTMENT scope to employees in specified departments", async () => {
    mockTemplateFound();
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "e1" },
      { id: "e2" },
    ]);
    mockCycleCreate();
    mockParticipantCreateMany();

    const result = await createCycle({
      ...baseInput,
      scope: "DEPARTMENT",
      scopeIds: ["dept1"],
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        isActive: true,
        departmentId: { in: ["dept1"] },
      },
      select: { id: true },
    });
    expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { cycleId: "c1", employeeId: "e1" },
        { cycleId: "c1", employeeId: "e2" },
      ],
    });
  });

  // 4. TEAM scope with deduplication
  it("should resolve TEAM scope with deduplication", async () => {
    mockTemplateFound();
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { employeeId: "e1" },
      { employeeId: "e1" },
      { employeeId: "e2" },
    ]);
    mockCycleCreate();
    mockParticipantCreateMany();

    const result = await createCycle({
      ...baseInput,
      scope: "TEAM",
      scopeIds: ["t1"],
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith({
      where: {
        team: { companyId: "company-1", id: { in: ["t1"] } },
        employee: { isActive: true },
      },
      select: { employeeId: true },
    });
    expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { cycleId: "c1", employeeId: "e1" },
        { cycleId: "c1", employeeId: "e2" },
      ],
    });
  });

  // 5. Default to CUSTOM scope when not provided
  it("should default to CUSTOM scope when not provided", async () => {
    mockTemplateFound();
    mockCycleCreate();

    const result = await createCycle(baseInput);

    expect(result.success).toBe(true);
    expect(mockPrisma.cycle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scope: "CUSTOM" }),
      })
    );
    // No participants → createMany should not be called
    expect(mockPrisma.cycleParticipant.createMany).not.toHaveBeenCalled();
  });

  // 6. CUSTOM scope with provided participantIds
  it("should use provided participantIds for CUSTOM scope", async () => {
    mockTemplateFound();
    mockCycleCreate();
    mockParticipantCreateMany();

    const result = await createCycle({
      ...baseInput,
      scope: "CUSTOM",
      participantIds: ["e1", "e2"],
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.cycleParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { cycleId: "c1", employeeId: "e1" },
        { cycleId: "c1", employeeId: "e2" },
      ],
    });
  });

  // 7. Template not found
  it("should return error when template not found", async () => {
    mockPrisma.template.findFirst.mockResolvedValue(null);

    const result = await createCycle(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Template not found");
    expect(mockPrisma.cycle.create).not.toHaveBeenCalled();
  });

  // 8. Requires admin role
  it("should require admin role", async () => {
    mockSession = createMemberSession();

    const result = await createCycle(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(mockPrisma.template.findFirst).not.toHaveBeenCalled();
  });
});
