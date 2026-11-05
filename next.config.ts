import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Action plan evidence is uploaded through a Server Action, and the
      // default 1 MB limit rejected most photos and scans. Vercel caps
      // function request bodies at 4.5 MB, so files are limited to 4 MB
      // (MAX_EVIDENCE_BYTES) and the rest covers the multipart overhead.
      bodySizeLimit: "4.5mb",
    },
  },
  async redirects() {
    return [
      // A plan's page moved from its survey to Planes de acción. Emails
      // already sent still link to the old URL.
      {
        source: "/surveys/climate/:surveyId/plans/:planId",
        destination: "/action-plans/:surveyId/plans/:planId",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Tunnel client events through a same-origin route so ad-blockers / strict
  // CSPs don't drop them.
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  // Only upload source maps when an auth token is available (CI / Vercel).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  errorHandler: (err) => {
    // Fail the build in CI so a broken source-map upload doesn't ship a
    // release where stack traces are unreadable. Warn locally so dev builds
    // without an auth token still succeed.
    if (process.env.CI) {
      throw err;
    }
    console.warn("[sentry] build plugin warning:", err.message);
  },
});
