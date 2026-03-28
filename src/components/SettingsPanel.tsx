"use client";

import { SlideshowSettings, SortOrder } from "@/lib/types";
import { useState } from "react";

interface SettingsPanelProps {
  settings: SlideshowSettings;
  onSave: (settings: SlideshowSettings) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function SettingsPanel({
  settings,
  onSave,
  onClose,
  isLoading,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<SlideshowSettings>({ ...settings });
  const [subredditInput, setSubredditInput] = useState("");

  const addSubreddit = () => {
    const name = subredditInput.trim().replace(/^\/?(r\/)?/, "");
    if (name && !draft.subreddits.includes(name)) {
      setDraft({ ...draft, subreddits: [...draft.subreddits, name] });
      setSubredditInput("");
    }
  };

  const removeSubreddit = (sub: string) => {
    setDraft({
      ...draft,
      subreddits: draft.subreddits.filter((s) => s !== sub),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Subreddits */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Subreddits
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={subredditInput}
                onChange={(e) => setSubredditInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
                placeholder="e.g. earthporn"
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={addSubreddit}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.subreddits.map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full text-sm"
                >
                  r/{sub}
                  <button
                    onClick={() => removeSubreddit(sub)}
                    className="text-zinc-500 hover:text-red-400 ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {draft.subreddits.length === 0 && (
                <p className="text-zinc-500 text-sm">
                  Add at least one subreddit
                </p>
              )}
            </div>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Sort Order
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["hot", "new", "top", "rising"] as SortOrder[]).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setDraft({ ...draft, sortOrder: sort })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    draft.sortOrder === sort
                      ? "bg-orange-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Time Period
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  ["hour", "day", "week", "month", "year", "all"] as const
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDraft({ ...draft, topTimeframe: t })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      draft.topTimeframe === t
                        ? "bg-orange-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration settings */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
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
                  className="w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right">
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
                  className="w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right">
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
                  className="w-32 accent-orange-500"
                />
                <span className="text-sm text-zinc-300 w-8 text-right">
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
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  draft.showNsfw ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={draft.subreddits.length === 0 || isLoading}
              className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? "Loading..." : "Apply & Start"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
