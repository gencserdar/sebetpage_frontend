export type SocialPlatform =
  | "youtube"
  | "spotify"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "steam"
  | "github"
  | "x"
  | "twitch"
  | "tiktok";

export interface SocialPlatformDef {
  id: SocialPlatform;
  label: string;
  placeholder: string;
  hint: string;
  brandColor: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  {
    id: "youtube",
    label: "YouTube",
    placeholder: "https://www.youtube.com/@username",
    hint: "Use a youtube.com/@ profile link.",
    brandColor: "#FF0000",
  },
  {
    id: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/user/...",
    hint: "Use an open.spotify.com/user/ profile link.",
    brandColor: "#1DB954",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "https://www.linkedin.com/in/username",
    hint: "Use a linkedin.com/in/ profile link.",
    brandColor: "#0A66C2",
  },
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "https://www.instagram.com/username",
    hint: "Use an instagram.com profile link.",
    brandColor: "#E4405F",
  },
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "https://www.facebook.com/username",
    hint: "Use a facebook.com profile link.",
    brandColor: "#1877F2",
  },
  {
    id: "steam",
    label: "Steam",
    placeholder: "https://steamcommunity.com/id/username",
    hint: "Use a steamcommunity.com/id/ or /profiles/ link.",
    brandColor: "#171A21",
  },
  {
    id: "github",
    label: "GitHub",
    placeholder: "https://github.com/username",
    hint: "Use a github.com profile link.",
    brandColor: "#FFFFFF",
  },
  {
    id: "x",
    label: "X",
    placeholder: "https://x.com/username",
    hint: "Use an x.com or twitter.com profile link.",
    brandColor: "#FFFFFF",
  },
  {
    id: "twitch",
    label: "Twitch",
    placeholder: "https://www.twitch.tv/username",
    hint: "Use a twitch.tv profile link.",
    brandColor: "#9146FF",
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "https://www.tiktok.com/@username",
    hint: "Use a tiktok.com/@ profile link.",
    brandColor: "#FE2C55",
  },
];

export function getPlatformDef(id: SocialPlatform): SocialPlatformDef {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)!;
}

export function normalizeSocialUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseProfileUrl(raw: string): URL | null {
  try {
    return new URL(normalizeSocialUrl(raw));
  } catch {
    return null;
  }
}

function hostMatches(url: URL, hosts: string[]): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return hosts.includes(host);
}

function cleanProfileUrl(url: URL, pathname: string): string {
  return `${url.protocol}//${url.hostname}${pathname}`;
}

function getValidationError(platform: SocialPlatform, url: URL): string {
  return getPlatformDef(platform).hint;
}

function isProfilePath(platform: SocialPlatform, url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "") || "/";

  switch (platform) {
    case "youtube":
      return hostMatches(url, ["youtube.com", "m.youtube.com"]) && /^\/@[^/]+$/i.test(path);
    case "spotify":
      return (
        hostMatches(url, ["open.spotify.com"]) &&
        /^\/(?:intl-[a-z]{2}\/)?user\/[^/]+$/i.test(path)
      );
    case "linkedin":
      return hostMatches(url, ["linkedin.com"]) && /^\/in\/[^/]+$/i.test(path);
    case "instagram":
      return (
        hostMatches(url, ["instagram.com"]) &&
        /^\/(?!p\/|reel\/|stories\/)[^/]+\/?$/i.test(path) &&
        path.split("/").filter(Boolean).length === 1
      );
    case "facebook": {
      if (!hostMatches(url, ["facebook.com", "m.facebook.com"])) return false;
      if (/^\/profile\.php$/i.test(path)) return url.searchParams.has("id");
      return /^\/[^/]+$/i.test(path) && !["login", "watch", "marketplace"].includes(path.slice(1).toLowerCase());
    }
    case "steam":
      return (
        hostMatches(url, ["steamcommunity.com"]) &&
        (/^\/id\/[^/]+$/i.test(path) || /^\/profiles\/\d+$/i.test(path))
      );
    case "github":
      return (
        hostMatches(url, ["github.com"]) &&
        /^\/[^/]+$/i.test(path) &&
        !["settings", "login", "signup", "features"].includes(path.slice(1).toLowerCase())
      );
    case "x":
      return (
        hostMatches(url, ["x.com", "twitter.com"]) &&
        /^\/[^/]+$/i.test(path) &&
        !["home", "explore", "settings", "i"].includes(path.slice(1).toLowerCase())
      );
    case "twitch":
      return hostMatches(url, ["twitch.tv"]) && /^\/[^/]+$/i.test(path);
    case "tiktok":
      return hostMatches(url, ["tiktok.com"]) && /^\/@[^/]+$/i.test(path);
    default:
      return false;
  }
}

export function validateSocialUrl(
  platform: SocialPlatform,
  raw: string
): { ok: true; url: string } | { ok: false; message: string } {
  const parsed = parseProfileUrl(raw);
  if (!parsed) {
    return { ok: false, message: raw.trim() ? "Enter a valid URL." : "Enter a link." };
  }

  if (!isProfilePath(platform, parsed)) {
    return { ok: false, message: getValidationError(platform, parsed) };
  }

  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  const cleanUrl =
    platform === "facebook" && path === "/profile.php"
      ? `${parsed.protocol}//${parsed.hostname}${path}?id=${parsed.searchParams.get("id")}`
      : cleanProfileUrl(parsed, path);
  return { ok: true, url: cleanUrl };
}
