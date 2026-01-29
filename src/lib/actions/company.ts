"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Company, CompanyUser } from "@prisma/client";

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
          userId: input.userId,
          companyId: company.id,
          role: "ADMIN",
        },
      });

      return { company, companyUser };
    });

    revalidatePath("/");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create company:", error);
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
