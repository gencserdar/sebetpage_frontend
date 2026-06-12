import { useState, useEffect } from "react";
import { Shield, ShieldOff, User } from "lucide-react";
import { useBlockService, BlockedUser } from "../../services/blockService";
import SettingsSectionHeader from "./SettingsSectionHeader";

interface ConfirmationModalData {
  isOpen: boolean;
  user: BlockedUser | null;
  onConfirm: () => void;
}

export default function BlockedUsersSection() {
  const { getMyBlocks, unblockUser } = useBlockService();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<number | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalData>({
    isOpen: false,
    user: null,
    onConfirm: () => {},
  });

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        setFetchLoading(true);
        setError(null);
        const users = await getMyBlocks();
        setBlockedUsers(users);
      } catch (err) {
        console.error("Failed to fetch blocked users:", err);
        setError("Failed to load blocked users");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [getMyBlocks]);

  const handleUnblock = async (user: BlockedUser) => {
    try {
      setUnblockingUserId(user.blockedId);
      await unblockUser(user.blockedId);
      setBlockedUsers((prev) => prev.filter((u) => u.blockedId !== user.blockedId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
      setError(`Failed to unblock ${user.blockedNickname}`);
    } finally {
      setUnblockingUserId(null);
      setConfirmationModal({ isOpen: false, user: null, onConfirm: () => {} });
    }
  };

  const showUnblockConfirmation = (user: BlockedUser) => {
    setConfirmationModal({
      isOpen: true,
      user,
      onConfirm: () => handleUnblock(user),
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, user: null, onConfirm: () => {} });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <div>
      <SettingsSectionHeader
        title="Blocked users"
        description="People you've blocked can't message you or send friend requests."
      />

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {fetchLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
          <span className="ml-3 text-gray-400">Loading blocked users...</span>
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
            <Shield className="text-gray-500" size={26} />
          </div>
          <h3 className="text-lg font-semibold text-white">No blocked users</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            You haven&apos;t blocked anyone yet.
          </p>
        </div>
      ) : (
        <>
          <div className="max-w-2xl space-y-2">
            {blockedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.blockedNickname}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <User className="text-gray-300" size={20} />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Shield className="text-white" size={10} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">@{user.blockedNickname}</span>
                    {user.createdAt && (
                      <span className="text-sm text-gray-400">
                        Blocked on {formatDate(user.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showUnblockConfirmation(user)}
                  disabled={unblockingUserId === user.blockedId}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {unblockingUserId === user.blockedId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Unblocking...</span>
                    </>
                  ) : (
                    <>
                      <ShieldOff size={16} />
                      <span>Unblock</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-6">
            {blockedUsers.length} user{blockedUsers.length !== 1 ? "s" : ""} blocked
          </p>
        </>
      )}

      {confirmationModal.isOpen && confirmationModal.user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm unblock</h3>
            <p className="text-gray-200 mb-6 leading-relaxed">
              Are you sure you want to unblock{" "}
              <span className="font-semibold">@{confirmationModal.user.blockedNickname}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeConfirmationModal}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmationModal.onConfirm}
                className="bg-gray-600/80 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
