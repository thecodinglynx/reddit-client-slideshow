"use client";

import { useEffect, useRef, useState } from "react";

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* ad already pushed */ }
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      const ins = el.querySelector("ins.adsbygoogle");
      if (ins && ins.childElementCount > 0) {
        setFilled(true);
        observer.disconnect();
      }
    });

    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={
        filled
          ? "flex flex-col items-center bg-zinc-950/90 backdrop-blur-sm py-1 px-4"
          : "h-0 overflow-hidden"
      }
    >
      <div className="w-full max-w-2xl">
        <ins
          className="adsbygoogle"
          style={{ display: "block", maxHeight: "90px" }}
          data-ad-client="ca-pub-3853368383549506"
          data-ad-slot={adSlot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
