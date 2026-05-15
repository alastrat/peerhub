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
  taxId: string;
  userId: string;
  // Optional job title — the onboarding flow collects this in step 1 but
  // can't persist it until an Employee row exists, which only happens here.
  jobTitle?: string;
}

const TAX_ID_RE = /^[A-Za-z0-9.\-/ ]+$/;

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "Your session is out of sync — please sign out and sign in again.",
      };
    }

    // Validate tax ID (required, format-agnostic).
    const taxId = input.taxId.trim();
    if (taxId.length < 5 || taxId.length > 32 || !TAX_ID_RE.test(taxId)) {
      return { success: false, error: "Invalid tax ID" };
    }

    // Check if slug is already taken
    const existingCompany = await prisma.company.findUnique({
      where: { slug: input.slug },
    });

    if (existingCompany) {
      return { success: false, error: "This URL is already taken" };
    }

    // Build the Employee.name from whatever profile data we have. Order of
    // preference: firstName + lastName → user.name → email local-part.
    const employeeName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.name ||
      user.email.split("@")[0];

    // Create company + employee + admin user in a transaction so the new
    // CompanyUser is linked to a fully-formed Employee row.
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.name,
          slug: input.slug,
          taxId,
        },
      });

      const employee = await tx.employee.create({
        data: {
          companyId: company.id,
          email: user.email,
          name: employeeName,
          title: input.jobTitle?.trim() || null,
        },
      });

      const companyUser = await tx.companyUser.create({
        data: {
          userId,
          companyId: company.id,
          role: "ADMIN",
          employeeId: employee.id,
        },
      });

      return { company, companyUser };
    });

    revalidatePath("/");
    return { success: true, data: result };
  } catch (error) {
    // Log full detail server-side; user-facing message stays generic / tagged
    // by error class so we don't leak internals into the toast but still narrow
    // the failure mode without a dashboard round-trip.
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
      return {
        success: false,
        error: `Database error (${error.code}). Please try again.`,
      };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        error: "Couldn't connect to the database. Please try again in a moment.",
      };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return { success: false, error: "Invalid company data — please review your input." };
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return {
        success: false,
        error: "Database is busy. Please try again in a moment.",
      };
    }

    return { success: false, error: "Failed to create company (unexpected error)." };
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
