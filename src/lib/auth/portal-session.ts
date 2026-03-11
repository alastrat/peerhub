import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "portal-session";
const EXPIRY_DAYS = 7;

interface PortalSessionPayload {
  employeeId: string;
  companyId: string;
  email: string;
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
  email: string
): Promise<void> {
  const token = await new SignJWT({ employeeId, companyId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EXPIRY_DAYS * 24 * 60 * 60,
  });
}

export async function getPortalSession(): Promise<PortalSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { employeeId, companyId, email } = payload as unknown as PortalSessionPayload;

    if (!employeeId || !companyId || !email) {
      return null;
    }

    return { employeeId, companyId, email };
  } catch {
    return null;
  }
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
