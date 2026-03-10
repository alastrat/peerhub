import { NextResponse } from "next/server";
import { clearPortalSession } from "@/lib/auth/portal-session";

export async function GET(request: Request) {
  await clearPortalSession();

  return NextResponse.redirect(new URL("/portal", request.url));
}
