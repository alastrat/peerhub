// "Today" for due dates and timestamps shown to people must not depend on
// the server's time zone (UTC on Vercel) or differ between server and
// browser renders. Companies don't store a time zone yet, so the platform
// uses one business time zone, configurable per deployment.

export const BUSINESS_TIME_ZONE = process.env.NEXT_PUBLIC_BUSINESS_TIME_ZONE || "America/Bogota";

/** Calendar day (YYYY-MM-DD) of an instant in the business time zone. */
export function businessDay(instant: Date, timeZone = BUSINESS_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** A business calendar day stored the way date inputs store it (UTC midnight). */
export function businessDayAsDate(instant: Date, timeZone = BUSINESS_TIME_ZONE): Date {
  return new Date(`${businessDay(instant, timeZone)}T00:00:00.000Z`);
}

/**
 * Calendar days (due dates, plan dates) are stored at UTC midnight, so they
 * format in UTC; pass the business time zone for real instants such as
 * "released at". Kept out of client modules so server components can call it.
 */
export function formatDay(value: Date | string | null | undefined, locale: string, timeZone = "UTC"): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
}
