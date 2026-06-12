import { SocialPlatform } from "./socialPlatforms";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface ProfileBasics {
  bio: string;
  socialLinks: SocialLink[];
}

export const MAX_BIO_LENGTH = 180;
export const BIO_PREVIEW_LENGTH = 60;

export function sanitizeBio(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").slice(0, MAX_BIO_LENGTH);
}

export function bioPreview(text: string): { preview: string; isTruncated: boolean } {
  const sanitized = sanitizeBio(text.trim());
  if (sanitized.length <= BIO_PREVIEW_LENGTH) {
    return { preview: sanitized, isTruncated: false };
  }
  return { preview: sanitized.slice(0, BIO_PREVIEW_LENGTH), isTruncated: true };
}
