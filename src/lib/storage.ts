import { SlideshowSettings, DEFAULT_SETTINGS, MediaItem, ContentProgress } from "./types";

const SETTINGS_KEY = "reddit-slideshow-settings";
const LIKES_KEY = "reddit-slideshow-likes";

// ── localStorage helpers (always used as local cache) ────────

function readLocalSettings(): SlideshowSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLocalSettings(settings: SlideshowSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* quota exceeded, ignore */ }
}

function readLocalLikes(): Map<string, MediaItem> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    if (!raw) return new Map();
    const arr: MediaItem[] = JSON.parse(raw);
    return new Map(arr.map((item) => [item.id, item]));
  } catch {
    return new Map();
  }
}

function writeLocalLikes(likes: Map<string, MediaItem>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify([...likes.values()]));
  } catch { /* quota exceeded, ignore */ }
}

// ── Public API ───────────────────────────────────────────────

export async function loadSettings(
  isAuthenticated: boolean
): Promise<SlideshowSettings> {
  if (isAuthenticated) {
    try {
      const res = await fetch("/api/user/settings");
      const data = await res.json();
      if (data.settings) {
        const settings = { ...DEFAULT_SETTINGS, ...data.settings };
        writeLocalSettings(settings);
        return settings;
      }
    } catch { /* fall through to localStorage */ }
  }
  return readLocalSettings();
}

export async function saveSettings(
  settings: SlideshowSettings,
  isAuthenticated: boolean
): Promise<void> {
  writeLocalSettings(settings);
  if (isAuthenticated) {
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        console.error("Failed to save settings to database:", res.status);
      }
    } catch (error) {
      console.error("Error saving settings to database:", error);
    }
  }
}

export async function loadLikes(
  isAuthenticated: boolean
): Promise<Map<string, MediaItem>> {
  if (isAuthenticated) {
    try {
      const res = await fetch("/api/user/likes");
      const data = await res.json();
      if (data.likes) {
        const map = new Map<string, MediaItem>(
          data.likes.map((item: MediaItem) => [item.id, item])
        );
        writeLocalLikes(map);
        return map;
      }
    } catch { /* fall through to localStorage */ }
  }
  return readLocalLikes();
}

export async function addLike(
  item: MediaItem,
  isAuthenticated: boolean
): Promise<void> {
  const local = readLocalLikes();
  local.set(item.id, item);
  writeLocalLikes(local);

  if (isAuthenticated) {
    try {
      await fetch("/api/user/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: item.id, postData: item }),
      });
    } catch { /* silent fail */ }
  }
}

export async function removeLike(
  postId: string,
  isAuthenticated: boolean
): Promise<void> {
  const local = readLocalLikes();
  local.delete(postId);
  writeLocalLikes(local);

  if (isAuthenticated) {
    try {
      await fetch("/api/user/likes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    } catch { /* silent fail */ }
  }
}

export function computeSettingsHash(s: SlideshowSettings): string {
  const key = JSON.stringify({
    m: s.sourceMode,
    r: [...s.subreddits].sort(),
    u: [...s.users].sort(),
    s: s.sortOrder,
    t: s.topTimeframe,
    n: s.showNsfw,
  });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export async function loadProgress(
  isAuthenticated: boolean
): Promise<ContentProgress | null> {
  if (!isAuthenticated) return null;
  try {
    const res = await fetch("/api/user/progress");
    const data = await res.json();
    return data.progress ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(
  settingsHash: string,
  afterTokens: Record<string, string | null>,
  isAuthenticated: boolean
): Promise<void> {
  if (!isAuthenticated) return;
  try {
    await fetch("/api/user/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settingsHash, afterTokens }),
    });
  } catch { /* silent fail */ }
}
