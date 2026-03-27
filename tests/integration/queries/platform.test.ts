import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockPrisma,
  type MockPrismaClient,
} from "../../helpers/mock-prisma";

let mockPrisma: MockPrismaClient;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

// Mock auth — requireSuperAdmin calls auth() internally
const mockAuth = vi.fn();
vi.mock("@/lib/auth/config", () => ({
  auth: () => mockAuth(),
}));

// Import AFTER mocks
import {
  getPlatformStats,
  getPlatformCompanies,
  getPlatformUsers,
  getSuperAdminDomains,
  getCycleStatusDistribution,
  getTopCompaniesBySize,
} from "@/lib/queries/platform";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asSuperAdmin() {
  mockAuth.mockResolvedValue({
    user: { id: "u1", email: "admin@test.com", globalRole: "SUPER_ADMIN" },
  });
}

function asRegularUser() {
  mockAuth.mockResolvedValue({
    user: { id: "u2", email: "user@test.com", globalRole: "USER" },
  });
}

function asUnauthenticated() {
  mockAuth.mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// Auth guard tests (shared by all functions)
// ---------------------------------------------------------------------------

describe("platform queries auth guard", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("should throw Unauthorized for regular users", async () => {
    asRegularUser();

    await expect(getPlatformStats()).rejects.toThrow("Unauthorized");
    await expect(getPlatformCompanies()).rejects.toThrow("Unauthorized");
    await expect(getPlatformUsers()).rejects.toThrow("Unauthorized");
    await expect(getSuperAdminDomains()).rejects.toThrow("Unauthorized");
    await expect(getCycleStatusDistribution()).rejects.toThrow("Unauthorized");
    await expect(getTopCompaniesBySize()).rejects.toThrow("Unauthorized");
  });

  it("should throw Unauthorized for unauthenticated requests", async () => {
    asUnauthenticated();

    await expect(getPlatformStats()).rejects.toThrow("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// getPlatformStats
// ---------------------------------------------------------------------------

describe("getPlatformStats", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return platform-wide counts", async () => {
    mockPrisma.company.count.mockResolvedValue(5);
    mockPrisma.user.count.mockResolvedValue(120);
    mockPrisma.cycle.count.mockResolvedValue(8);
    mockPrisma.reviewAssignment.count.mockResolvedValue(350);

    const result = await getPlatformStats();

    expect(result).toEqual({
      companies: 5,
      users: 120,
      activeCycles: 8,
      completedReviews: 350,
    });
  });

  it("should query active cycles with correct status filter", async () => {
    mockPrisma.company.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.cycle.count.mockResolvedValue(0);
    mockPrisma.reviewAssignment.count.mockResolvedValue(0);

    await getPlatformStats();

    expect(mockPrisma.cycle.count).toHaveBeenCalledWith({
      where: { status: { in: ["IN_PROGRESS", "NOMINATION"] } },
    });
    expect(mockPrisma.reviewAssignment.count).toHaveBeenCalledWith({
      where: { status: "COMPLETED" },
    });
  });
});

// ---------------------------------------------------------------------------
// getPlatformCompanies
// ---------------------------------------------------------------------------

describe("getPlatformCompanies", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return companies with user and cycle counts", async () => {
    const companies = [
      {
        id: "c1",
        name: "Acme Inc",
        slug: "acme",
        domain: "acme.com",
        createdAt: new Date("2026-01-01"),
        _count: { users: 10, cycles: 3 },
      },
      {
        id: "c2",
        name: "Beta Corp",
        slug: "beta",
        domain: "beta.io",
        createdAt: new Date("2026-02-01"),
        _count: { users: 25, cycles: 7 },
      },
    ];
    mockPrisma.company.findMany.mockResolvedValue(companies);
    mockPrisma.cycle.groupBy.mockResolvedValue([
      { companyId: "c1", _count: 2 },
    ]);

    const result = await getPlatformCompanies();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "c1",
      name: "Acme Inc",
      slug: "acme",
      domain: "acme.com",
      usersCount: 10,
      totalCycles: 3,
      activeCycles: 2,
      createdAt: new Date("2026-01-01"),
    });
    // c2 has no active cycles in groupBy result
    expect(result[1].activeCycles).toBe(0);
  });

  it("should return empty array when no companies", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.cycle.groupBy.mockResolvedValue([]);

    const result = await getPlatformCompanies();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPlatformUsers
// ---------------------------------------------------------------------------

describe("getPlatformUsers", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return users with company info", async () => {
    const users = [
      {
        id: "u1",
        email: "alice@acme.com",
        name: "Alice",
        image: null,
        globalRole: "USER",
        createdAt: new Date("2026-01-01"),
        _count: { companies: 1 },
        companies: [
          {
            role: "ADMIN",
            company: { name: "Acme Inc" },
          },
        ],
      },
    ];
    mockPrisma.user.findMany.mockResolvedValue(users);

    const result = await getPlatformUsers();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "u1",
      email: "alice@acme.com",
      name: "Alice",
      image: null,
      globalRole: "USER",
      companiesCount: 1,
      companies: [{ name: "Acme Inc", role: "ADMIN" }],
      createdAt: new Date("2026-01-01"),
    });
  });

  it("should return empty array when no users", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await getPlatformUsers();

    expect(result).toEqual([]);
  });

  it("should query users with correct includes and ordering", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    await getPlatformUsers();

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: { select: { companies: true } },
          companies: {
            where: { isActive: true },
            select: {
              role: true,
              company: { select: { name: true } },
            },
          },
        }),
        orderBy: { createdAt: "desc" },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getSuperAdminDomains
