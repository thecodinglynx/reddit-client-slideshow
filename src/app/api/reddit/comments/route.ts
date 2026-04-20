import { NextRequest, NextResponse } from "next/server";
import { redditFetch } from "@/lib/reddit-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const permalink = request.nextUrl.searchParams.get("permalink");
  if (!permalink) {
    return NextResponse.json({ comments: [] });
  }

  try {
    const params = new URLSearchParams({
      raw_json: "1",
      limit: "50",
      depth: "3",
      sort: "top",
    });
    const res = await redditFetch(`${permalink}.json?${params}`);
    if (!res.ok) {
      return NextResponse.json({ comments: [] });
    }

    const json = await res.json();
    const commentListing = json[1]?.data?.children ?? [];

    const comments = flattenComments(commentListing);
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  depth: number;
  created_utc: number;
  replies: RedditComment[];
}

function flattenComments(
  children: Array<{ kind: string; data: Record<string, unknown> }>,
  depth = 0
): RedditComment[] {
  const result: RedditComment[] = [];
  for (const child of children) {
    if (child.kind !== "t1") continue;
    const d = child.data;
    const replies =
      d.replies && typeof d.replies === "object"
        ? flattenComments(
            (d.replies as { data?: { children?: Array<{ kind: string; data: Record<string, unknown> }> } })?.data
              ?.children ?? [],
            depth + 1
          )
        : [];
    result.push({
      id: d.id as string,
      author: d.author as string,
      body: d.body as string,
      score: d.score as number,
      depth,
      created_utc: d.created_utc as number,
      replies,
    });
  }
  return result;
}
