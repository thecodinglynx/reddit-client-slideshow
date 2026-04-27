"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlideProps {
  adSlot: string;
}

export default function AdSlide({ adSlot }: AdSlideProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* ad already pushed */ }
  }, []);

  return (
    <div className="flex flex-col items-center bg-zinc-950/90 backdrop-blur-sm py-2 px-4">
      <span className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
        Advertisement
      </span>
      <div className="w-full max-w-2xl">
        <ins
          className="adsbygoogle"
          style={{ display: "block", maxHeight: "100px" }}
          data-ad-client="ca-pub-3853368383549506"
          data-ad-slot={adSlot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
