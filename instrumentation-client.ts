import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // PII off by default — this app handles anonymous survey responses where
  // capturing IPs would undermine anonymity guarantees. Enable per-event with
  // Sentry.setUser() after explicit consent if needed.
  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Replay: 10% of all sessions, 100% of error sessions.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    // Defaults mask all text + block media — important for an HR/feedback
    // platform that surfaces sensitive employee data.
    Sentry.replayIntegration(),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
