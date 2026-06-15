import { getPlatformDef } from "./socialPlatforms";
import SocialPlatformIcon, { getSocialIconShell } from "./SocialPlatformIcon";
import { SocialLink } from "./types";

interface ProfileSocialLinksDisplayProps {
  links: SocialLink[];
}

export default function ProfileSocialLinksDisplay({ links }: ProfileSocialLinksDisplayProps) {
  if (links.length === 0) return null;

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-2 lg:flex lg:flex-wrap">
      {links.map((link) => {
        const def = getPlatformDef(link.platform);
        const shell = getSocialIconShell(def.brandColor, 13);

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={def.label}
            className="group flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-1 pr-2 transition hover:border-white/20 hover:bg-white/[0.08] lg:inline-flex lg:w-fit lg:max-w-full lg:pr-2.5"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={shell.wrapperStyle}
            >
              <SocialPlatformIcon platform={link.platform} size={shell.iconSize} />
            </span>
            <span className="truncate text-xs font-medium text-gray-300 group-hover:text-white">
              {def.label}
            </span>
          </a>
        );
      })}
    </div>
  );
}
