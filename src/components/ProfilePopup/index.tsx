import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useUser } from "../../context/UserContext";
import ProfileConfirmationModal from "./ProfileConfirmationModal";
import ProfilePreviewPanel from "./ProfilePreviewPanel";
import ProfileSidebarExtras from "./ProfileSidebarExtras";
import ProfileCardView from "../ProfileCard/ProfileCardView";
import { ProfilePopupProps } from "./types";
import { useProfileEditing } from "./useProfileEditing";
import { useProfileSocial } from "./useProfileSocial";
import { profilePopupBackdropClass, profilePopupCardClass } from "./profilePopupLayout";

const SWIPE_THRESHOLD_PX = 48;

export default function ProfilePopup({ onClose, user }: ProfilePopupProps) {
  const { user: currentUser } = useUser();
  const editing = useProfileEditing({ user, onClose });
  const isOwnProfile = currentUser?.id === editing.localUser.id;
  const isFrozenLimited = !isOwnProfile && !!editing.localUser.frozen;
  const pagerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const mobilePageRef = useRef(0);

  const [mobilePage, setMobilePage] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [isMobilePager, setIsMobilePager] = useState(false);

  const pageCount = isFrozenLimited ? 1 : 3;
  mobilePageRef.current = mobilePage;

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncMode = () => setIsMobilePager(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;

    const updateHeight = () => {
      if (window.matchMedia("(max-width: 767px)").matches) {
        setPagerHeight(pager.clientHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(pager);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const goToPage = useCallback(
    (index: number) => {
      setMobilePage(Math.max(0, Math.min(pageCount - 1, index)));
    },
    [pageCount]
  );

  const handleTouchStart = (event: React.TouchEvent) => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const deltaY = event.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;

    const current = mobilePageRef.current;
    if (deltaY < 0) goToPage(current + 1);
    else goToPage(current - 1);
  };

  const mobilePageStyle =
    isMobilePager && pagerHeight > 0
      ? { height: pagerHeight, minHeight: pagerHeight }
      : undefined;

  const sliderStyle =
    isMobilePager && pagerHeight > 0
      ? { transform: `translateY(-${mobilePage * pagerHeight}px)` }
      : undefined;

  return createPortal(
    <>
      <div
        className={profilePopupBackdropClass}
        onClick={editing.handleClose}
      >
      <div
        className={profilePopupCardClass}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/[0.04] via-transparent to-white/[0.02] max-md:from-white/[0.03] md:hidden"
          aria-hidden
        />
        <div
          ref={pagerRef}
          className="profile-popup-pager relative z-10 min-h-0 min-w-0 flex-1 overflow-hidden md:flex md:h-full md:w-fit md:flex-row md:items-stretch"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="max-md:flex max-md:flex-col max-md:transition-transform max-md:duration-300 max-md:ease-out md:contents"
            style={sliderStyle}
          >
            <div
              className="profile-popup-page flex w-full shrink-0 flex-col md:h-auto md:w-72 md:flex-none md:overflow-hidden lg:w-80"
              style={mobilePageStyle}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:overflow-y-auto md:overscroll-y-contain indigo-scrollbar">
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
                  hideSidebarExtras
                />
              </div>

              {!isFrozenLimited && (
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  className="flex shrink-0 touch-manipulation flex-col items-center gap-0.5 border-t border-white/10 py-3 text-gray-500 transition active:text-gray-300 md:hidden"
                  aria-label="Go to details"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    Details
                  </span>
                  <ChevronDown size={18} aria-hidden />
                </button>
              )}
            </div>

            <div
              className="profile-popup-page flex w-full shrink-0 flex-col md:hidden"
              style={mobilePageStyle}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2 sm:px-5">
                <div className="my-auto w-full min-w-0">
                  <ProfileSidebarExtras
                    user={editing.localUser}
                    isOwnProfile={isOwnProfile}
                    variant="standalone"
                  />
                </div>
              </div>

              {!isFrozenLimited && (
                <button
                  type="button"
                  onClick={() => goToPage(2)}
                  className="flex shrink-0 touch-manipulation flex-col items-center gap-0.5 border-t border-white/10 py-3 text-gray-500 transition active:text-gray-300"
                  aria-label="Go to canvas"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    Canvas
                  </span>
                  <ChevronDown size={18} aria-hidden />
                </button>
              )}
            </div>

            <div
              className="profile-popup-page profile-popup-page--canvas flex w-full min-h-0 shrink-0 flex-col md:overflow-hidden md:border-l md:border-white/10 md:bg-black/20"
              style={mobilePageStyle}
            >
              <ProfileCardView
                userId={editing.localUser.id}
                isOwnProfile={isOwnProfile}
                isFrozenLimited={isFrozenLimited}
                nickname={editing.localUser.nickname}
                variant="popup"
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {social.confirmationModal?.isOpen && (
        <ProfileConfirmationModal
          modal={social.confirmationModal}
          onClose={social.closeConfirmationModal}
        />
      )}
    </>,
    document.body
  );
}
