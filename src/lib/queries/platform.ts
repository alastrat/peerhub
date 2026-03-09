"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getPlatformStats() {
  await requireSuperAdmin();

  const [companies, users, activeCycles, completedReviews] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.cycle.count({
      where: { status: { in: ["IN_PROGRESS", "NOMINATION"] } },
    }),
    prisma.reviewAssignment.count({ where: { status: "COMPLETED" } }),
  ]);

  return { companies, users, activeCycles, completedReviews };
}

export async function getPlatformCompanies() {
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, cycles: true } },
    },
    orderBy: { name: "asc" },
  });

  const activeCycleCounts = await prisma.cycle.groupBy({
    by: ["companyId"],
    where: { status: { in: ["IN_PROGRESS", "NOMINATION"] } },
    _count: true,
  });

  const activeCycleMap = new Map(
    activeCycleCounts.map((c) => [c.companyId, c._count])
  );

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    domain: c.domain,
    usersCount: c._count.users,
    totalCycles: c._count.cycles,
    activeCycles: activeCycleMap.get(c.id) || 0,
    createdAt: c.createdAt,
  }));
}

export async function getPlatformUsers() {
  await requireSuperAdmin();

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { companies: true } },
      companies: {
        where: { isActive: true },
        select: {
          role: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    globalRole: u.globalRole,
    companiesCount: u._count.companies,
    companies: u.companies.map((c) => ({
      name: c.company.name,
      role: c.role,
    })),
    createdAt: u.createdAt,
  }));
}

export async function getSuperAdminDomains() {
  await requireSuperAdmin();

  return prisma.superAdminDomain.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCycleStatusDistribution() {
  await requireSuperAdmin();

  const result = await prisma.cycle.groupBy({
    by: ["status"],
    _count: true,
  });

  return result.map((r) => ({
    status: r.status,
    count: r._count,
  }));
}

export async function getTopCompaniesBySize() {
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { users: { _count: "desc" } },
    take: 10,
  });

  return companies.map((c) => ({
    name: c.name,
    usersCount: c._count.users,
  }));
}
