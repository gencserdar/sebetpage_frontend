import { LayoutGrid, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfileSettings } from "../Profile/useProfileSettings";
import ProfileCardGrid from "./ProfileCardGrid";

interface ProfileCardViewProps {
  userId: number;
  isOwnProfile: boolean;
  isFrozenLimited?: boolean;
  nickname: string;
  variant?: "popup" | "page";
}

export default function ProfileCardView({
  userId,
  isOwnProfile,
  isFrozenLimited = false,
  nickname,
  variant = "page",
}: ProfileCardViewProps) {
  const navigate = useNavigate();
  const { widgets, isEmpty, loading } = useProfileSettings(userId, {
    enabled: !isFrozenLimited,
  });

  const goToProfileSettings = () => {
    navigate("/settings", { state: { section: "profile" } });
  };

  if (isFrozenLimited) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center px-8 text-center text-sm text-gray-500 lg:h-full">
        Canvas hidden while this account is frozen.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center px-8 text-sm text-gray-500 lg:h-full">
        Loading canvas…
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-8 text-center lg:h-full">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-indigo-400/10 ring-1 ring-white/10">
          <Sparkles size={28} className="text-violet-300" />
        </div>

        {isOwnProfile ? (
          <>
            <h2 className="text-xl font-semibold text-white">Nothing here yet</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
              This is your canvas — add a little color and make it yours.
            </p>
            <button
              type="button"
              onClick={goToProfileSettings}
              className="mt-6 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Go to profile settings
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white">Nothing to show yet</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
              @{nickname} hasn&apos;t customized their canvas yet.
            </p>
          </>
        )}
      </div>
    );
  }

  const isPopup = variant === "popup";

  const canvasLabelClass =
    "items-center gap-1.5 rounded-md border border-white/10 bg-black/50 px-2 py-1 shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-sm transition duration-200";

  const canvasLabelContent = (
    <>
      <LayoutGrid size={14} className="text-gray-400 transition-colors duration-200 group-hover:text-gray-200" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 transition-colors duration-200 group-hover:text-white">
        CANVAS
      </span>
    </>
  );

  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden ${
        isPopup ? "profile-canvas-view--popup p-2" : "p-2 pb-1 sm:p-6 md:p-6"
      }`}
    >
      {!isPopup && (
        <div className="mb-1 flex shrink-0 items-center gap-2 text-gray-500 sm:mb-3">
          <LayoutGrid size={16} />
          <span className="text-xs font-medium uppercase tracking-widest">CANVAS</span>
        </div>
      )}

      <div className="profile-canvas-area relative flex min-h-0 flex-1 overflow-hidden">
        <div className="profile-canvas-shell relative h-full min-h-0 w-full min-w-0">
          {isPopup && isOwnProfile && (
            <button
              type="button"
              onClick={goToProfileSettings}
              aria-label="Edit canvas in profile settings"
              className={`group absolute left-0 top-0 z-10 hidden md:inline-flex ${canvasLabelClass} hover:border-indigo-300/35 hover:bg-black/70 hover:shadow-[0_4px_20px_rgba(0,0,0,0.7)] active:scale-[0.98]`}
            >
              {canvasLabelContent}
            </button>
          )}

          {isPopup && !isOwnProfile && (
            <div
              className={`pointer-events-none absolute left-0 top-0 z-10 hidden md:inline-flex ${canvasLabelClass}`}
            >
              {canvasLabelContent}
            </div>
          )}

          <ProfileCardGrid widgets={widgets} mode="view" fill className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
