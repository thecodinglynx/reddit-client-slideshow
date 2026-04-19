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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
      <span className="text-zinc-600 text-xs uppercase tracking-wider mb-4">
        Advertisement
      </span>
      <div className="w-full max-w-2xl px-4">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
      <button
        onClick={onDone}
        className="mt-6 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
      >
        Skip ad
      </button>
    </div>
  );
}
