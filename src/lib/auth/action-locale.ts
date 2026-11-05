import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { getPortalLocale } from "@/lib/auth/portal-locale";
import { getTranslator, toSupportedLocale } from "@/i18n/translator";
import type { SupportedLocale } from "@/i18n/routing";

type ErrorResult = { success: false; error: string };
type MessageValues = Record<string, string | number>;

/**
 * Language for a server action's messages: the caller's company locale
 * (dashboard session first, then the portal employee's). Actions run outside
 * the [locale] routes, so next-intl's request locale is always the default.
 */
export async function getActionLocale(): Promise<SupportedLocale> {
  try {
    const session = await auth();
    if (session?.companyUser) return toSupportedLocale(session.companyUser.locale);
    return await getPortalLocale();
  } catch {
    return toSupportedLocale(null);
  }
}

/** Translator for the `action_errors` messages in the caller's language. */
export async function getActionErrors() {
  return getTranslator(await getActionLocale(), "action_errors");
}

/** `{ success: false, error }` with an `action_errors` message. */
export async function actionError(key: string, values?: MessageValues): Promise<ErrorResult> {
  const t = await getActionErrors();
  return { success: false, error: t(key, values) };
}

// Errors the shared require* helpers throw
const THROWN_KEYS: Record<string, string> = {
  Unauthorized: "unauthorized",
  "No active company": "no_active_company",
  "Employee not found": "employee_not_found",
};

/**
 * For catch blocks: auth failures get their own message, anything else
 * `fallbackKey`. With `withDetail` the technical cause is appended, for
 * actions whose UI deliberately shows what went wrong.
 */
export async function unexpectedActionError(
  error: unknown,
  fallbackKey: string,
  { withDetail = false }: { withDetail?: boolean } = {},
): Promise<ErrorResult> {
  const t = await getActionErrors();
  if (error instanceof Error && THROWN_KEYS[error.message]) {
    return { success: false, error: t(THROWN_KEYS[error.message]) };
  }
  const detail =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `${error.code}: ${error.message.split("\n").pop() ?? error.message}`
      : error instanceof Error
        ? error.message
        : null;
  const message = t(fallbackKey);
  return { success: false, error: withDetail && detail ? t("with_detail", { message, detail }) : message };
}
