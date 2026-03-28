import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const subreddit = searchParams.get("subreddit");
  const user = searchParams.get("user");
  const sort = searchParams.get("sort") || "hot";
  const limit = searchParams.get("limit") || "50";
  const t = searchParams.get("t") || "day";
  const after = searchParams.get("after") || "";
  const raw_json = "1";

  const namePattern = /^[a-zA-Z0-9_-]{1,50}$/;

  if (!subreddit && !user) {
    return NextResponse.json({ error: "Must provide subreddit or user" }, { status: 400 });
  }
  if (subreddit && !namePattern.test(subreddit)) {
    return NextResponse.json({ error: "Invalid subreddit name" }, { status: 400 });
  }
  if (user && !namePattern.test(user)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const params = new URLSearchParams({ limit, raw_json });
  if (sort === "top") params.set("t", t);
  if (after) params.set("after", after);

  const url = user
    ? `https://www.reddit.com/user/${encodeURIComponent(user)}/submitted/${sort}.json?${params}`
    : `https://www.reddit.com/r/${encodeURIComponent(subreddit!)}/${sort}.json?${params}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "reddit-slideshow-client/1.0 (server-proxy)" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Reddit API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch from Reddit: ${message}` },
      { status: 502 }
    );
  }
}
