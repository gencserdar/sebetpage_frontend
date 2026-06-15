import { createPortal } from "react-dom";
import {
  profilePopupBackdropClass,
  profilePopupCardClass,
} from "./profilePopupLayout";

export function ProfilePopupLoadingShell() {
  return createPortal(
    <div className={profilePopupBackdropClass}>
      <div className={profilePopupCardClass}>
        <div className="profile-popup-pager flex min-h-0 min-w-0 flex-1 overflow-hidden md:flex md:h-full md:w-fit md:flex-row md:items-stretch">
          <div className="profile-popup-page flex w-full shrink-0 flex-col md:h-auto md:w-72 md:flex-none md:overflow-hidden lg:w-80">
            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-3 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                <span className="text-sm">Loading profile…</span>
              </div>
            </div>
          </div>
          <div
            className="profile-popup-page profile-popup-page--canvas hidden min-h-0 shrink-0 flex-col md:flex md:overflow-hidden md:border-l md:border-white/10 md:bg-black/20"
            aria-hidden
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
