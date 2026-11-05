import { createTranslator, type Messages } from "next-intl";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { routing, SUPPORTED_LOCALES, type SupportedLocale } from "./routing";

// Untyped like the rest of the app (no next-intl AppConfig): keys are plain strings
const MESSAGES: Record<SupportedLocale, Messages> = { es, en };

/** A company's stored locale as a supported app locale (anything else → es). */
export function toSupportedLocale(value: string | null | undefined): SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? "")
    ? (value as SupportedLocale)
    : routing.defaultLocale;
}

/**
 * Translator for copy that must follow a company's locale instead of the
 * request's (dashboard and portal routes have no locale segment): emails,
 * server-action errors and API responses.
 */
export function getTranslator(locale: string | null | undefined, namespace: string) {
  const resolved = toSupportedLocale(locale);
  return createTranslator({ locale: resolved, messages: MESSAGES[resolved], namespace });
}

export type Translator = ReturnType<typeof getTranslator>;
