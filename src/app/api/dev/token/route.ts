import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { encode } from "next-auth/jwt";

// DEV ONLY — Creates a session JWT directly for a given email (bypasses email verification)
// Sets the session cookie and redirects to /overview
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "auth secret missing" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const redirectTo = searchParams.get("redirect") || "/overview";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, globalRole: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: user.id, isActive: true },
      include: { company: { select: { id: true, name: true, slug: true } } },
    });

    const jwt = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole || "USER",
        ...(companyUser ? { currentCompanyId: companyUser.companyId } : {}),
      },
      secret,
    });

    const cookieName = "next-auth.session-token";
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set(cookieName, jwt, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