// ---------------------------------------------------------------------------

describe("getSuperAdminDomains", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return all super admin domains", async () => {
    const domains = [
      { id: "d1", domain: "admin.com", createdAt: new Date("2026-03-01") },
      { id: "d2", domain: "super.io", createdAt: new Date("2026-02-01") },
    ];
    mockPrisma.superAdminDomain.findMany.mockResolvedValue(domains);

    const result = await getSuperAdminDomains();

    expect(result).toEqual(domains);
    expect(mockPrisma.superAdminDomain.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return empty array when no domains", async () => {
    mockPrisma.superAdminDomain.findMany.mockResolvedValue([]);

    const result = await getSuperAdminDomains();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getCycleStatusDistribution
// ---------------------------------------------------------------------------

describe("getCycleStatusDistribution", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return cycle counts grouped by status", async () => {
    const groupByResult = [
      { status: "IN_PROGRESS", _count: 5 },
      { status: "CLOSED", _count: 12 },
      { status: "NOMINATION", _count: 3 },
    ];
    mockPrisma.cycle.groupBy.mockResolvedValue(groupByResult);

    const result = await getCycleStatusDistribution();

    expect(result).toEqual([
      { status: "IN_PROGRESS", count: 5 },
      { status: "CLOSED", count: 12 },
      { status: "NOMINATION", count: 3 },
    ]);
  });

  it("should return empty array when no cycles", async () => {
    mockPrisma.cycle.groupBy.mockResolvedValue([]);

    const result = await getCycleStatusDistribution();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getTopCompaniesBySize
// ---------------------------------------------------------------------------

describe("getTopCompaniesBySize", () => {
  beforeEach(() => {
    mockPrisma = createMockPrisma();
    asSuperAdmin();
  });

  it("should return top 10 companies ordered by user count", async () => {
    const companies = [
      { name: "Big Corp", _count: { users: 500 } },
      { name: "Medium Co", _count: { users: 100 } },
    ];
    mockPrisma.company.findMany.mockResolvedValue(companies);

    const result = await getTopCompaniesBySize();

    expect(result).toEqual([
      { name: "Big Corp", usersCount: 500 },
      { name: "Medium Co", usersCount: 100 },
    ]);
  });

  it("should query with correct ordering and limit", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);

    await getTopCompaniesBySize();

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      include: { _count: { select: { users: true } } },
      orderBy: { users: { _count: "desc" } },
      take: 10,
    });
  });

  it("should return empty array when no companies", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);

    const result = await getTopCompaniesBySize();

    expect(result).toEqual([]);
  });
});
