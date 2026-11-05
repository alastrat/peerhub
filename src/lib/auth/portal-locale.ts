import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { getPortalSession } from "@/lib/auth/portal-session";
import { toSupportedLocale } from "@/i18n/translator";
import type { SupportedLocale } from "@/i18n/routing";

/**
 * The portal's language: the signed-in employee's company locale (es before
 * sign-in). Portal routes have no locale segment, so next-intl's request
 * locale is always the default — portal server code passes this explicitly
 * to getTranslations / getMessages instead.
 */
export const getPortalLocale = cache(async (): Promise<SupportedLocale> => {
  const session = await getPortalSession();
  if (!session) return toSupportedLocale(null);
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { locale: true },
  });
  return toSupportedLocale(company?.locale);
});
