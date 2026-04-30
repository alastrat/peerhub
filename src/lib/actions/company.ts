"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Company, CompanyUser } from "@prisma/client";
import { Prisma } from "@prisma/client";

interface CreateCompanyInput {
  name: string;
  slug: string;
  userId: string;
}

interface CreateCompanyResult {
  company: Company;
  companyUser: CompanyUser;
}

export async function createCompany(
  input: CreateCompanyInput
): Promise<ActionResult<CreateCompanyResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Always use the authenticated session user id — never trust caller-supplied
    // input.userId for the CompanyUser membership.
    const userId = session.user.id;

    // Verify the User row actually exists. Magic-link sign-in can leave a
    // valid JWT after a DB reset; the FK on CompanyUser.userId would then
    // fail with an opaque P2003 inside the transaction below.
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return {
        success: false,
        error: "Your session is out of sync — please sign out and sign in again.",
      };
    }

    // Check if slug is already taken
    const existingCompany = await prisma.company.findUnique({
      where: { slug: input.slug },
    });

    if (existingCompany) {
      return { success: false, error: "This URL is already taken" };
    }

    // Create company and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });

      const companyUser = await tx.companyUser.create({
        data: {
          userId,
          companyId: company.id,
          role: "ADMIN",
        },
      });

      return { company, companyUser };
    });

    revalidatePath("/");
    return { success: true, data: result };
  } catch (error) {
    // Log full detail server-side; user-facing message stays generic so we
    // don't leak internal errors into the toast.
    console.error("Failed to create company:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "This URL is already taken" };
      }
      if (error.code === "P2003") {
        return {
          success: false,
          error: "Your account is not set up correctly. Please sign out and sign in again.",
        };
      }
    }

    return { success: false, error: "Failed to create company" };
  }
}

export async function updateCompany(
  companyId: string,
  data: Partial<Pick<Company, "name" | "logo" | "primaryColor">>
): Promise<ActionResult<Company>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (session.companyUser?.companyId !== companyId) {
      return { success: false, error: "Unauthorized" };
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    revalidatePath("/settings");
    return { success: true, data: company };
  } catch (error) {
    console.error("Failed to update company:", error);
    return { success: false, error: "Failed to update company" };
  }
}

export async function getCompany(companyId: string): Promise<Company | null> {
  return prisma.company.findUnique({
    where: { id: companyId },
  });
}

export interface CompanySwitchOption {
  companyId: string;
  companyName: string;
  companySlug: string;
  role: string;
}

export async function getAvailableCompanies(): Promise<CompanySwitchOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  // SUPER_ADMIN sees all companies
  if (session.user.globalRole === "SUPER_ADMIN") {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    // For each company, check if user has a CompanyUser record
    const companyUsers = await prisma.companyUser.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { companyId: true, role: true },
    });

    const roleMap = new Map(companyUsers.map((cu) => [cu.companyId, cu.role]));

    return companies.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      companySlug: c.slug,
      role: roleMap.get(c.id) || "SUPER_ADMIN",
    }));
  }

  // Regular users see only their companies
  const companyUsers = await prisma.companyUser.findMany({
    where: { userId: session.user.id, isActive: true },
    include: {
      company: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { company: { name: "asc" } },
  });

  return companyUsers.map((cu) => ({
    companyId: cu.company.id,
    companyName: cu.company.name,
    companySlug: cu.company.slug,
    role: cu.role,
  }));
}

export async function switchCompany(
  companyId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // SUPER_ADMIN can switch to any company
  if (session.user.globalRole === "SUPER_ADMIN") {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Ensure SUPER_ADMIN has a CompanyUser record (create if needed)
    const existing = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId },
    });

    if (!existing) {
      await prisma.companyUser.create({
        data: {
          userId: session.user.id,
          companyId,
          role: "ADMIN",
          isActive: true,
        },
      });
    } else if (!existing.isActive) {
      await prisma.companyUser.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }

    revalidatePath("/");
    return { success: true };
  }

  // Regular users can only switch to companies they belong to
  const companyUser = await prisma.companyUser.findFirst({
    where: { userId: session.user.id, companyId, isActive: true },
  });

  if (!companyUser) {
    return { success: false, error: "You don't belong to this company" };
  }

  revalidatePath("/");
  return { success: true };
}
