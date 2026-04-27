import { NextRequest, NextResponse } from "next/server";
import { redditFetch } from "@/lib/reddit-auth";

export const dynamic = "force-dynamic";

interface SubredditResult {
  name: string;
  subscribers: number;
  description: string;
  over18: boolean;
  score: number;
}

export async function GET(request: NextRequest) {
  const seeds = request.nextUrl.searchParams.get("seeds");
  const nsfw = request.nextUrl.searchParams.get("nsfw") === "1";

  if (!seeds) {
    return NextResponse.json({ results: [] });
  }

  const seedList = seeds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (seedList.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const seedSet = new Set(seedList.map((s) => s.toLowerCase()));
  const hitCount = new Map<string, number>();
  const subData = new Map<string, SubredditResult>();

  const fetches = seedList.map(async (seed) => {
    const params = new URLSearchParams({
      q: seed,
      limit: "10",
      raw_json: "1",
      ...(nsfw && { include_over_18: "on" }),
    });

    try {
      const res = await redditFetch(`/subreddits/search.json?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      const children = json?.data?.children ?? [];

      for (const child of children) {
        const name = child.data.display_name as string;
        const lower = name.toLowerCase();
        if (seedSet.has(lower)) continue;

        hitCount.set(lower, (hitCount.get(lower) ?? 0) + 1);

        if (!subData.has(lower)) {
          subData.set(lower, {
            name,
            subscribers: (child.data.subscribers as number) ?? 0,
            description: (
              (child.data.public_description as string) ||
              (child.data.title as string) ||
              ""
            ).slice(0, 120),
            over18: (child.data.over18 as boolean) ?? false,
            score: 0,
          });
        }
      }
    } catch {
      /* skip failed seed */
    }
  });

  await Promise.allSettled(fetches);

  const results = [...subData.values()]
    .map((sub) => {
      const hits = hitCount.get(sub.name.toLowerCase()) ?? 1;
      sub.score = hits * 1000 + Math.log10(sub.subscribers + 1);
      return sub;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ results });
}
