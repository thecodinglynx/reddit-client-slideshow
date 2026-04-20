"use client";

import { MediaItem } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface MediaRendererProps {
  item: MediaItem;
  onDurationKnown?: (duration: number) => void;
  onLoaded?: () => void;
  isActive: boolean;
  muted: boolean;
}

function getHlsUrl(fallbackUrl: string): string | null {
  try {
    const url = new URL(fallbackUrl);
    if (!url.hostname.endsWith("redd.it")) return null;
    const parts = url.pathname.split("/");
    parts[parts.length - 1] = "HLSPlaylist.m3u8";
    return `${url.origin}${parts.join("/")}`;
  } catch {
    return null;
  }
}

export default function MediaRenderer({
  item,
  onDurationKnown,
  onLoaded,
  isActive,
  muted,
}: MediaRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [item.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (item.type !== "video" && item.type !== "gif") return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const hlsUrl = item.type === "video" ? (item.hlsUrl || getHlsUrl(item.url)) : null;

    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isActive) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          video.src = item.url;
          if (isActive) video.play().catch(() => {});
        }
      });
    } else if (hlsUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      if (isActive) video.play().catch(() => {});
    } else {
      video.src = item.url;
      if (isActive) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      if (!hlsRef.current) {
        videoRef.current.currentTime = 0;
      }
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, item.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = item.type === "gif" || muted;
  }, [muted, item.type]);

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
          className={`max-w-full max-h-full object-contain transition-opacity duration-500 pointer-events-auto ${loaded ? "opacity-100" : "opacity-0"}`}
          muted={item.type === "gif" || muted}
          loop={item.type === "gif"}
          playsInline
          controls={item.type === "video"}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setLoaded(true);
            onLoaded?.();
            if (onDurationKnown && el.duration && isFinite(el.duration)) {
              onDurationKnown(el.duration);
            }
          }}
          onError={() => {
            if (!hlsRef.current) setError(true);
          }}
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
        onLoad={() => { setLoaded(true); onLoaded?.(); }}
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
