import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/reddit/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/reddit");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/reddit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when neither subreddit nor user provided", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Must provide");
  });

  it("returns 400 for invalid subreddit name", async () => {
    const res = await GET(makeRequest({ subreddit: "bad name!!!" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid subreddit");
  });

  it("returns 400 for invalid username", async () => {
    const res = await GET(makeRequest({ user: "bad user!!!" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid username");
  });

  it("fetches subreddit data and returns JSON", async () => {
    const mockData = { data: { children: [], after: null } };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await GET(makeRequest({ subreddit: "pics", sort: "hot" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockData);

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/r/pics/hot.json");
    expect(calledUrl).toContain("limit=50");
    expect(calledUrl).toContain("raw_json=1");
  });

  it("fetches user data and returns JSON", async () => {
    const mockData = { data: { children: [], after: null } };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const res = await GET(makeRequest({ user: "testuser", sort: "new" }));
    expect(res.status).toBe(200);

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/user/testuser/submitted/new.json");
  });

  it("includes t param only for top sort", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics", sort: "top", t: "week" }));

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("t=week");
  });

  it("does not include t param for non-top sort", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics", sort: "hot" }));

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toMatch(/[?&]t=/);
  });

  it("includes after param for pagination", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics", after: "t3_abc123" }));

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("after=t3_abc123");
  });

  it("proxies Reddit API error status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const res = await GET(makeRequest({ subreddit: "nonexistent" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Reddit API error: 404");
  });

  it("returns 502 on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const res = await GET(makeRequest({ subreddit: "pics" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Network timeout");
  });

  it("defaults sort to hot when not specified", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics" }));

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/r/pics/hot.json");
  });

  it("accepts valid names with underscores and hyphens", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    const res = await GET(makeRequest({ subreddit: "earth_porn-2" }));
    expect(res.status).toBe(200);
  });

  it("encodes subreddit name in URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics" }));

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/reddit\.com\/r\/pics\//);
  });

  it("sends proper User-Agent header", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { children: [] } }),
    } as Response);

    await GET(makeRequest({ subreddit: "pics" }));

    const fetchOptions = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const headers = fetchOptions.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("reddit-slideshow");
  });
});
