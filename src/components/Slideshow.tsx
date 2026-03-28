"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MediaItem, SlideshowSettings, DEFAULT_SETTINGS } from "@/lib/types";
import { fetchAllMedia } from "@/lib/reddit";
import MediaRenderer from "./MediaRenderer";
import SettingsPanel from "./SettingsPanel";

export default function Slideshow() {
  const [settings, setSettings] = useState<SlideshowSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(true); // show on first load
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoDurationRef = useRef<number | null>(null);
  const hideOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentItem = items[currentIndex] ?? null;

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

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((i) => (i + 1) % items.length);
    setProgress(0);
    videoDurationRef.current = null;
  }, [items.length]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
    setProgress(0);
    videoDurationRef.current = null;
  }, [items.length]);

  // Auto-advance timer
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (!isPlaying || items.length === 0) return;

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
  }, [isPlaying, currentIndex, items.length, getDuration, goNext]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
        case "Escape":
          setShowSettings((s) => !s);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Mouse movement shows overlay
  useEffect(() => {
    const handler = () => {
      setShowOverlay(true);
      if (hideOverlayTimer.current) clearTimeout(hideOverlayTimer.current);
      hideOverlayTimer.current = setTimeout(() => {
        if (!showSettings) setShowOverlay(false);
      }, 3000);
    };
    window.addEventListener("mousemove", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      if (hideOverlayTimer.current) clearTimeout(hideOverlayTimer.current);
    };
  }, [showSettings]);

  const loadMedia = async (newSettings: SlideshowSettings) => {
    setIsLoading(true);
    setError(null);
    try {
      const mediaItems = await fetchAllMedia(
        newSettings.subreddits,
        newSettings.sortOrder,
        newSettings.topTimeframe,
        newSettings.showNsfw
      );
      if (mediaItems.length === 0) {
        setError("No media found in the selected subreddits. Try different ones.");
        return;
      }
      setItems(mediaItems);
      setCurrentIndex(0);
      setProgress(0);
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

  return (
    <div className="fixed inset-0 bg-black">
      {/* Main media display */}
      {currentItem && (
        <div className="absolute inset-0">
          <MediaRenderer
            key={currentItem.id}
            item={currentItem}
            isActive={isPlaying && !showSettings}
            onDurationKnown={handleVideoDuration}
          />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showSettings && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-zinc-400">
            <p className="text-2xl mb-4">Reddit Slideshow</p>
            <p>Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-sm">Esc</kbd> to open settings</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900/50">
          <div
            className="h-full bg-orange-500 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Overlay controls */}
      <div
        className={`absolute inset-x-0 top-0 transition-opacity duration-300 ${
          showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top bar with post info */}
        {currentItem && (
          <div className="bg-gradient-to-b from-black/80 to-transparent p-4 pb-12">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">
                  {currentItem.title}
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  r/{currentItem.subreddit} &middot; u/{currentItem.author} &middot;{" "}
                  {currentItem.score.toLocaleString()} pts
                  <span className="ml-2 text-zinc-500">
                    [{currentItem.type}]
                  </span>
                </p>
              </div>
              <a
                href={`https://reddit.com${currentItem.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-zinc-400 hover:text-orange-400 text-sm transition-colors"
              >
                Open on Reddit &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bottom overlay controls */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goPrev}
              className="p-2 text-zinc-300 hover:text-white transition-colors"
              title="Previous (Left arrow)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Play/Pause (P)"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={goNext}
              className="p-2 text-zinc-300 hover:text-white transition-colors"
              title="Next (Right arrow)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="text-zinc-400 text-sm ml-4">
              {currentIndex + 1} / {items.length}
            </span>

            <button
              onClick={() => setShowSettings(true)}
              className="ml-4 p-2 text-zinc-300 hover:text-white transition-colors"
              title="Settings (Esc)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
        />
      )}

      {/* Error display */}
      {error && !showSettings && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
