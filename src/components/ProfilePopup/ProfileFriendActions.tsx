import { Check, Shield, ShieldOff, UserMinus, UserPlus, X } from "lucide-react";
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

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

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
    return (
      <div className="mt-3 flex justify-center">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {!isBlocked && friendStatus !== "none" && (
        <div className="flex flex-wrap justify-center gap-2">
          {friendStatus === "sent" && (
            <button
              type="button"
              onClick={onCancelRequest}
              className={`${btn} border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200 hover:bg-red-500/20`}
            >
              <X size={14} />
              Cancel
            </button>
          )}

          {friendStatus === "friends" && (
            <button
              type="button"
              onClick={onRemoveFriend}
              className={`${btn} border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200 hover:bg-red-500/20`}
            >
              <UserMinus size={14} />
              Remove
            </button>
          )}

          {friendStatus === "received" && (
            <>
              <button
                type="button"
                onClick={onAcceptRequest}
                className={`${btn} bg-green-600/80 px-3 py-1.5 text-white hover:bg-green-600`}
              >
                <Check size={14} />
                Accept
              </button>
              <button
                type="button"
                onClick={onRejectRequest}
                className={`${btn} border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200 hover:bg-red-500/20`}
              >
                <X size={14} />
                Decline
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {!isBlocked && friendStatus === "none" && (
          <button
            type="button"
            onClick={onAddFriend}
            className={`${btn} bg-indigo-500/80 px-4 py-1.5 text-white hover:bg-indigo-500`}
          >
            <UserPlus size={14} />
            Add friend
          </button>
        )}

        <button
          type="button"
          onClick={onBlockToggle}
          disabled={blockLoading}
          className={`${btn} px-3 py-1.5 ${
            isBlocked
              ? "border border-white/15 bg-white/10 text-gray-200 hover:bg-white/15"
              : "border border-orange-500/25 text-orange-300/90 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-200"
          }`}
        >
          {blockLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isBlocked ? (
            <>
              <ShieldOff size={14} />
              Unblock
            </>
          ) : (
            <>
              <Shield size={14} />
              Block
            </>
          )}
        </button>
      </div>
    </div>
  );
}
