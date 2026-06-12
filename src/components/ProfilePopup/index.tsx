import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useUser } from "../../context/UserContext";
import ProfileConfirmationModal from "./ProfileConfirmationModal";
import ProfilePreviewPanel from "./ProfilePreviewPanel";
import ProfileCardView from "../ProfileCard/ProfileCardView";
import { ProfilePopupProps } from "./types";
import { useProfileEditing } from "./useProfileEditing";
import { useProfileSocial } from "./useProfileSocial";

export default function ProfilePopup({ onClose, user }: ProfilePopupProps) {
  const { user: currentUser } = useUser();
  const editing = useProfileEditing({ user, onClose });
  const isOwnProfile = currentUser?.id === editing.localUser.id;
  const isFrozenLimited = !isOwnProfile && !!editing.localUser.frozen;
  const canvasPageRef = useRef<HTMLDivElement>(null);

  const social = useProfileSocial({
    profileUser: editing.localUser,
    isOwnProfile,
    enabled: !isFrozenLimited,
    setError: editing.setError,
  });

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const scrollToCanvas = () => {
    canvasPageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm sm:p-6 lg:p-4"
      onClick={editing.handleClose}
    >
      <div
        className="relative flex h-[calc(100dvh-3.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#101018]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:h-[min(740px,calc(100dvh-4rem))] lg:h-[min(740px,92vh)] lg:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-popup-pager flex min-h-0 min-w-0 flex-1 flex-col lg:h-full lg:w-full lg:flex-row lg:items-stretch lg:overflow-hidden">
          <div className="profile-popup-page flex h-full w-full shrink-0 flex-col bg-white/5 lg:h-auto lg:w-80 lg:flex-none lg:overflow-hidden lg:bg-transparent">
            <div className="flex min-h-0 flex-1 flex-col touch-pan-y lg:h-full lg:overflow-y-auto lg:indigo-scrollbar">
              <ProfilePreviewPanel
                user={editing.localUser}
                isOwnProfile={isOwnProfile}
                isFrozenLimited={isFrozenLimited}
                loading={editing.loading}
                updatedFields={editing.updatedFields}
                error={editing.error}
                friendStatus={social.friendStatus}
                isBlocked={social.isBlocked}
                blockStatusLoaded={social.blockStatusLoaded}
                blockLoading={social.blockLoading}
                onClose={editing.handleClose}
                onPhotoUpload={editing.handlePhotoUpload}
                onAddFriend={social.handleAddFriend}
                onCancelRequest={social.showCancelRequestConfirmation}
                onRemoveFriend={social.showRemoveFriendConfirmation}
                onAcceptRequest={social.handleAcceptRequest}
                onRejectRequest={social.handleRejectRequest}
                onBlockToggle={social.showBlockConfirmation}
              />
            </div>

            {!isFrozenLimited && (
              <button
                type="button"
                onClick={scrollToCanvas}
                className="flex shrink-0 touch-manipulation flex-col items-center gap-0.5 border-t border-white/10 py-3 text-gray-500 transition active:text-gray-300 lg:hidden"
                aria-label="Go to canvas"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest">Canvas</span>
                <ChevronDown size={18} aria-hidden />
              </button>
            )}
          </div>

          <div
            ref={canvasPageRef}
            className="profile-popup-page flex h-full w-full min-h-0 flex-col bg-white/5 lg:w-0 lg:flex-1 lg:overflow-hidden lg:border-l lg:border-white/10 lg:bg-black/20"
          >
            <ProfileCardView
              userId={editing.localUser.id}
              isOwnProfile={isOwnProfile}
              isFrozenLimited={isFrozenLimited}
              nickname={editing.localUser.nickname}
            />
          </div>
        </div>
      </div>

      {social.confirmationModal?.isOpen && (
        <ProfileConfirmationModal
          modal={social.confirmationModal}
          onClose={social.closeConfirmationModal}
        />
      )}
    </div>,
    document.body
  );
}
