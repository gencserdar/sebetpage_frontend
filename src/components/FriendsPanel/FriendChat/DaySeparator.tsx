import { useEffect, useRef, useState } from "react";

interface DaySeparatorProps {
  label: string;
  listRef: React.RefObject<HTMLDivElement | null>;
}

export default function DaySeparator({ label, listRef }: DaySeparatorProps) {
  const [scrolling, setScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const separatorRef = useRef<HTMLDivElement | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      setScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setScrolling(false), 2000);
      if (separatorRef.current) {
        const rect = separatorRef.current.getBoundingClientRect();
        const parentRect = el.getBoundingClientRect();
        setFadeOut(el.scrollTop > 0 && rect.top - parentRect.top < 20);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [listRef]);

  return (
    <div
      ref={separatorRef}
      className={`w-full flex justify-center py-1 px-3 sticky top-0 z-20 transition-opacity duration-500 ${
        scrolling || !fadeOut ? "opacity-80" : "opacity-0"
      }`}
    >
      <span className="text-xs px-3 py-2 rounded-full bg-gray-800 text-gray-400 border border-gray-700/30">
        {label}
      </span>
    </div>
  );
}
