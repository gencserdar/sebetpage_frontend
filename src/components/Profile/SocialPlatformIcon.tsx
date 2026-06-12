import { CSSProperties } from "react";
import { useId } from "react";
import { Github, Twitch } from "lucide-react";
import { SocialPlatform } from "./socialPlatforms";

interface SocialPlatformIconProps {
  platform: SocialPlatform;
  size?: number;
  className?: string;
}

export function getSocialIconShell(
  brandColor: string,
  size: number
): { wrapperStyle: CSSProperties; iconSize: number } {
  return {
    wrapperStyle: { backgroundColor: `${brandColor}22`, color: brandColor },
    iconSize: size,
  };
}

function IconSvg({
  children,
  size,
  className,
}: {
  children: React.ReactNode;
  size: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function SpotifyIcon({ size, className }: { size: number; className?: string }) {
  const clipId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="10.6" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <g
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke="#111"
        strokeLinecap="round"
        transform="rotate(7 12 12)"
      >
        <path d="M4.75 9.5Q12 6.95 19.25 9.5" strokeWidth="1.9" />
        <path d="M5.75 13.55Q12 11.75 18.25 13.55" strokeWidth="1.4" />
        <path d="M7.35 16.55Q12 15.3 16.65 16.55" strokeWidth="1.25" />
      </g>
    </svg>
  );
}

export default function SocialPlatformIcon({
  platform,
  size = 18,
  className = "",
}: SocialPlatformIconProps) {
  if (platform === "spotify") {
    return <SpotifyIcon size={size} className={className} />;
  }

  if (platform === "github") {
    return <Github size={size} className={className} />;
  }

  if (platform === "twitch") {
    return <Twitch size={size} className={className} strokeWidth={2} />;
  }

  switch (platform) {
    case "youtube":
      return (
        <IconSvg size={size} className={className}>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.8 15.5V8.5l6.2 3.5-6.2 3.5z" />
        </IconSvg>
      );
    case "linkedin":
      return (
        <IconSvg size={size} className={className}>
          <path d="M20.4 20.4h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.5v1.6h.1c.5-.9 1.7-1.8 3.5-1.8 3.7 0 4.4 2.5 4.4 5.7v6H20.4zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.4H3.5V9h3.6v11.4zM22.2 0H1.8C.8 0 0 .8 0 1.8v20.4C0 23.2.8 24 1.8 24h20.4c1 0 1.8-.8 1.8-1.8V1.8c0-1-.8-1.8-1.8-1.8z" />
        </IconSvg>
      );
    case "instagram":
      return (
        <IconSvg size={size} className={className}>
          <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.5 1s.7.9.9 1.5c.2.4.4 1.1.4 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.5s-.9.7-1.5.9c-.4.2-1.1.4-2.3.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.5-1s-.7-.9-.9-1.5c-.2-.4-.4-1.1-.4-2.3-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.5s.9-.7 1.5-.9c.4-.2 1.1-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 0 5.7.1 4.8.3 4 .6 3.2.9 2.5 1.4 1.9 2 1.3 2.6.8 3.3.5 4.1.3 5 .1 5.9 0 7.2 0 8.5 0 8.9 0 12s0 3.5.1 4.8c.1 1.3.3 2.2.6 3 .3.8.8 1.5 1.4 2.1s1.3 1.1 2.1 1.4c.8.3 1.7.5 3 .6 1.3.1 1.7.1 4.8.1s3.5 0 4.8-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.8 2.1-1.4s1.1-1.3 1.4-2.1c.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-4.8s0-3.5-.1-4.8c-.1-1.3-.3-2.2-.6-3-.3-.8-.8-1.5-1.4-2.1s-1.3-1.1-2.1-1.4c-.8-.3-1.7-.5-3-.6C15.5 0 15.1 0 12 0z" />
          <path d="M12 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
          <circle cx="18.4" cy="5.6" r="1.4" />
        </IconSvg>
      );
    case "facebook":
      return (
        <IconSvg size={size} className={className}>
          <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.9V12h2.2V9.8c0-2.2 1.3-3.4 3.3-3.4.9 0 1.9.2 1.9.2v2.1h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.4l-.4 2.5h-2v8.4A12 12 0 0 0 24 12z" />
        </IconSvg>
      );
    case "steam":
      return (
        <IconSvg size={size} className={className}>
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.84c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.387 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.972 20.784 6.692 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.351l-1.811-.751c.349 1.049 1.263 1.816 2.364 2.009-.053-.349-.053-.714 0-1.058zM15.072 12.089c-1.593 0-2.885-1.292-2.885-2.884 0-1.593 1.292-2.885 2.885-2.885 1.593 0 2.885 1.292 2.885 2.885-.001 1.593-1.292 2.884-2.885 2.884z" />
        </IconSvg>
      );
    case "x":
      return (
        <IconSvg size={size} className={className}>
          <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.6l-5.2-6.8L5.8 22H2.6l7.3-8.4L.8 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20z" />
        </IconSvg>
      );
    case "tiktok":
      return (
        <IconSvg size={size} className={className}>
          <path d="M19.6 7.7a5.8 5.8 0 0 1-3.4-1.1v7.4a6.8 6.8 0 1 1-6.8-6.8c.3 0 .7 0 1 .1v3.4a3.4 3.4 0 1 0 2.4 3.2V0h3.4a5.8 5.8 0 0 0 5.4 5.4v2.3z" />
        </IconSvg>
      );
    default:
      return null;
  }
}
