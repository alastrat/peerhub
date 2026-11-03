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
