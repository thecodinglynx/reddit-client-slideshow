import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSourceMedia, fetchAllMedia } from "@/lib/reddit";

// Helper to make a minimal Reddit API response
function makeRedditResponse(posts: Array<Record<string, unknown>>, after: string | null = null) {
  return {
    data: {
      children: posts.map((data) => ({ data })),
      after,
    },
  };
}

function imagePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "abc123",
    name: "t3_abc123",
    title: "Test Image Post",
    author: "testuser",
    subreddit: "pics",
    score: 100,
    permalink: "/r/pics/comments/abc123/test/",
    url: "https://i.redd.it/test.jpg",
    domain: "i.redd.it",
    over_18: false,
    is_self: false,
    is_video: false,
    post_hint: "image",
    ...overrides,
  };
}

function videoPost(overrides: Record<string, unknown> = {}) {
  return {
    id: "vid456",
    name: "t3_vid456",
    title: "Test Video Post",
    author: "videouser",
    subreddit: "videos",
    score: 500,
    permalink: "/r/videos/comments/vid456/test/",
    url: "https://v.redd.it/testvideo",
    domain: "v.redd.it",
    over_18: false,
    is_self: false,
    is_video: true,
    secure_media: {
      reddit_video: {
        fallback_url: "https://v.redd.it/testvideo/DASH_720.mp4",
        hls_url: "https://v.redd.it/testvideo/HLSPlaylist.m3u8",
        width: 1280,
        height: 720,
        duration: 30,
        has_audio: true,
        is_gif: false,
      },
    },
    ...overrides,
  };
}

function galleryPost() {
  return {
    id: "gal789",
    name: "t3_gal789",
    title: "Gallery Post",
    author: "galleryuser",
    subreddit: "pics",
    score: 200,
    permalink: "/r/pics/comments/gal789/gallery/",
    url: "https://www.reddit.com/gallery/gal789",
    domain: "reddit.com",
    over_18: false,
    is_self: false,
    is_video: false,
    is_gallery: true,
    gallery_data: {
      items: [
        { media_id: "img1", id: 1 },
        { media_id: "img2", id: 2 },
      ],
    },
    media_metadata: {
      img1: {
        status: "valid",
        e: "Image",
        m: "image/jpg",
        s: { u: "https://preview.redd.it/img1.jpg", x: 1920, y: 1080 },
        p: [],
      },
      img2: {
        status: "valid",
        e: "Image",
        m: "image/jpg",
        s: { u: "https://preview.redd.it/img2.jpg", x: 800, y: 600 },
        p: [],
      },
    },
  };
}

function selfPost() {
  return {
    id: "self001",
    name: "t3_self001",
    title: "A text post",
    author: "writer",
    subreddit: "askreddit",
    score: 50,
    permalink: "/r/askreddit/comments/self001/a_text_post/",
    url: "https://www.reddit.com/r/askreddit/comments/self001/a_text_post/",
    domain: "self.askreddit",
    over_18: false,
    is_self: true,
    is_video: false,
  };
}

function gifPost() {
  return {
    id: "gif001",
    name: "t3_gif001",
    title: "Funny GIF",
    author: "gifmaker",
    subreddit: "gifs",
    score: 300,
    permalink: "/r/gifs/comments/gif001/funny/",
    url: "https://i.imgur.com/funny.gifv",
    domain: "i.imgur.com",
    over_18: false,
    is_self: false,
    is_video: false,
  };
}

