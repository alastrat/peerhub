import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Local variables in server stack frames can contain employee PII or raw
  // survey responses. Keep it on in dev for debugging, off in prod to honour
  // the platform's anonymity guarantees (matches sendDefaultPii: false above).
  includeLocalVariables: process.env.NODE_ENV === "development",

  enableLogs: true,
});
