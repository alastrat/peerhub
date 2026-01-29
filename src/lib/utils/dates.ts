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
} from "date-fns";

export function formatDate(date: Date | string, formatStr = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
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
