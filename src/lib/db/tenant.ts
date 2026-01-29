import { prisma } from "./prisma";
import type { Session } from "next-auth";
import type { Company, CompanyUser } from "@prisma/client";

export interface TenantContext {
  companyId: string;
  company: Company;
  companyUser: CompanyUser;
}

export async function getTenantContext(
  session: Session | null
): Promise<TenantContext | null> {
  if (!session?.user?.id || !session?.companyUser?.companyId) {
    return null;
  }

  const companyUser = await prisma.companyUser.findFirst({
    where: {
      userId: session.user.id,
      companyId: session.companyUser.companyId,
      isActive: true,
    },
    include: {
      company: true,
    },
  });

  if (!companyUser) {
    return null;
  }

  return {
    companyId: companyUser.companyId,
    company: companyUser.company,
    companyUser,
  };
}

export async function requireTenantContext(
  session: Session | null
): Promise<TenantContext> {
  const context = await getTenantContext(session);
  if (!context) {
    throw new Error("Tenant context required");
  }
  return context;
}

export async function getUserCompanies(userId: string) {
  return prisma.companyUser.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      company: true,
    },
    orderBy: {
      company: {
        name: "asc",
      },
    },
  });
}

export async function getCompanyBySlug(slug: string) {
  return prisma.company.findUnique({
    where: { slug },
  });
}

export async function createCompanyWithAdmin(data: {
  name: string;
  slug: string;
  userId: string;
  userEmail: string;
  userName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Create the company
    const company = await tx.company.create({
      data: {
        name: data.name,
        slug: data.slug,
      },
    });

    // Create the company user as admin
    const companyUser = await tx.companyUser.create({
      data: {
        userId: data.userId,
        companyId: company.id,
        role: "ADMIN",
      },
    });

    return { company, companyUser };
  });
}

export async function switchCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  const companyUser = await prisma.companyUser.findFirst({
    where: {
      userId,
      companyId,
      isActive: true,
    },
  });

  return !!companyUser;
}

// Helper to scope queries by company
export function withCompanyScope<T extends { companyId: string }>(
  companyId: string
): { companyId: string } {
  return { companyId };
}

// Validate that a resource belongs to the company
export async function validateResourceOwnership(
  resourceId: string,
  companyId: string,
  resourceType: "user" | "department" | "template" | "cycle"
): Promise<boolean> {
  switch (resourceType) {
    case "user":
      const user = await prisma.companyUser.findFirst({
        where: { id: resourceId, companyId },
      });
      return !!user;

    case "department":
      const dept = await prisma.department.findFirst({
        where: { id: resourceId, companyId },
      });
      return !!dept;

    case "template":
      const template = await prisma.template.findFirst({
        where: { id: resourceId, companyId },
      });
      return !!template;

    case "cycle":
      const cycle = await prisma.cycle.findFirst({
        where: { id: resourceId, companyId },
      });
      return !!cycle;

    default:
      return false;
  }
}
