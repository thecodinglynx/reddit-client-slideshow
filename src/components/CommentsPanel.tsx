"use client";

import { useState, useEffect, useRef } from "react";

interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  depth: number;
  created_utc: number;
  replies: Comment[];
}

interface CommentsPanelProps {
  permalink: string;
  onClose: () => void;
}

function timeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function CommentNode({ comment }: { comment: Comment }) {
  const [collapsed, setCollapsed] = useState(false);
  const maxDepth = 4;
  const indent = Math.min(comment.depth, maxDepth);

  return (
    <div style={{ marginLeft: `${indent * 12}px` }}>
      <div className="py-2 group">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs mb-1 cursor-pointer w-full text-left"
        >
          <span className="text-orange-400 font-medium">{comment.author}</span>
          <span className="text-zinc-600">&middot;</span>
          <span className="text-zinc-500">{comment.score} pts</span>
          <span className="text-zinc-600">&middot;</span>
          <span className="text-zinc-600">{timeAgo(comment.created_utc)}</span>
          {collapsed && (
            <span className="text-zinc-600 ml-1">[+]</span>
          )}
        </button>
        {!collapsed && (
          <>
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {comment.body}
            </p>
            {comment.replies.length > 0 && (
              <div className="mt-1 border-l border-zinc-800">
                {comment.replies.map((reply) => (
                  <CommentNode key={reply.id} comment={reply} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommentsPanel({ permalink, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    fetch(`/api/reddit/comments?permalink=${encodeURIComponent(permalink)}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [permalink]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    panel.addEventListener("touchstart", stop, { passive: true });
    panel.addEventListener("touchend", stop, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", stop);
      panel.removeEventListener("touchend", stop);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className="absolute inset-x-0 bottom-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/60 rounded-t-2xl flex flex-col pointer-events-auto animate-slide-up"
      style={{ zIndex: 25, maxHeight: "60vh" }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-zinc-800/40">
        <span className="text-zinc-300 text-sm font-medium">
          Comments {!loading && `(${comments.length})`}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors p-1"
          aria-label="Close comments"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto flex-1 px-4 pb-4 overscroll-contain">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">No comments found</p>
        )}
        {!loading &&
          comments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} />
          ))}
      </div>
    </div>
  );
}
