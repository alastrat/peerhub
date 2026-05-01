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
    console.warn("[sentry] build plugin warning:", err.message);
  },
});
