import { NextRequest, NextResponse } from "next/server";
import { redditFetch } from "@/lib/reddit-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const subreddit = request.nextUrl.searchParams.get("subreddit");
  const namePattern = /^[a-zA-Z0-9_]{1,50}$/;

  if (!subreddit || !namePattern.test(subreddit)) {
    return NextResponse.json({ error: "Invalid subreddit name" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await redditFetch(`/r/${encodeURIComponent(subreddit)}/about.json?raw_json=1`);
    clearTimeout(timeout);

    if (!res.ok || res.status >= 300) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const json = await res.json();
    const data = json?.data;

    if (!data || !data.display_name || data.subreddit_type === "private") {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json({
      exists: true,
      name: data.display_name,
      subscribers: data.subscribers,
      description: data.public_description || data.title || "",
      over18: data.over18 ?? false,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ exists: false, error: "Failed to check subreddit" }, { status: 200 });
  }
}
