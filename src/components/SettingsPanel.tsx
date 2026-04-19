"use client";

import { SlideshowSettings, SortOrder, SourceMode } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface SubredditSuggestion {
  name: string;
  subscribers: number;
  description: string;
  over18: boolean;
}

interface SettingsPanelProps {
  settings: SlideshowSettings;
  onSave: (settings: SlideshowSettings) => void;
  onClose: () => void;
  isLoading: boolean;
  likedCount: number;
}

function AccountSection() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="w-full flex items-center justify-center gap-2.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-600 text-zinc-300 hover:text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign in with Google to sync across devices
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex items-center gap-2 min-w-0">
        {session.user?.image && (
          <img
            src={session.user.image}
            alt=""
            className="w-6 h-6 rounded-full shrink-0"
          />
        )}
        <span className="text-sm text-zinc-300 truncate">
          {session.user?.name || session.user?.email}
        </span>
      </div>
      <button
        onClick={() => signOut()}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 ml-2"
      >
        Sign out
      </button>
    </div>
  );
}

export default function SettingsPanel({
  settings,
  onSave,
  onClose,
  isLoading,
  likedCount,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<SlideshowSettings>({ ...settings });
  const [subredditInput, setSubredditInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionSeedIndex = useRef(0);

  const fetchSuggestions = useCallback(async (query: string, append = false) => {
    if (query.length < 2) {
      if (!append) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/reddit/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      const results = data.results as SubredditSuggestion[];

      if (append) {
        setSuggestions((prev) => {
          const existingNames = new Set(prev.map((s) => s.name.toLowerCase()));
          const newItems = results.filter(
            (s) => !existingNames.has(s.name.toLowerCase()) &&
                   !draft.subreddits.includes(s.name.toLowerCase())
          );
          const combined = [...prev, ...newItems];
          setShowSuggestions(combined.length > 0);
          return combined;
        });
      } else {
        const filtered = results.filter(
          (s) => !draft.subreddits.includes(s.name.toLowerCase()) &&
                 s.name.toLowerCase() !== query.toLowerCase()
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } catch {
      if (!append) setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [draft.subreddits]);

  const loadMoreSuggestions = useCallback(() => {
    if (draft.subreddits.length === 0) return;
    suggestionSeedIndex.current = (suggestionSeedIndex.current + 1) % draft.subreddits.length;
    const seed = draft.subreddits[suggestionSeedIndex.current];
    fetchSuggestions(seed, true);
  }, [draft.subreddits, fetchSuggestions]);

  // Debounced search as user types
  useEffect(() => {
    setValidationError(null);
    if (suggestionsTimer.current) clearTimeout(suggestionsTimer.current);

    const cleaned = subredditInput.trim().replace(/^\/?(r\/)?/, "");
    if (cleaned.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionsTimer.current = setTimeout(() => {
      fetchSuggestions(cleaned);
    }, 400);

    return () => {
      if (suggestionsTimer.current) clearTimeout(suggestionsTimer.current);
    };
  }, [subredditInput, fetchSuggestions]);

  const validateAndAddSubreddit = async (name: string) => {
    const cleaned = name.trim().replace(/^\/?(r\/)?/, "");
    if (!cleaned) return;

    if (draft.subreddits.includes(cleaned.toLowerCase())) {
      setValidationError(`r/${cleaned} is already in your list`);
      return;
    }

    setValidating(true);
    setValidationError(null);

    try {
      const res = await fetch(`/api/reddit/about?subreddit=${encodeURIComponent(cleaned)}`);
      const data = await res.json();

      if (!data.exists) {
        setValidationError(`r/${cleaned} doesn't exist or is private`);
        setValidating(false);
        return;
      }

      // Use the canonical name from Reddit
      const canonicalName = data.name || cleaned;
      if (draft.subreddits.includes(canonicalName.toLowerCase())) {
        setValidationError(`r/${canonicalName} is already in your list`);
        setValidating(false);
        return;
      }

      setDraft((d) => ({ ...d, subreddits: [...d.subreddits, canonicalName.toLowerCase()] }));
      setSubredditInput("");
      setSuggestions([]);
      setShowSuggestions(false);

      // Fetch suggestions based on the added subreddit
      fetchSuggestions(canonicalName);
    } catch {
      setValidationError("Failed to verify subreddit. Try again.");
    } finally {
      setValidating(false);
    }
  };

  const addSuggestion = (name: string) => {
    const lower = name.toLowerCase();
    if (!draft.subreddits.includes(lower)) {
      setDraft((d) => ({ ...d, subreddits: [...d.subreddits, lower] }));
      setSuggestions((prev) => prev.filter((s) => s.name.toLowerCase() !== lower));
    }
  };

  const removeSubreddit = (sub: string) => {
    setDraft({
      ...draft,
      subreddits: draft.subreddits.filter((s) => s !== sub),
    });
  };

  const addUser = () => {
    const name = userInput.trim().replace(/^\/?(u\/)?/, "");
    if (name && !draft.users.includes(name)) {
      setDraft({ ...draft, users: [...draft.users, name] });
      setUserInput("");
    }
  };

  const removeUser = (user: string) => {
    setDraft({
      ...draft,
      users: draft.users.filter((u) => u !== user),
    });
  };

  // Load suggestions based on existing subreddits when panel opens
  useEffect(() => {
    if (draft.sourceMode === "subreddits" && draft.subreddits.length > 0 && suggestions.length === 0) {
      // Pick a random existing subreddit to seed suggestions
      const seed = draft.subreddits[Math.floor(Math.random() * draft.subreddits.length)];
      fetchSuggestions(seed);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatSubscribers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return String(count);
  };

  const hasValidSource =
    draft.sourceMode === "liked"
      ? likedCount > 0
      : draft.sourceMode === "subreddits"
        ? draft.subreddits.length > 0
        : draft.users.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-zinc-900 border border-zinc-800 sm:border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all rounded-full text-xl leading-none"
              aria-label="Close settings"
            >
              &times;
            </button>
          </div>

          {/* Account */}
          <AccountSection />

          {/* Source mode toggle */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
              Show posts from
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["subreddits", "users", "liked"] as SourceMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDraft({ ...draft, sourceMode: mode })}
                  disabled={mode === "liked" && likedCount === 0}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                    draft.sourceMode === mode
                      ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                      : mode === "liked" && likedCount === 0
                        ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed"
                        : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600"
                  }`}
                >
                  {mode === "liked" ? `liked (${likedCount})` : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Subreddits */}
          {draft.sourceMode === "subreddits" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Subreddits
              </label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={subredditInput}
                    onChange={(e) => setSubredditInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        validateAndAddSubreddit(subredditInput);
                      }
                    }}
                    placeholder="e.g. earthporn"
                    disabled={validating}
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => validateAndAddSubreddit(subredditInput)}
                  disabled={validating || !subredditInput.trim()}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl text-sm font-medium transition-all"
                >
                  {validating ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : (
                    "Add"
                  )}
                </button>
              </div>

              {/* Validation error */}
              {validationError && (
                <p className="text-red-400 text-xs mb-2" role="alert">{validationError}</p>
              )}

              {/* Current subreddits */}
              <div className="flex flex-wrap gap-2 mb-3">
                {draft.subreddits.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1.5 bg-zinc-800/80 text-zinc-200 px-3 py-1.5 rounded-full text-xs sm:text-sm border border-zinc-700/50"
                  >
                    r/{sub}
                    <button
                      onClick={() => removeSubreddit(sub)}
                      className="text-zinc-500 hover:text-red-400 active:text-red-300 ml-0.5 transition-colors"
                      aria-label={`Remove r/${sub}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {draft.subreddits.length === 0 && (
                  <p className="text-zinc-600 text-sm">
                    Add at least one subreddit
                  </p>
                )}
              </div>

              {/* Suggestions */}
              {(showSuggestions || suggestionsLoading) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Suggestions</span>
                    {suggestionsLoading && (
                      <span className="w-3 h-3 border border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => addSuggestion(s.name)}
                        className="group inline-flex items-center gap-1.5 bg-zinc-800/50 hover:bg-zinc-700/80 active:bg-zinc-600 border border-zinc-700/30 hover:border-orange-500/30 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-full text-xs transition-all"
                        title={s.description || `r/${s.name}`}
                      >
                        <span className="text-orange-400/70 group-hover:text-orange-400">+</span>
                        r/{s.name}
                        <span className="text-zinc-600 text-[10px]">
                          {formatSubscribers(s.subscribers)}
                        </span>
                      </button>
                    ))}
                    {draft.subreddits.length > 0 && !suggestionsLoading && (
                      <button
                        onClick={loadMoreSuggestions}
                        className="inline-flex items-center gap-1 bg-zinc-800/30 hover:bg-zinc-700/60 active:bg-zinc-600 border border-dashed border-zinc-700/40 hover:border-orange-500/30 text-zinc-500 hover:text-zinc-300 px-2.5 py-1.5 rounded-full text-xs transition-all"
                      >
                        More...
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {draft.sourceMode === "users" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Users
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUser()}
                  placeholder="e.g. shittymorph"
                  className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
                <button
                  onClick={addUser}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-400 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.users.map((user) => (
                  <span
                    key={user}
                    className="inline-flex items-center gap-1.5 bg-zinc-800/80 text-zinc-200 px-3 py-1.5 rounded-full text-xs sm:text-sm border border-zinc-700/50"
                  >
                    u/{user}
                    <button
                      onClick={() => removeUser(user)}
                      className="text-zinc-500 hover:text-red-400 active:text-red-300 ml-0.5 transition-colors"
                      aria-label={`Remove u/${user}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {draft.users.length === 0 && (
                  <p className="text-zinc-600 text-sm">
                    Add at least one user
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sort order */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
              Sort Order
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {(["hot", "new", "top", "rising"] as SortOrder[]).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setDraft({ ...draft, sortOrder: sort })}
                  className={`px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-medium capitalize transition-all ${
                    draft.sortOrder === sort
                      ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                      : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600"
                  }`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          {/* Top timeframe */}
          {draft.sortOrder === "top" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Time Period
              </label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {(
                  ["hour", "day", "week", "month", "year", "all"] as const
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraft({ ...draft, topTimeframe: t })}
                    className={`px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-medium capitalize transition-all ${
                      draft.topTimeframe === t
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                        : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration settings */}
          <div className="space-y-3 sm:space-y-4">
            <label className="block text-xs sm:text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Display Duration (seconds)
            </label>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Images</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={draft.imageDuration}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      imageDuration: Number(e.target.value),
                    })
                  }
                  className="w-24 sm:w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right tabular-nums">
                  {draft.imageDuration}s
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">GIFs</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={draft.gifDuration}
                  onChange={(e) =>
                    setDraft({ ...draft, gifDuration: Number(e.target.value) })
                  }
                  className="w-24 sm:w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right tabular-nums">
                  {draft.gifDuration}s
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Videos</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={draft.videoDuration}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      videoDuration: Number(e.target.value),
                    })
                  }
                  className="w-24 sm:w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right tabular-nums">
                  {draft.videoDuration === 0 ? "Full" : `${draft.videoDuration}s`}
                </span>
              </div>
            </div>
          </div>

          {/* NSFW toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Show NSFW content</span>
            <button
              onClick={() => setDraft({ ...draft, showNsfw: !draft.showNsfw })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                draft.showNsfw ? "bg-orange-600" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={draft.showNsfw}
              aria-label="Toggle NSFW content"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                  draft.showNsfw ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 rounded-xl text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={!hasValidSource || isLoading}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-600/20 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                "Apply & Start"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
