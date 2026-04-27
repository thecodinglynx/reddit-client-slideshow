import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/reddit/discover/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/reddit/discover");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function mockRedditSearch(results: Array<{ display_name: string; subscribers: number; public_description?: string; over18?: boolean }>) {
  return {
    ok: true,
    json: async () => ({
      data: {
        children: results.map((r) => ({
          data: {
            display_name: r.display_name,
            subscribers: r.subscribers,
            public_description: r.public_description ?? "",
            over18: r.over18 ?? false,
          },
        })),
      },
    }),
  } as Response;
}

describe("GET /api/reddit/discover", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty results when no seeds provided", async () => {
    const res = await GET(makeRequest({}));
    const body = await res.json();
    expect(body.results).toEqual([]);
  });

  it("returns empty results for empty seeds string", async () => {
    const res = await GET(makeRequest({ seeds: "" }));
    const body = await res.json();
    expect(body.results).toEqual([]);
  });

  it("fetches related subreddits for each seed", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "NaturePics", subscribers: 50000 },
      { display_name: "SkyPorn", subscribers: 30000 },
    ]));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "Photography", subscribers: 100000 },
      { display_name: "NaturePics", subscribers: 50000 },
    ]));

    const res = await GET(makeRequest({ seeds: "earthporn,pics" }));
    const body = await res.json();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(body.results.length).toBeGreaterThan(0);
  });

  it("excludes seed subreddits from results", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mockRedditSearch([
      { display_name: "earthporn", subscribers: 1000000 },
      { display_name: "NaturePics", subscribers: 50000 },
    ]));

    const res = await GET(makeRequest({ seeds: "earthporn" }));
    const body = await res.json();

    const names = body.results.map((r: { name: string }) => r.name.toLowerCase());
    expect(names).not.toContain("earthporn");
    expect(names).toContain("naturepics");
  });

  it("ranks subreddits appearing in multiple searches higher", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "RareFind", subscribers: 1000 },
      { display_name: "CommonSub", subscribers: 5000 },
    ]));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "CommonSub", subscribers: 5000 },
      { display_name: "AnotherRare", subscribers: 2000 },
    ]));

    const res = await GET(makeRequest({ seeds: "seed1,seed2" }));
    const body = await res.json();

    expect(body.results[0].name).toBe("CommonSub");
  });

  it("deduplicates subreddits across searches", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "NaturePics", subscribers: 50000 },
    ]));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "NaturePics", subscribers: 50000 },
    ]));

    const res = await GET(makeRequest({ seeds: "earthporn,pics" }));
    const body = await res.json();

    const natureCount = body.results.filter(
      (r: { name: string }) => r.name.toLowerCase() === "naturepics"
    ).length;
    expect(natureCount).toBe(1);
  });

  it("limits results to 20", async () => {
    const bigList = Array.from({ length: 10 }, (_, i) => ({
      display_name: `Sub${i}`,
      subscribers: (10 - i) * 1000,
    }));

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce(mockRedditSearch(bigList));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch(
      Array.from({ length: 10 }, (_, i) => ({
        display_name: `Other${i}`,
        subscribers: (10 - i) * 500,
      }))
    ));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch(
      Array.from({ length: 10 }, (_, i) => ({
        display_name: `More${i}`,
        subscribers: (10 - i) * 200,
      }))
    ));

    const res = await GET(makeRequest({ seeds: "a,b,c" }));
    const body = await res.json();

    expect(body.results.length).toBeLessThanOrEqual(20);
  });

  it("includes description in results", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mockRedditSearch([
      { display_name: "TestSub", subscribers: 1000, public_description: "A test subreddit" },
    ]));

    const res = await GET(makeRequest({ seeds: "seed1" }));
    const body = await res.json();

    expect(body.results[0].description).toBe("A test subreddit");
  });

  it("handles fetch failures gracefully", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockRejectedValueOnce(new Error("Network error"));
    fetchSpy.mockResolvedValueOnce(mockRedditSearch([
      { display_name: "GoodSub", subscribers: 5000 },
    ]));

    const res = await GET(makeRequest({ seeds: "failing,working" }));
    const body = await res.json();

    expect(body.results.length).toBe(1);
    expect(body.results[0].name).toBe("GoodSub");
  });

  it("handles all fetches failing", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    const res = await GET(makeRequest({ seeds: "a,b,c" }));
    const body = await res.json();

    expect(body.results).toEqual([]);
  });

  it("is case-insensitive when excluding seeds", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(mockRedditSearch([
      { display_name: "EarthPorn", subscribers: 1000000 },
      { display_name: "NaturePics", subscribers: 50000 },
    ]));

    const res = await GET(makeRequest({ seeds: "earthporn" }));
    const body = await res.json();

    const names = body.results.map((r: { name: string }) => r.name.toLowerCase());
    expect(names).not.toContain("earthporn");
  });
});
