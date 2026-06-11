import { Plus, X } from "lucide-react";
import { UserDTO } from "../../types/userDTO";
import ProfileFriendActions from "./ProfileFriendActions";
import { ErrorState, FriendStatus } from "./types";

export interface ProfilePreviewPanelProps {
  user: UserDTO;
  isOwnProfile: boolean;
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
  return (
    <div
      className={`${
        isOwnProfile ? "w-2/5" : "w-full"
      } bg-white/5 backdrop-blur-sm flex flex-col p-6 border-l border-white/10`}
    >
      {!isOwnProfile && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center mb-6">
        <div className="relative w-full aspect-square max-h-full">
          <img
            src={user.profileImageUrl || "https://via.placeholder.com/300"}
            alt="Profile"
            className={`w-full h-full object-cover rounded-xl shadow-2xl transition-all duration-500 ${
              updatedFields.has("photo")
                ? "ring-4 ring-green-400/50 shadow-green-500/20"
                : ""
            }`}
          />

          {isOwnProfile && (
            <label className="absolute inset-0 cursor-pointer rounded-xl">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-black/0 text-white opacity-0 transition-all duration-200 hover:bg-black/45 hover:opacity-100">
                {loading ? (
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <Plus size={44} />
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
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-red-300 text-sm">{error.photo}</p>
        </div>
      )}

      {error.block && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-red-300 text-sm">{error.block}</p>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
          {user.name} {user.surname}
        </h1>
        <p className="text-lg md:text-xl mb-4 text-gray-200 truncate">
          @{user.nickname}
        </p>

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
    </div>
  );
}
