import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "portal-session";
const EXPIRY_DAYS = 7;
const DAY_SECONDS = 24 * 60 * 60;

interface PortalSessionPayload {
  employeeId: string;
  companyId: string;
  /** Null for people without a corporate email, signed in by a survey link */
  email: string | null;
  /**
   * Set for a session opened by a personal survey link: it can only open and
   * answer this survey distribution, nothing else in the portal.
   */
  surveyDistributionId: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.PORTAL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Missing PORTAL_SECRET or NEXTAUTH_SECRET environment variable"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createPortalSession(
  employeeId: string,
  companyId: string,
  email: string | null,
  /** A survey link's session: only that distribution, until `expiresAt` (at most the usual 7 days) */
  surveyOnly?: { distributionId: string; expiresAt: Date },
): Promise<void> {
  const maxAge = surveyOnly
    ? Math.max(60, Math.min(EXPIRY_DAYS * DAY_SECONDS, Math.floor((surveyOnly.expiresAt.getTime() - Date.now()) / 1000)))
    : EXPIRY_DAYS * DAY_SECONDS;
  const token = await new SignJWT({
    employeeId,
    companyId,
    email,
    ...(surveyOnly && { surveyDistributionId: surveyOnly.distributionId }),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(surveyOnly ? `${maxAge}s` : `${EXPIRY_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** The signed-in portal person, whatever their session may open (for showing their name or language). */
export async function getPortalIdentity(): Promise<PortalSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { employeeId, companyId, email, surveyDistributionId } = payload as unknown as PortalSessionPayload;

    if (!employeeId || !companyId) {
      return null;
    }

    return { employeeId, companyId, email: email || null, surveyDistributionId: surveyDistributionId || null };
  } catch {
    return null;
  }
}

/**
 * The portal session, for pages and actions that give access. A survey
 * link's session only counts for its own survey distribution: everywhere
 * else it's as if nobody were signed in.
 */
export async function getPortalSession(options: { distributionId?: string } = {}): Promise<PortalSessionPayload | null> {
  const session = await getPortalIdentity();
  if (!session) return null;
  if (session.surveyDistributionId && session.surveyDistributionId !== options.distributionId) return null;
  return session;
}

export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
