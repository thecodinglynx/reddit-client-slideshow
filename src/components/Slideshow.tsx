"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { MediaItem, SlideshowSettings, DEFAULT_SETTINGS, ContentProgress } from "@/lib/types";
import { fetchAllMedia, FetchResult } from "@/lib/reddit";
import * as storage from "@/lib/storage";
import MediaRenderer from "./MediaRenderer";
import SettingsPanel from "./SettingsPanel";
import AdSlide from "./AdSlide";

const AD_INTERVAL = 10; // show an ad every N slides
const AD_SLOT = "9234556481";

export default function Slideshow() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const isAuthRef = useRef(isAuthenticated);
  isAuthRef.current = isAuthenticated;

  const [settings, setSettings] = useState<SlideshowSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [likes, setLikes] = useState<Map<string, MediaItem>>(new Map());
  const [viewingLikes, setViewingLikes] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const slidesSinceAd = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoDurationRef = useRef<number | null>(null);
  const hideOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Pagination state
  const afterTokensRef = useRef<Record<string, string | null>>({});
  const seenIdsRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef<SlideshowSettings>(DEFAULT_SETTINGS);
  const savedProgressRef = useRef<ContentProgress | null>(null);

  const currentItem = items[currentIndex] ?? null;

  // Load settings and likes on mount (from DB if authenticated, localStorage otherwise)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [s, l, p] = await Promise.all([
        storage.loadSettings(isAuthenticated),
        storage.loadLikes(isAuthenticated),
        storage.loadProgress(isAuthenticated),
      ]);
      if (!cancelled) {
        setSettings(s);
        setLikes(l);
        savedProgressRef.current = p;
        setHydrated(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Check premium status
  useEffect(() => {
    if (!isAuthenticated) {
      setIsPremium(false);
      return;
    }
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data) => setIsPremium(data.subscription?.isPremium ?? false))
      .catch(() => setIsPremium(false));
  }, [isAuthenticated]);

  // Save settings whenever they change (use ref for auth to avoid saving stale settings on login)
  useEffect(() => {
    if (hydrated) storage.saveSettings(settings, isAuthRef.current);
    settingsRef.current = settings;
  }, [settings, hydrated]);

  const getDuration = useCallback(() => {
    if (!currentItem) return 5;
    switch (currentItem.type) {
      case "image":
        return settings.imageDuration;
      case "gif":
        return settings.gifDuration;
      case "video":
        if (settings.videoDuration > 0) return settings.videoDuration;
        return videoDurationRef.current ?? currentItem.duration ?? 15;
      default:
        return 5;
    }
  }, [currentItem, settings]);

  // Fetch more posts when nearing the end
  const fetchMore = useCallback(async () => {
    if (fetchingMore || viewingLikes) return;
    const s = settingsRef.current;
    // Check if all sources are exhausted
    const allExhausted = Object.values(afterTokensRef.current).every((v) => v === null);
    if (allExhausted && Object.keys(afterTokensRef.current).length > 0) return;

    setFetchingMore(true);
    try {
      const result: FetchResult = await fetchAllMedia(
        s.sourceMode,
        s.subreddits,
        s.users,
        s.sortOrder,
        s.topTimeframe,
        s.showNsfw,
        afterTokensRef.current,
        seenIdsRef.current
      );
      afterTokensRef.current = result.afterTokens;
      if (result.items.length > 0) {
        for (const item of result.items) {
          seenIdsRef.current.add(item.id);
        }
        setItems((prev) => [...prev, ...result.items]);
      }
      if (isAuthRef.current) {
        const hash = storage.computeSettingsHash(s);
        storage.saveProgress(hash, result.afterTokens, true);
      }
    } catch {
      // Silently fail — user can still view existing items
    } finally {
      setFetchingMore(false);
    }
  }, [fetchingMore, viewingLikes]);

  const goNext = useCallback(() => {
    if (items.length === 0) return;

    // Show interstitial ad every N slides (non-premium only)
    if (!isPremium && !showAd && AD_SLOT) {
      slidesSinceAd.current++;
      if (slidesSinceAd.current >= AD_INTERVAL) {
        slidesSinceAd.current = 0;
        setShowAd(true);
        return;
      }
    }

    setCurrentIndex((i) => {
      const next = (i + 1) % items.length;
      if (!viewingLikes && items.length - next <= 5) {
        fetchMore();
      }
      return next;
    });
    setProgress(0);
    setMediaLoaded(false);
    videoDurationRef.current = null;
  }, [items.length, viewingLikes, fetchMore, isPremium, showAd]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
    setProgress(0);
    setMediaLoaded(false);
    videoDurationRef.current = null;
  }, [items.length]);

  // Auto-advance timer — only starts after media has loaded
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (!isPlaying || items.length === 0 || !mediaLoaded) return;

    const duration = getDuration() * 1000;
    const progressInterval = 50;

    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / duration, 1));
    }, progressInterval);

    timerRef.current = setTimeout(() => {
      goNext();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, currentIndex, items.length, getDuration, goNext, mediaLoaded]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSettings) return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "p":
          setIsPlaying((p) => !p);
          break;
        case "l":
          if (currentItem) toggleLike(currentItem);
          break;
        case "Escape":
          setShowSettings((s) => !s);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, goPrev, showSettings, currentItem]);

  // Mouse/touch shows overlay
  useEffect(() => {
    const showHandler = () => {
      setShowOverlay(true);
      if (hideOverlayTimer.current) clearTimeout(hideOverlayTimer.current);
      hideOverlayTimer.current = setTimeout(() => {
        if (!showSettings) setShowOverlay(false);
      }, 3000);
    };
    window.addEventListener("mousemove", showHandler);
    window.addEventListener("touchstart", showHandler, { passive: true });
    return () => {
      window.removeEventListener("mousemove", showHandler);
      window.removeEventListener("touchstart", showHandler);
      if (hideOverlayTimer.current) clearTimeout(hideOverlayTimer.current);
    };
  }, [showSettings]);

  // Touch swipe navigation
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (showSettings) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > 50 && absDx > absDy * 1.5) {
        if (dx < 0) goNext();
        else goPrev();
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev, showSettings]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const addSubreddit = useCallback((name: string) => {
    if (settings.subreddits.includes(name)) {
      showToast(`r/${name} already in list`);
      return;
    }
    setSettings((s) => ({ ...s, subreddits: [...s.subreddits, name] }));
    showToast(`Added r/${name}`);
  }, [settings.subreddits, showToast]);

  const addUser = useCallback((name: string) => {
    if (settings.users.includes(name)) {
      showToast(`u/${name} already in list`);
      return;
    }
    setSettings((s) => ({ ...s, users: [...s.users, name] }));
    showToast(`Added u/${name}`);
  }, [settings.users, showToast]);

  const toggleLike = useCallback((item: MediaItem) => {
    setLikes((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        showToast("Removed from likes");
        storage.removeLike(item.id, isAuthenticated);
      } else {
        next.set(item.id, item);
        showToast("Added to likes");
        storage.addLike(item, isAuthenticated);
      }
      return next;
    });
  }, [showToast, isAuthenticated]);

  const loadMedia = async (newSettings: SlideshowSettings) => {
    setIsLoading(true);
    setError(null);
    setViewingLikes(false);
    try {
      if (newSettings.sourceMode === "liked") {
        const likedItems = [...likes.values()];
        if (likedItems.length === 0) {
          setError("No liked posts yet. Like some posts first!");
          return;
        }
        setViewingLikes(true);
        setItems(likedItems);
        setCurrentIndex(0);
        setProgress(0);
        setMediaLoaded(false);
        setSettings(newSettings);
        setShowSettings(false);
        setIsPlaying(true);
        return;
      }

      // Resume from saved progress if settings match, otherwise start fresh
      const hash = storage.computeSettingsHash(newSettings);
      const progress = savedProgressRef.current;
      const resumeTokens =
        progress && progress.settingsHash === hash ? progress.afterTokens : {};

      afterTokensRef.current = resumeTokens;
      seenIdsRef.current = new Set();

      const result = await fetchAllMedia(
        newSettings.sourceMode,
        newSettings.subreddits,
        newSettings.users,
        newSettings.sortOrder,
        newSettings.topTimeframe,
        newSettings.showNsfw,
        resumeTokens
      );
      if (result.items.length === 0) {
        setError("No media found. Try different sources.");
        return;
      }

      // Track pagination tokens and seen IDs
      afterTokensRef.current = result.afterTokens;
      for (const item of result.items) {
        seenIdsRef.current.add(item.id);
      }

      if (isAuthRef.current) {
        storage.saveProgress(hash, result.afterTokens, true);
      }

      setItems(result.items);
      setCurrentIndex(0);
      setProgress(0);
      setMediaLoaded(false);
      setSettings(newSettings);
      setShowSettings(false);
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoDuration = useCallback((duration: number) => {
    videoDurationRef.current = duration;
  }, []);

  const handleMediaLoaded = useCallback(() => {
    setMediaLoaded(true);
  }, []);

  const isLiked = currentItem ? likes.has(currentItem.id) : false;

  return (
    <div className="fixed inset-0 bg-black select-none pointer-events-none">
      {/* Interstitial ad */}
      {showAd && AD_SLOT && (
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          <AdSlide
            adSlot={AD_SLOT}
            onDone={() => {
              setShowAd(false);
              goNext();
            }}
          />
        </div>
      )}

      {/* Main media display */}
      {currentItem && !showAd && (
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <MediaRenderer
            key={currentItem.id}
            item={currentItem}
            isActive={isPlaying && !showSettings}
            onDurationKnown={handleVideoDuration}
            onLoaded={handleMediaLoaded}
          />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showSettings && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center text-zinc-400">
            <p className="text-2xl sm:text-3xl mb-4 font-light tracking-tight">Reddit Slideshow</p>
            <p className="text-sm sm:text-base">
              Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Esc</kbd> to open settings
            </p>
            <p className="text-xs text-zinc-600 mt-2 sm:hidden">or tap the screen</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-zinc-900/50" style={{ zIndex: 20 }}>
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Top overlay */}
      <div
        style={{ zIndex: 10 }}
        className={`absolute inset-x-0 top-0 transition-opacity duration-300 ${
          showOverlay ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {currentItem && (
          <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 sm:p-4 pb-10 sm:pb-12">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-sm sm:text-base line-clamp-2 sm:truncate leading-snug">
                  {currentItem.title}
                </p>
                <div className="text-zinc-400 text-xs sm:text-sm mt-1 flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => addSubreddit(currentItem.subreddit)}
                    className="hover:text-orange-400 active:text-orange-300 transition-colors cursor-pointer"
                    title={`Add r/${currentItem.subreddit} to subreddit list`}
                  >
                    r/{currentItem.subreddit}
                  </button>
                  <span className="text-zinc-600">&middot;</span>
                  <button
                    onClick={() => addUser(currentItem.author)}
                    className="hover:text-orange-400 active:text-orange-300 transition-colors cursor-pointer"
                    title={`Add u/${currentItem.author} to user list`}
                  >
                    u/{currentItem.author}
                  </button>
                  <span className="text-zinc-600">&middot;</span>
                  <span>{currentItem.score.toLocaleString()} pts</span>
                  <span className="text-zinc-600 hidden sm:inline">
                    [{currentItem.type}]
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleLike(currentItem)}
                  className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-90 ${
                    isLiked
                      ? "text-red-500 hover:text-red-400"
                      : "text-zinc-500 hover:text-red-400"
                  }`}
                  title="Like (L)"
                  aria-label={isLiked ? "Unlike this post" : "Like this post"}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <a
                  href={`https://reddit.com${currentItem.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:block text-zinc-500 hover:text-orange-400 text-xs transition-colors"
                >
                  Open on Reddit &rarr;
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom overlay controls */}
      <div
        style={{ zIndex: 10 }}
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showOverlay ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 pt-10 sm:pt-12">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={goPrev}
              className="p-2 sm:p-2.5 text-zinc-300 hover:text-white active:scale-95 transition-all rounded-full hover:bg-white/5"
              title="Previous (Left arrow)"
              aria-label="Previous slide"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 active:bg-white/25 active:scale-95 rounded-full text-white transition-all backdrop-blur-sm"
              title="Play/Pause (P)"
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={goNext}
              className="p-2 sm:p-2.5 text-zinc-300 hover:text-white active:scale-95 transition-all rounded-full hover:bg-white/5"
              title="Next (Right arrow)"
              aria-label="Next slide"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="text-zinc-500 text-xs sm:text-sm ml-2 sm:ml-4 tabular-nums">
              {currentIndex + 1} / {items.length}
              {fetchingMore && <span className="ml-1 text-orange-400">+</span>}
            </span>

            <button
              onClick={() => setShowSettings(true)}
              className="ml-1 sm:ml-2 p-2 sm:p-2.5 text-zinc-300 hover:text-white active:scale-95 transition-all rounded-full hover:bg-white/5"
              title="Settings (Esc)"
              aria-label="Open settings"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Sign-in / Account button */}
            {!isAuthenticated ? (
              <button
                onClick={() => signIn("google")}
                className="p-2 sm:p-2.5 text-zinc-400 hover:text-white active:scale-95 transition-all rounded-full hover:bg-white/5"
                title="Sign in"
                aria-label="Sign in with Google"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            ) : (
              <a
                href="/account"
                className="p-1 sm:p-1.5 rounded-full hover:ring-2 hover:ring-orange-500/50 transition-all"
                title="Account"
                aria-label="Account settings"
              >
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full" />
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={loadMedia}
          onClose={() => setShowSettings(false)}
          isLoading={isLoading}
          likedCount={likes.size}
        />
      )}

      {/* Error display */}
      {error && !showSettings && (
        <div
          style={{ zIndex: 30 }}
          className="absolute top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-950/90 border border-red-800/60 text-red-200 px-4 py-3 rounded-xl text-sm backdrop-blur-sm"
        >
          {error}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          style={{ zIndex: 30 }}
          className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 bg-zinc-800/95 border border-zinc-700/50 text-zinc-200 px-4 py-2 rounded-full text-xs sm:text-sm backdrop-blur-sm animate-toast-in whitespace-nowrap shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
