import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { encode } from "next-auth/jwt";

// DEV ONLY - Remove after testing
// Creates a session JWT directly for a given email (bypasses email verification)
// Sets the session cookie and redirects to /overview
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const redirectTo = searchParams.get("redirect") || "/overview";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, globalRole: true },
    });

    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    // Find the user's company
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: user.id, isActive: true },
      include: { company: { select: { id: true, name: true, slug: true } } },
    });

    // Create a JWT token directly
    const jwt = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole || "USER",
        ...(companyUser ? { currentCompanyId: companyUser.companyId } : {}),
      },
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
    });

    // Set the session cookie via response header and redirect
    const cookieName = "next-auth.session-token";
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set(cookieName, jwt, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
