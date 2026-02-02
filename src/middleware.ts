import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default intlMiddleware;

export const config = {
  // Match only internationalized pathnames for the website
  // Exclude API routes, static files, and the dashboard/auth routes
  matcher: [
    // Match all pathnames except:
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /.*\\..* (files with extensions like .ico, .png, etc.)
    // - Dashboard and auth routes (they don't need i18n)
    "/((?!api|_next|.*\\..*|overview|cycles|templates|people|nominations|my-reviews|my-feedback|reports|analytics|settings|login|signup|auth|onboarding).*)",
  ],
};
