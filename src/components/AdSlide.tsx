"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlideProps {
  adSlot: string;
  onDone: () => void;
  duration?: number;
}

export default function AdSlide({ adSlot, onDone, duration = 8 }: AdSlideProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!pushed.current && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
      } catch { /* ad already pushed */ }
      pushed.current = true;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(onDone, duration * 1000);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  return (
    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center bg-zinc-950/90 backdrop-blur-sm py-3 px-4 rounded-t-xl">
      <div className="flex items-center justify-between w-full max-w-2xl mb-2">
        <span className="text-zinc-500 text-xs uppercase tracking-wider">
          Advertisement
        </span>
        <button
          onClick={onDone}
          className="text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
        >
          Skip ad &times;
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <ins
          className="adsbygoogle"
          style={{ display: "block", maxHeight: "250px" }}
          data-ad-client="ca-pub-3853368383549506"
          data-ad-slot={adSlot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
