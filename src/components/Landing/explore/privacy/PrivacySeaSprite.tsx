import type { CSSProperties } from "react";

interface PrivacySeaSpriteProps {
  slotIndex: number;
  fleeing: boolean;
  fleeExit: boolean;
  settling: boolean;
  hidden: boolean;
}

export default function PrivacySeaSprite({
  slotIndex,
  fleeing,
  fleeExit,
  settling,
  hidden,
}: PrivacySeaSpriteProps) {
  if (hidden) return null;

  return (
    <div
      className={`landing-privacy__sea-sprite${
        fleeing ? " landing-privacy__sea-sprite--fleeing" : ""
      }${fleeExit ? " landing-privacy__sea-sprite--flee-exit" : ""}${
        settling ? " landing-privacy__sea-sprite--settling" : ""
      }`}
      style={{ "--sprite-slot": slotIndex } as CSSProperties}
      aria-hidden
    >
      <svg
        className="landing-privacy__sea-fish"
        viewBox="0 0 72 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 22c0-7.2 5.8-14 14.5-14.5 6.2-.4 12.1 2.4 16.8 6.8 1.1 1 2.6 1.5 4.1 1.3l11.2-1.8-4.2 8.6 4.2 8.6-11.2-1.8c-1.5-.2-3 .3-4.1 1.3-4.7 4.4-10.6 7.2-16.8 6.8C13.8 36 8 29.2 8 22Z"
          fill="url(#privacy-fish-body)"
          fillOpacity="0.88"
        />
        <circle cx="22.5" cy="22" r="2.2" fill="#0f172a" />
        <circle cx="23.1" cy="21.4" r="0.75" fill="#e0f2fe" />
        <path
          d="M14 14.5c-2.2 2.6-3.5 5.8-3.5 7.5M14 29.5c-2.2-2.6-3.5-5.8-3.5-7.5"
          stroke="rgba(125, 211, 252, 0.55)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M48 16.5c2.8 2.2 4.8 5.2 5.6 8.2M48 27.5c-2.8-2.2-4.8-5.2-5.6-8.2"
          stroke="rgba(186, 230, 253, 0.45)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="privacy-fish-body" x1="8" y1="8" x2="56" y2="36">
            <stop stopColor="#38bdf8" />
            <stop offset="0.55" stopColor="#4f8fe3" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="landing-privacy__sea-bubble landing-privacy__sea-bubble--a" />
      <span className="landing-privacy__sea-bubble landing-privacy__sea-bubble--b" />
      <span className="landing-privacy__sea-bubble landing-privacy__sea-bubble--c" />
    </div>
  );
}
