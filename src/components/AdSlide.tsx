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
  const insRef = useRef<HTMLModElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* ad already pushed */ }
  }, []);

  // Watch for AdSense injecting content into the <ins> element
  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    const check = () => {
      if (ins.dataset.adStatus === "filled") {
        setVisible(true);
        observer.disconnect();
      } else if (ins.dataset.adStatus === "unfilled") {
        observer.disconnect();
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(ins, { attributes: true, childList: true, subtree: true });
    check();

    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ height: visible ? "auto" : 0, overflow: "hidden" }}
    >
      <div className="flex flex-col items-center bg-zinc-950/90 backdrop-blur-sm py-1 px-4">
        <div className="w-full max-w-2xl">
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "inline-block", width: "100%", height: "50px" }}
            data-ad-client="ca-pub-3853368383549506"
            data-ad-slot={adSlot}
          />
        </div>
      </div>
    </div>
  );
}
