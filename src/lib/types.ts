export interface RedditPost {
  id: string;
  name: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  permalink: string;
  url: string;
  domain: string;
  over_18: boolean;
  is_self: boolean;
  is_video: boolean;
  is_gallery?: boolean;
  post_hint?: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
      variants: {
        gif?: { source: { url: string; width: number; height: number } };
        mp4?: { source: { url: string; width: number; height: number } };
      };
    }>;
    reddit_video_preview?: {
      fallback_url: string;
      width: number;
      height: number;
      duration: number;
    };
  };
  media?: {
    reddit_video?: {
      fallback_url: string;
      hls_url: string;
      width: number;
      height: number;
      duration: number;
      has_audio: boolean;
      is_gif: boolean;
    };
  };
  secure_media?: {
    reddit_video?: {
      fallback_url: string;
      hls_url: string;
      width: number;
      height: number;
      duration: number;
      has_audio: boolean;
      is_gif: boolean;
    };
  };
  gallery_data?: {
    items: Array<{ media_id: string; id: number }>;
  };
  media_metadata?: Record<
    string,
    {
      status: string;
      e: string;
      m: string;
      s: { u: string; x: number; y: number };
      p: Array<{ u: string; x: number; y: number }>;
    }
  >;
}

export type MediaType = "image" | "gif" | "video";

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  permalink: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type SortOrder = "hot" | "new" | "top" | "rising";

export type SourceMode = "subreddits" | "users" | "liked";

export interface SlideshowSettings {
  sourceMode: SourceMode;
  subreddits: string[];
  users: string[];
  sortOrder: SortOrder;
  topTimeframe: "hour" | "day" | "week" | "month" | "year" | "all";
  imageDuration: number; // seconds
  gifDuration: number; // seconds
  videoDuration: number; // seconds, 0 = full video length
  showNsfw: boolean;
  autoPlay: boolean;
}

export const DEFAULT_SETTINGS: SlideshowSettings = {
  sourceMode: "subreddits",
  subreddits: ["earthporn", "pics", "itookapicture"],
  users: [],
  sortOrder: "hot",
  topTimeframe: "day",
  imageDuration: 5,
  gifDuration: 8,
  videoDuration: 0,
  showNsfw: false,
  autoPlay: true,
};

export interface ContentProgress {
  settingsHash: string;
  afterTokens: Record<string, string | null>;
}
