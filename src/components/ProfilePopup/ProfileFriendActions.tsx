import { Check, Shield, ShieldOff, UserMinus, X } from "lucide-react";
import { FriendStatus } from "./types";

export interface ProfileFriendActionsProps {
  friendStatus: FriendStatus;
  isBlocked: boolean;
  blockStatusLoaded: boolean;
  blockLoading: boolean;
  onAddFriend: () => void;
  onCancelRequest: () => void;
  onRemoveFriend: () => void;
  onAcceptRequest: () => void;
  onRejectRequest: () => void;
  onBlockToggle: () => void;
}

export default function ProfileFriendActions({
  friendStatus,
  isBlocked,
  blockStatusLoaded,
  blockLoading,
  onAddFriend,
  onCancelRequest,
  onRemoveFriend,
  onAcceptRequest,
  onRejectRequest,
  onBlockToggle,
}: ProfileFriendActionsProps) {
  if (!blockStatusLoaded) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {!isBlocked && (
        <div className="flex justify-center">
          {friendStatus === "none" && (
            <button
              onClick={onAddFriend}
              className="bg-indigo-500/80 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
            >
              Add Friend
            </button>
          )}

          {friendStatus === "sent" && (
            <button
              onClick={onCancelRequest}
              className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
            >
              <X size={18} />
              Cancel Request
            </button>
          )}

          {friendStatus === "friends" && (
            <button
              onClick={onRemoveFriend}
              className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
            >
              <UserMinus size={18} />
              Remove Friend
            </button>
          )}

          {friendStatus === "received" && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={onAcceptRequest}
                className="bg-green-600/80 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
              >
                <Check size={18} />
                Accept
              </button>
              <button
                onClick={onRejectRequest}
                className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
              >
                <X size={18} />
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onBlockToggle}
          disabled={blockLoading}
          className={`flex items-center gap-2 font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm ${
            isBlocked
              ? "bg-gray-600/80 hover:bg-gray-600 text-white"
              : "bg-orange-600/80 hover:bg-orange-600 text-white"
          }`}
        >
          {blockLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              {isBlocked ? <ShieldOff size={18} /> : <Shield size={18} />}
              {isBlocked ? "Unblock User" : "Block User"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
