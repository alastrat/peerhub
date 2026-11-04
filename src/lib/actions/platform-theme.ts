"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import type { ActionResult } from "@/types";
import {
  PLATFORM_THEME_CACHE_TAG,
  PLATFORM_THEME_SETTING_KEY,
  isPlatformTheme,
  type PlatformTheme,
} from "@/lib/constants/platform-theme";

/**
 * Switch the look of the whole platform (every company, user, portal and
 * auth page). Only super admins may call it.
 */
export async function updatePlatformTheme(
  theme: PlatformTheme,
): Promise<ActionResult<{ theme: PlatformTheme }>> {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (!isPlatformTheme(theme)) {
    return { success: false, error: "Invalid theme" };
  }

  try {
    await prisma.platformSetting.upsert({
      where: { key: PLATFORM_THEME_SETTING_KEY },
      create: { key: PLATFORM_THEME_SETTING_KEY, value: theme, updatedById: session.user.id },
      update: { value: theme, updatedById: session.user.id },
    });
  } catch (error) {
    console.error("[platform-theme] Failed to save the theme setting:", error);
    return { success: false, error: "Failed to update the theme" };
  }

  // The theme is read in the root layout, so every page has to re-render.
  updateTag(PLATFORM_THEME_CACHE_TAG);
  revalidatePath("/", "layout");

  return { success: true, data: { theme } };
}
