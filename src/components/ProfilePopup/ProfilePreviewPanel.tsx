import { Plus, X } from "lucide-react";
import { UserDTO } from "../../types/userDTO";
import ProfileFriendActions from "./ProfileFriendActions";
import ProfileSidebarExtras from "./ProfileSidebarExtras";
import { ErrorState, FriendStatus } from "./types";

export interface ProfilePreviewPanelProps {
  user: UserDTO;
  isOwnProfile: boolean;
  isFrozenLimited: boolean;
  loading: boolean;
  updatedFields: Set<string>;
  error: Pick<ErrorState, "photo" | "block">;
  friendStatus: FriendStatus;
  isBlocked: boolean;
  blockStatusLoaded: boolean;
  blockLoading: boolean;
  onClose: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFriend: () => void;
  onCancelRequest: () => void;
  onRemoveFriend: () => void;
  onAcceptRequest: () => void;
  onRejectRequest: () => void;
  onBlockToggle: () => void;
}

export default function ProfilePreviewPanel({
  user,
  isOwnProfile,
  isFrozenLimited,
  loading,
  updatedFields,
  error,
  friendStatus,
  isBlocked,
  blockStatusLoaded,
  blockLoading,
  onClose,
  onPhotoUpload,
  onAddFriend,
  onCancelRequest,
  onRemoveFriend,
  onAcceptRequest,
  onRejectRequest,
  onBlockToggle,
}: ProfilePreviewPanelProps) {
  const handleCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  if (isFrozenLimited) {
    return (
      <div className="relative z-20 flex h-full w-full flex-col p-3 backdrop-blur-sm sm:p-4 lg:h-full lg:w-80 lg:bg-white/5 lg:p-5">
        <div className="relative z-30 mb-2 flex shrink-0 justify-end">
          <button
            type="button"
            onClick={handleCloseClick}
            className="relative z-30 flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-gray-300 transition active:bg-white/10 active:text-white"
            aria-label="Close profile"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p className="text-xl font-semibold text-white">@{user.nickname}</p>
          <p className="mt-3 text-sm text-gray-500">This account is currently frozen.</p>
        </div>
      </div>
    );
  }

  const photoSize = isOwnProfile
    ? "h-36 w-36 lg:h-40 lg:w-40"
    : "h-28 w-28 lg:h-32 lg:w-32";

  return (
    <div className="relative z-20 flex min-h-full w-full flex-col p-3 backdrop-blur-sm sm:p-4 lg:h-full lg:min-h-0 lg:w-80 lg:overflow-y-auto lg:bg-white/5 lg:p-5 indigo-scrollbar">
      <div className="relative z-30 mb-2 flex shrink-0 justify-end">
        <button
          type="button"
          onClick={handleCloseClick}
          className="relative z-30 flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-gray-300 transition active:bg-white/10 active:text-white"
          aria-label="Close profile"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-3 flex shrink-0 justify-center">
        <div className={`relative ${photoSize}`}>
          <img
            src={user.profileImageUrl || "https://via.placeholder.com/300"}
            alt="Profile"
            className={`h-full w-full rounded-2xl object-cover shadow-2xl transition-all duration-500 ${
              updatedFields.has("photo")
                ? "ring-4 ring-green-400/50 shadow-green-500/20"
                : ""
            }`}
          />

          {isOwnProfile && (
            <label className="absolute inset-0 cursor-pointer rounded-2xl">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black/0 text-white opacity-0 transition-all duration-200 hover:bg-black/45 hover:opacity-100">
                {loading ? (
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus size={28} />
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={onPhotoUpload}
                disabled={loading}
              />
            </label>
          )}
        </div>
      </div>

      {error.photo && (
        <div className="mb-2 shrink-0 rounded-lg border border-red-500/30 bg-red-500/20 p-2 backdrop-blur-sm">
          <p className="text-xs text-red-300">{error.photo}</p>
        </div>
      )}

      {error.block && (
        <div className="mb-2 shrink-0 rounded-lg border border-red-500/30 bg-red-500/20 p-2 backdrop-blur-sm">
          <p className="text-xs text-red-300">{error.block}</p>
        </div>
      )}

      <div className="shrink-0 text-center">
        <h1 className="text-lg font-bold leading-tight text-white lg:text-xl">
          {user.name} {user.surname}
        </h1>
        <p className="mt-0.5 truncate text-sm text-gray-400">@{user.nickname}</p>

        {!isOwnProfile && (
          <ProfileFriendActions
            friendStatus={friendStatus}
            isBlocked={isBlocked}
            blockStatusLoaded={blockStatusLoaded}
            blockLoading={blockLoading}
            onAddFriend={onAddFriend}
            onCancelRequest={onCancelRequest}
            onRemoveFriend={onRemoveFriend}
            onAcceptRequest={onAcceptRequest}
            onRejectRequest={onRejectRequest}
            onBlockToggle={onBlockToggle}
          />
        )}
      </div>

      <ProfileSidebarExtras user={user} isOwnProfile={isOwnProfile} />
    </div>
  );
}
