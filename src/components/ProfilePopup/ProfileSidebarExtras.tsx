import { useState } from "react";
import ProfileSocialLinksDisplay from "../Profile/ProfileSocialLinksDisplay";
import { bioPreview, sanitizeBio } from "../Profile/types";
import { useProfileSettings } from "../Profile/useProfileSettings";
import ProfileBioModal from "./ProfileBioModal";
import { UserDTO } from "../../types/userDTO";

interface ProfileSidebarExtrasProps {
  user: UserDTO;
  isOwnProfile: boolean;
  variant?: "embedded" | "standalone";
  className?: string;
}

export default function ProfileSidebarExtras({
  user,
  isOwnProfile,
  variant = "embedded",
  className = "",
}: ProfileSidebarExtrasProps) {
  const { bio, socialLinks, loading } = useProfileSettings(user.id);
  const [bioModalOpen, setBioModalOpen] = useState(false);

  const displayBio = sanitizeBio(bio.trim());
  const { preview, isTruncated } = bioPreview(displayBio);
  const hasBio = Boolean(displayBio);
  const hasLinks = socialLinks.length > 0;
  const hasContent = hasBio || hasLinks;

  const isStandalone = variant === "standalone";
  const wrapperClass = isStandalone
    ? "flex w-full min-w-0 flex-col"
    : "mt-5 min-w-0 w-full border-t border-white/10 pt-5";

  return (
    <>
      <div className={`${wrapperClass} ${className}`}>
        {loading ? (
          <p className="text-center text-xs text-gray-500">Loading…</p>
        ) : hasContent ? (
          <div className="space-y-3">
            {hasBio && (
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Bio
                </p>
                <p className="whitespace-pre-wrap break-words text-left text-sm leading-relaxed text-gray-300 [overflow-wrap:anywhere]">
                  {preview}
                  {isTruncated && (
                    <>
                      <span aria-hidden="true">… </span>
                      <button
                        type="button"
                        onClick={() => setBioModalOpen(true)}
                        className="inline text-indigo-300 transition hover:text-indigo-200"
                      >
                        Read more
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}

            {hasLinks && (
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Links
                </p>
                <div className="min-w-0 overflow-x-hidden">
                  <ProfileSocialLinksDisplay links={socialLinks} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center">
            <p className="text-xs leading-relaxed text-gray-500">
              {isOwnProfile
                ? "Add a bio and link your accounts in profile settings."
                : `@${user.nickname} hasn't added a bio or links yet.`}
            </p>
          </div>
        )}
      </div>

      {bioModalOpen && hasBio && (
        <ProfileBioModal
          bio={displayBio}
          nickname={user.nickname}
          onClose={() => setBioModalOpen(false)}
        />
      )}
    </>
  );
}
