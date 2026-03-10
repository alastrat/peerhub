import { NextRequest, NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/actions/portal";
import { createPortalSession } from "@/lib/auth/portal-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await verifyPortalToken(token);

  if (!result.success || !result.data) {
    const url = new URL("/portal", request.url);
    url.searchParams.set("error", "invalid-token");
    return NextResponse.redirect(url);
  }

  const { employeeId, companyId, email } = result.data;

  await createPortalSession(employeeId, companyId, email);

  return NextResponse.redirect(new URL("/portal/home", request.url));
}
