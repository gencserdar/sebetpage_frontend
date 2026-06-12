import { LayoutGrid, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfileSettings } from "../Profile/useProfileSettings";
import ProfileCardGrid from "./ProfileCardGrid";

interface ProfileCardViewProps {
  userId: number;
  isOwnProfile: boolean;
  isFrozenLimited?: boolean;
  nickname: string;
}

export default function ProfileCardView({
  userId,
  isOwnProfile,
  isFrozenLimited = false,
  nickname,
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
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 via-violet-500/15 to-indigo-500/10 ring-1 ring-white/10">
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col p-3 sm:p-6 lg:h-full lg:p-6">
      <div className="mb-2 flex shrink-0 items-center gap-2 text-gray-500 sm:mb-3">
        <LayoutGrid size={16} />
        <span className="text-xs font-medium uppercase tracking-widest">CANVAS</span>
      </div>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden lg:h-full">
        <ProfileCardGrid widgets={widgets} mode="view" fill />
      </div>
      {isOwnProfile && (
        <button
          type="button"
          onClick={goToProfileSettings}
          className="mt-2 shrink-0 self-center text-sm text-indigo-300 transition hover:text-indigo-200 sm:mt-4"
        >
          Edit in profile settings
        </button>
      )}
    </div>
  );
}
