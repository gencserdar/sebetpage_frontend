import { useState, useEffect } from "react";
import { X, Shield, ShieldOff, User } from "lucide-react";
import { useBlockService, BlockedUser } from "../services/blockService";

interface BlockedUsersPopupProps {
  onClose: () => void;
}

interface ConfirmationModalData {
  isOpen: boolean;
  user: BlockedUser | null;
  onConfirm: () => void;
}

export default function BlockedUsersPopup({ onClose }: BlockedUsersPopupProps) {
  const { getMyBlocks, unblockUser, loading } = useBlockService();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<number | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalData>({
    isOpen: false,
    user: null,
    onConfirm: () => {}
  });

  // Fetch blocked users on component mount
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
      
      // Remove user from the list
      setBlockedUsers(prev => prev.filter(u => u.blockedId !== user.blockedId));
      
      console.log(`Successfully unblocked user: ${user.blockedNickname}`);
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
      onConfirm: () => handleUnblock(user)
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-white/20">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-orange-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Blocked Users</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-sm mt-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading State */}
          {fetchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-gray-300">Loading blocked users...</span>
            </div>
          ) : blockedUsers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Shield className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">No Blocked Users</h3>
              <p className="text-gray-300">You haven't blocked anyone yet.</p>
            </div>
          ) : (
            /* Blocked Users List */
            <div className="space-y-3">
              {blockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    {/* Profile Image */}
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
                      {/* Blocked indicator */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <Shield className="text-white" size={10} />
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">
                        @{user.blockedNickname}
                      </span>
                      {user.createdAt && (
                        <span className="text-sm text-gray-400">
                          Blocked on {formatDate(user.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unblock Button */}
                  <button
                    onClick={() => showUnblockConfirmation(user)}
                    disabled={unblockingUserId === user.blockedId}
                    className="flex items-center gap-2 bg-gray-600/80 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unblockingUserId === user.blockedId ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
          )}
        </div>

        {/* Footer */}
        {!fetchLoading && blockedUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-sm text-gray-400 text-center">
              {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''} blocked
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && confirmationModal.user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Unblock</h3>
            <p className="text-gray-200 mb-6 leading-relaxed">
              Are you sure you want to unblock{' '}
              <span className="font-semibold">@{confirmationModal.user.blockedNickname}</span>?
              <br />
              <span className="text-sm text-gray-400">
                They will be able to interact with you again.
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeConfirmationModal}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmationModal.onConfirm}
                className="bg-gray-600/80 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
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