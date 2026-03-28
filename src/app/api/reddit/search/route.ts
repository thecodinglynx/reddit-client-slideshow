import { NextRequest, NextResponse } from "next/server";
import { redditFetch } from "@/lib/reddit-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const limit = request.nextUrl.searchParams.get("limit") || "8";

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit,
    raw_json: "1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await redditFetch(`/subreddits/search.json?${params}`);
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const json = await res.json();
    const children = json?.data?.children ?? [];

    const results = children.map((child: { data: Record<string, unknown> }) => ({
      name: child.data.display_name as string,
      subscribers: child.data.subscribers as number,
      description: ((child.data.public_description as string) || (child.data.title as string) || "").slice(0, 120),
      over18: (child.data.over18 as boolean) ?? false,
    }));

    return NextResponse.json({ results });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ results: [] });
  }
}
