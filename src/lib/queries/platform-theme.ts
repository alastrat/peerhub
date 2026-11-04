import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_PLATFORM_THEME,
  PLATFORM_THEME_CACHE_TAG,
  PLATFORM_THEME_SETTING_KEY,
  isPlatformTheme,
  type PlatformTheme,
} from "@/lib/constants/platform-theme";

/**
 * The saved platform theme, or the default when none is saved, the value is
 * unknown, or the database can't be reached (e.g. a build without one). The
 * root layout calls this on every page, so it never throws.
 */
export async function readPlatformTheme(): Promise<PlatformTheme> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: PLATFORM_THEME_SETTING_KEY },
      select: { value: true },
    });
    return isPlatformTheme(setting?.value) ? setting.value : DEFAULT_PLATFORM_THEME;
  } catch (error) {
    console.error("[platform-theme] Failed to read the theme setting:", error);
    return DEFAULT_PLATFORM_THEME;
  }
}

/**
 * Cached across requests; `updatePlatformTheme` expires it through
 * PLATFORM_THEME_CACHE_TAG, so a switch shows up on the next request.
 */
export const getPlatformTheme = unstable_cache(readPlatformTheme, ["platform-theme"], {
  tags: [PLATFORM_THEME_CACHE_TAG],
});
