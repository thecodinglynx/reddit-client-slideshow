"use client";

import { MediaItem } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface MediaRendererProps {
  item: MediaItem;
  onDurationKnown?: (duration: number) => void;
  isActive: boolean;
}

export default function MediaRenderer({
  item,
  onDurationKnown,
  isActive,
}: MediaRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [item.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, item.id]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-zinc-500 text-center p-8">
          <p className="text-lg">Failed to load media</p>
          <p className="text-sm mt-2 text-zinc-600">{item.url}</p>
        </div>
      </div>
    );
  }

  if (item.type === "video" || item.type === "gif") {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={item.url}
          className={`max-w-full max-h-full object-contain transition-opacity duration-500 pointer-events-auto ${loaded ? "opacity-100" : "opacity-0"}`}
          autoPlay={isActive}
          muted={item.type === "gif"}
          loop={item.type === "gif"}
          playsInline
          controls={item.type === "video"}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setLoaded(true);
            if (onDurationKnown && el.duration && isFinite(el.duration)) {
              onDurationKnown(el.duration);
            }
          }}
          onError={() => setError(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Image
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.title}
        className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
