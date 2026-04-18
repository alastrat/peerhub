import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: "es",
  localePrefix: "as-needed", // Spanish URLs have no prefix, English uses /en
});

export type Locale = (typeof routing.locales)[number];
