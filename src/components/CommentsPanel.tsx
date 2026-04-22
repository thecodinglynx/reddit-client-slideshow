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

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) tokens.push(text.slice(last, match.index));
    if (match[1] != null) tokens.push(<strong key={key++} className="font-semibold text-zinc-100">{match[1]}</strong>);
    else if (match[2] != null) tokens.push(<em key={key++} className="italic">{match[2]}</em>);
    else if (match[3] != null) tokens.push(<del key={key++} className="text-zinc-500">{match[3]}</del>);
    else if (match[4] != null) tokens.push(<code key={key++} className="bg-zinc-800 text-orange-300 px-1 rounded text-xs">{match[4]}</code>);
    else if (match[5] != null) tokens.push(<a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{match[5]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

function renderMarkdown(body: string): React.ReactNode[] {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    if (lines[i].startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-2 border-zinc-600 pl-3 my-1 text-zinc-400 italic">
          {quoteLines.map((l, j) => (
            <span key={j}>{renderInline(l)}{j < quoteLines.length - 1 && <br />}</span>
          ))}
        </blockquote>
      );
    } else if (lines[i].trim() === "") {
      elements.push(<br key={key++} />);
      i++;
    } else {
      elements.push(<span key={key++}>{renderInline(lines[i])}<br /></span>);
      i++;
    }
  }
  return elements;
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
            <div className="text-zinc-200 text-sm leading-relaxed break-words">
              {renderMarkdown(comment.body)}
            </div>
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
  const [height, setHeight] = useState(() => Math.round(window.innerHeight * 0.25));
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

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

  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    content.addEventListener("touchstart", stop, { passive: true });
    content.addEventListener("touchend", stop, { passive: true });
    return () => {
      content.removeEventListener("touchstart", stop);
      content.removeEventListener("touchend", stop);
    };
  }, []);

  useEffect(() => {
    const onMove = (clientY: number) => {
      if (!dragging.current) return;
      const delta = startY.current - clientY;
      const minH = 80;
      const maxH = window.innerHeight * 0.85;
      setHeight(Math.max(minH, Math.min(maxH, startH.current + delta)));
    };
    const onEnd = () => { dragging.current = false; };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
      onMove(e.touches[0].clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const startDrag = (clientY: number) => {
    dragging.current = true;
    startY.current = clientY;
    startH.current = height;
  };

  return (
    <div
      ref={panelRef}
      className="absolute inset-x-0 bottom-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/60 rounded-t-2xl flex flex-col pointer-events-auto animate-slide-up"
      style={{ zIndex: 25, height }}
    >
      {/* Draggable header */}
      <div
        className="shrink-0 cursor-row-resize touch-none border-b border-zinc-800/40 select-none"
        onMouseDown={(e) => startDrag(e.clientY)}
        onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientY); }}
        onTouchEnd={(e) => { e.stopPropagation(); dragging.current = false; }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-600" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-zinc-300 text-sm font-medium">
            Comments {!loading && `(${comments.length})`}
          </span>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Close comments"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={contentRef} className="overflow-y-auto flex-1 px-4 pb-4 overscroll-contain">
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
