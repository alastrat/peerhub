import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isPast,
  isFuture,
  differenceInDays,
  addDays,
  parseISO,
  type Locale,
} from "date-fns";
import { enUS, es } from "date-fns/locale";

/** date-fns locale for a UI locale (es/en); English when none is given. */
function dateLocale(locale?: string | null): Locale {
  return locale === "es" ? es : enUS;
}

/**
 * Default format "PP" is the localized medium date:
 * "Nov 16, 2026" (en, or no locale) / "16 nov 2026" (es).
 */
export function formatDate(date: Date | string, formatStr = "PP", locale?: string | null): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr, { locale: dateLocale(locale) });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/** "7 minutes ago" / "hace 7 minutos", following `locale`. */
export function formatRelativeTime(date: Date | string, locale?: string | null): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale(locale) });
}

export function isDateInPast(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isPast(d);
}

export function isDateInFuture(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isFuture(d);
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(d, new Date());
}

export function daysOverdue(date: Date | string): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(new Date(), d);
}

export function getExpiryDate(days: number = 14): Date {
  return addDays(new Date(), days);
}

export { isAfter, isBefore, addDays, parseISO };
