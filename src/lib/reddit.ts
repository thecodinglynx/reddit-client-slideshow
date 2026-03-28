import { RedditPost, MediaItem, MediaType, SortOrder, SourceMode } from "./types";


function decodeHtmlEntities(str: string): string {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function extractMedia(post: RedditPost): MediaItem | MediaItem[] | null {
  // Skip self/text posts
  if (post.is_self) return null;

  // Gallery posts — return multiple items
  if (post.is_gallery && post.gallery_data && post.media_metadata) {
    const items: MediaItem[] = [];
    for (const item of post.gallery_data.items) {
      const meta = post.media_metadata[item.media_id];
      if (meta?.status === "valid" && meta.s?.u) {
        items.push({
          id: `${post.id}_${item.media_id}`,
          type: "image",
          url: decodeHtmlEntities(meta.s.u),
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          score: post.score,
          permalink: post.permalink,
          width: meta.s.x,
          height: meta.s.y,
        });
      }
    }
    return items.length > 0 ? items : null;
  }

  // Reddit-hosted video
  if (post.is_video) {
    const video =
      post.secure_media?.reddit_video ?? post.media?.reddit_video;
    if (video) {
      return {
        id: post.id,
        type: video.is_gif ? "gif" : "video",
        url: video.fallback_url,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        permalink: post.permalink,
        width: video.width,
        height: video.height,
        duration: video.duration,
      };
    }
  }

  // GIF with mp4 variant (much better for playback)
  if (post.preview?.images?.[0]?.variants?.mp4) {
    const mp4 = post.preview.images[0].variants.mp4.source;
    return {
      id: post.id,
      type: "gif",
      url: decodeHtmlEntities(mp4.url),
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      score: post.score,
      permalink: post.permalink,
      width: mp4.width,
      height: mp4.height,
    };
  }

  // Reddit video preview (for cross-posted videos etc.)
  if (post.preview?.reddit_video_preview) {
    const vid = post.preview.reddit_video_preview;
    return {
      id: post.id,
      type: "video",
      url: vid.fallback_url,
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      score: post.score,
      permalink: post.permalink,
      width: vid.width,
      height: vid.height,
      duration: vid.duration,
    };
  }

  // Direct image (i.redd.it, i.imgur.com, etc.)
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
  const gifExtensions = [".gif", ".gifv"];
  const url = post.url;

  if (url) {
    const urlLower = url.toLowerCase().split("?")[0];

    if (gifExtensions.some((ext) => urlLower.endsWith(ext))) {
      // .gifv (imgur) -> replace with .mp4
      const finalUrl = urlLower.endsWith(".gifv")
        ? url.replace(/\.gifv$/i, ".mp4")
        : url;
      return {
        id: post.id,
        type: "gif",
        url: finalUrl,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        permalink: post.permalink,
      };
    }

    if (
      imageExtensions.some((ext) => urlLower.endsWith(ext)) ||
      post.post_hint === "image"
    ) {
      return {
        id: post.id,
        type: "image",
        url: url,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        permalink: post.permalink,
        width: post.preview?.images?.[0]?.source?.width,
        height: post.preview?.images?.[0]?.source?.height,
      };
    }
  }

  return null;
}

export async function fetchSourceMedia(
  source: { type: "subreddit"; name: string } | { type: "user"; name: string },
  sort: SortOrder,
  topTimeframe: string = "day",
  after?: string,
  limit: number = 50
): Promise<{ items: MediaItem[]; after: string | null }> {
  const params = new URLSearchParams({
    sort,
    limit: String(limit),
  });
  if (source.type === "subreddit") {
    params.set("subreddit", source.name);
  } else {
    params.set("user", source.name);
  }
  if (sort === "top") {
    params.set("t", topTimeframe);
  }
  if (after) {
    params.set("after", after);
  }

  const url = `/api/reddit?${params}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items: MediaItem[] = [];

  for (const child of data.data.children) {
    const post: RedditPost = child.data;
    const media = extractMedia(post);
    if (media) {
      if (Array.isArray(media)) {
        items.push(...media);
      } else {
        items.push(media);
      }
    }
  }

  return {
    items,
    after: data.data.after,
  };
}

export interface FetchResult {
  items: MediaItem[];
  afterTokens: Record<string, string | null>;
}

export async function fetchAllMedia(
  sourceMode: SourceMode,
  subreddits: string[],
  users: string[],
  sort: SortOrder,
  topTimeframe: string = "day",
  showNsfw: boolean = false,
  afterTokens: Record<string, string | null> = {},
  seenIds: Set<string> = new Set()
): Promise<FetchResult> {
  const sources =
    sourceMode === "subreddits"
      ? subreddits.map((name) => ({ type: "subreddit" as const, name }))
      : users.map((name) => ({ type: "user" as const, name }));

  const newAfterTokens: Record<string, string | null> = { ...afterTokens };

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const key = `${source.type}:${source.name}`;
      // Skip sources that are exhausted (after explicitly set to null)
      if (key in afterTokens && afterTokens[key] === null) return { items: [], key, after: null };
      const after = afterTokens[key] ?? undefined;
      const result = await fetchSourceMedia(source, sort, topTimeframe, after);
      newAfterTokens[key] = result.after;
      return { items: result.items, key, after: result.after };
    })
  );

  let allItems: MediaItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
    }
  }

  // Filter out already-seen items
  if (seenIds.size > 0) {
    allItems = allItems.filter((item) => !seenIds.has(item.id));
  }

  if (!showNsfw) {
    allItems = allItems.filter((item) => {
      const url = item.url.toLowerCase();
      return !url.includes("nsfw") && !url.includes("nsfl");
    });
  }

  // Shuffle for variety when combining multiple sources
  if (sources.length > 1) {
    for (let i = allItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }
  }

  return { items: allItems, afterTokens: newAfterTokens };
}
