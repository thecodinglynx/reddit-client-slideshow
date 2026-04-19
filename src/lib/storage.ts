import { SlideshowSettings, DEFAULT_SETTINGS, MediaItem } from "./types";

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
    console.log("Loading settings from database (authenticated user)");
    try {
      const res = await fetch("/api/user/settings");
      console.log("Settings API response status:", res.status);

      const data = await res.json();
      console.log("Settings API response data:", data);

      if (data.settings) {
        const settings = { ...DEFAULT_SETTINGS, ...data.settings };
        writeLocalSettings(settings); // keep local cache in sync
        console.log("Loaded settings from DB:", settings);
        return settings;
      }
    } catch (error) {
      console.error("Failed to load settings from database:", error);
    }
  }
  console.log("Falling back to localStorage settings");
  return readLocalSettings();
}

export async function saveSettings(
  settings: SlideshowSettings,
  isAuthenticated: boolean
): Promise<void> {
  console.log("Saving settings, authenticated:", isAuthenticated);
  writeLocalSettings(settings); // always cache locally
  if (isAuthenticated) {
    console.log("Attempting to save settings to database");
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      console.log("Save settings API response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to save settings to database:", errorData);
      } else {
        console.log("Settings saved to database successfully");
      }
    } catch (error) {
      console.error("Error saving settings to database:", error);
    }
  } else {
    console.log("Not authenticated, settings saved to localStorage only");
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
        writeLocalLikes(map); // keep local cache in sync
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
  // Update localStorage immediately
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
  // Update localStorage immediately
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
