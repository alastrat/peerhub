/**
 * Platform-wide look, picked by super admins in Configuración → Plataforma →
 * Apariencia and applied to every company and user. Rendered as
 * `data-platform-theme` on <html>; the "kultiva" styles live in
 * src/styles/platform/theme-kultiva.css.
 */
export const PLATFORM_THEMES = ["classic", "kultiva"] as const;

export type PlatformTheme = (typeof PLATFORM_THEMES)[number];

/** Used when no theme has been saved yet, so nothing changes until a super admin switches. */
export const DEFAULT_PLATFORM_THEME: PlatformTheme = "classic";

/** PlatformSetting.key that stores the theme. */
export const PLATFORM_THEME_SETTING_KEY = "theme";

/** Cache tag for the theme read in the root layout. */
export const PLATFORM_THEME_CACHE_TAG = "platform-theme";

export function isPlatformTheme(value: unknown): value is PlatformTheme {
  return (
    typeof value === "string" &&
    (PLATFORM_THEMES as readonly string[]).includes(value)
  );
}
