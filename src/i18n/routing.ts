import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed", // Spanish URLs have no prefix, English uses /en
});

export type Locale = (typeof routing.locales)[number];