describe("fetchSourceMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches subreddit media and extracts image posts", async () => {
    const mockResponse = makeRedditResponse([imagePost()], "next_page_token");
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "pics" },
      "hot"
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("image");
    expect(result.items[0].url).toBe("https://i.redd.it/test.jpg");
    expect(result.items[0].title).toBe("Test Image Post");
    expect(result.items[0].author).toBe("testuser");
    expect(result.items[0].subreddit).toBe("pics");
    expect(result.after).toBe("next_page_token");
  });

  it("builds correct URL for subreddit", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([]),
    } as Response);

    await fetchSourceMedia({ type: "subreddit", name: "pics" }, "hot");

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain("subreddit=pics");
    expect(calledUrl).toContain("sort=hot");
  });

  it("builds correct URL for user", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([]),
    } as Response);

    await fetchSourceMedia({ type: "user", name: "testuser" }, "new");

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain("user=testuser");
    expect(calledUrl).toContain("sort=new");
  });

  it("includes top timeframe param when sort is top", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([]),
    } as Response);

    await fetchSourceMedia({ type: "subreddit", name: "pics" }, "top", "week");

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain("t=week");
  });

  it("extracts video posts", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([videoPost()]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "videos" },
      "hot"
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("video");
    expect(result.items[0].url).toContain("DASH_720.mp4");
    expect(result.items[0].duration).toBe(30);
  });

  it("extracts gallery posts as multiple items", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([galleryPost()]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "pics" },
      "hot"
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe("gal789_img1");
    expect(result.items[1].id).toBe("gal789_img2");
  });

  it("skips self/text posts", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([selfPost()]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "askreddit" },
      "hot"
    );

    expect(result.items).toHaveLength(0);
  });

  it("converts .gifv URLs to .mp4", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([gifPost()]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "gifs" },
      "hot"
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("gif");
    expect(result.items[0].url).toBe("https://i.imgur.com/funny.mp4");
  });

  it("extracts gif-as-video posts (is_gif flag)", async () => {
    const gifVideoPost = videoPost({
      id: "gifvid",
      secure_media: {
        reddit_video: {
          fallback_url: "https://v.redd.it/gifvid/DASH_240.mp4",
          hls_url: "",
          width: 480,
          height: 270,
          duration: 5,
          has_audio: false,
          is_gif: true,
        },
      },
    });

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([gifVideoPost]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "gifs" },
      "hot"
    );

    expect(result.items[0].type).toBe("gif");
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    await expect(
      fetchSourceMedia({ type: "subreddit", name: "nonexistent" }, "hot")
    ).rejects.toThrow("Reddit API error: 404");
  });

  it("handles mixed post types in a single response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeRedditResponse([imagePost(), videoPost(), selfPost(), galleryPost()]),
    } as Response);

    const result = await fetchSourceMedia(
      { type: "subreddit", name: "all" },
      "hot"
    );

    // image + video + 2 gallery items = 4 (self post skipped)
    expect(result.items).toHaveLength(4);
  });
});

describe("fetchAllMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches from multiple subreddits", async () => {
    const fetch = vi.spyOn(global, "fetch");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost({ id: "a" })]),
    } as Response);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost({ id: "b" })]),
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics", "earthporn"],
      [],
      "hot"
    );

    expect(result.items.length).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fetches from users when sourceMode is users", async () => {
    const fetch = vi.spyOn(global, "fetch");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost({ id: "u1" })]),
    } as Response);

    const result = await fetchAllMedia(
      "users",
      [],
      ["testuser"],
      "hot"
    );

    expect(result.items.length).toBe(1);
    const calledUrl = fetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("user=testuser");
  });

  it("handles partial failures gracefully", async () => {
    const fetch = vi.spyOn(global, "fetch");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost({ id: "good" })]),
    } as Response);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics", "private_sub"],
      [],
      "hot"
    );

    // Should still return items from the successful request
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe("good");
  });

  it("shuffles items when multiple sources", async () => {
    const fetch = vi.spyOn(global, "fetch");
    const postsA = Array.from({ length: 10 }, (_, i) =>
      imagePost({ id: `a${i}`, subreddit: "pics" })
    );
    const postsB = Array.from({ length: 10 }, (_, i) =>
      imagePost({ id: `b${i}`, subreddit: "earthporn" })
    );
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse(postsA),
    } as Response);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse(postsB),
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics", "earthporn"],
      [],
      "hot"
    );

    expect(result.items).toHaveLength(20);
    const firstTenSubreddits = result.items.slice(0, 10).map((i) => i.subreddit);
    const allSame = firstTenSubreddits.every((s) => s === firstTenSubreddits[0]);
    expect(allSame).toBe(false);
  });

  it("does not shuffle for single source", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeRedditResponse([
          imagePost({ id: "1", score: 100 }),
          imagePost({ id: "2", score: 200 }),
          imagePost({ id: "3", score: 300 }),
        ]),
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics"],
      [],
      "hot"
    );

    expect(result.items.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("returns afterTokens for pagination", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost()], "next_page"),
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics"],
      [],
      "hot"
    );

    expect(result.afterTokens["subreddit:pics"]).toBe("next_page");
  });

  it("filters out seen IDs", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeRedditResponse([
          imagePost({ id: "seen1" }),
          imagePost({ id: "new1" }),
        ]),
    } as Response);

    const seenIds = new Set(["seen1"]);
    const result = await fetchAllMedia(
      "subreddits",
      ["pics"],
      [],
      "hot",
      "day",
      false,
      {},
      seenIds
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("new1");
  });

  it("skips exhausted sources (after=null)", async () => {
    const fetch = vi.spyOn(global, "fetch");
    // Only one source should be fetched since pics is exhausted
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRedditResponse([imagePost({ id: "new" })]),
    } as Response);

    const result = await fetchAllMedia(
      "subreddits",
      ["pics", "earthporn"],
      [],
      "hot",
      "day",
      false,
      { "subreddit:pics": null }
    );

    // Only earthporn should have been fetched
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
  });
});
