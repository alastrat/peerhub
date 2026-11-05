"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import type { ActionResult } from "@/types";
import { DEFAULT_EMAIL_SIGNATURE, EMAIL_SIGNATURE_SETTING_KEY } from "@/lib/email/email-constants";

const MAX_SIGNATURE = 80;

/**
 * The name that signs the survey results and action-plan emails of every
 * company ({firma_nombre}). Blank goes back to the default. Super admins only.
 */
export async function updateEmailSignature(signature: string): Promise<ActionResult<{ signature: string }>> {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }
  const value = (signature ?? "").replace(/\s+/g, " ").trim();
  if (value.length > MAX_SIGNATURE) {
    return { success: false, error: `Max ${MAX_SIGNATURE} characters` };
  }

  try {
    if (!value) {
      await prisma.platformSetting.deleteMany({ where: { key: EMAIL_SIGNATURE_SETTING_KEY } });
    } else {
      await prisma.platformSetting.upsert({
        where: { key: EMAIL_SIGNATURE_SETTING_KEY },
        create: { key: EMAIL_SIGNATURE_SETTING_KEY, value, updatedById: session.user.id },
        update: { value, updatedById: session.user.id },
      });
    }
  } catch (error) {
    console.error("[email-signature] Failed to save the signature:", error);
    return { success: false, error: "Failed to save the signature" };
  }

  revalidatePath("/settings/platform/appearance");
  return { success: true, data: { signature: value || DEFAULT_EMAIL_SIGNATURE } };
}
