import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { globalSearch } from "@/lib/search/global-search";
import type { SearchResponse } from "@/lib/search/types";

// A route handler rather than a server action: the header searches as the
// user types, and server actions run one at a time and can't be aborted.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q");

  try {
    const results = await globalSearch(session, query);
    return NextResponse.json<SearchResponse>(
      { results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[search] query failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
