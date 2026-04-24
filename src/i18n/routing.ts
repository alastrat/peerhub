import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed", // Spanish URLs have no prefix, English uses /en
  // Don't auto-redirect based on the browser's Accept-Language header.
  // Spanish is the marketing default; users pick English via the language switcher.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
