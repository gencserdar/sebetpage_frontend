import { useState, useEffect } from "react";
import {
  sendFriendRequest,
  getFriendStatus,
  respondToRequest,
  removeFriend,
  cancelOutgoingRequest,
} from "../../services/friendService";
import { useBlockService } from "../../services/blockService";
import { UserDTO } from "../../types/userDTO";
import {
  ConfirmationModalState,
  ErrorState,
  FriendStatus,
} from "./types";

export interface UseProfileSocialParams {
  profileUser: UserDTO;
  isOwnProfile: boolean;
  setError: React.Dispatch<React.SetStateAction<ErrorState>>;
}

export interface UseProfileSocialReturn {
  friendStatus: FriendStatus;
  isBlocked: boolean;
  blockStatusLoaded: boolean;
  blockLoading: boolean;
  confirmationModal: ConfirmationModalState;
  handleAddFriend: () => Promise<void>;
  handleAcceptRequest: () => Promise<void>;
  handleRejectRequest: () => Promise<void>;
  showRemoveFriendConfirmation: () => void;
  showBlockConfirmation: () => void;
  closeConfirmationModal: () => void;
  showCancelRequestConfirmation: () => void;
}

export function useProfileSocial({
  profileUser,
  isOwnProfile,
  setError,
}: UseProfileSocialParams): UseProfileSocialReturn {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendRequestId, setFriendRequestId] = useState<number | null>(null);
  const [outgoingRequestId, setOutgoingRequestId] = useState<number | null>(
    null
  );

  const {
    blockUser,
    unblockUser,
    getBlockStatus,
    loading: blockLoading,
  } = useBlockService();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockStatusLoaded, setBlockStatusLoaded] = useState(false);

  const [confirmationModal, setConfirmationModal] =
    useState<ConfirmationModalState>(null);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!isOwnProfile && profileUser.nickname) {
        try {
          // Fetch friend status
          const statusResponse = await getFriendStatus(profileUser.nickname);

          if (
            typeof statusResponse === "object" &&
            statusResponse !== null &&
            "status" in statusResponse
          ) {
            const status = (statusResponse as { status: FriendStatus }).status;
            const requestId = (statusResponse as { requestId?: number })
              .requestId;

            setFriendStatus(status);

            // Set the correct ID based on status
            if (status === "sent") {
              setOutgoingRequestId(requestId || null);
              setFriendRequestId(null); // Clear incoming request ID
            } else if (status === "received") {
              setFriendRequestId(requestId || null);
              setOutgoingRequestId(null); // Clear outgoing request ID
            } else {
              setFriendRequestId(null);
              setOutgoingRequestId(null);
            }
          } else {
            setFriendStatus(statusResponse as FriendStatus);
            // Clear both IDs for simple response
            setFriendRequestId(null);
            setOutgoingRequestId(null);
          }

          // Fetch block status
          const blockStatus = await getBlockStatus(profileUser.nickname);
          setIsBlocked(blockStatus.blockedByMe);
          setBlockStatusLoaded(true);
        } catch (err) {
          console.error("Failed to fetch statuses:", err);
          setBlockStatusLoaded(true);
        }
      }
    };

    fetchStatuses();
  }, [profileUser.nickname, isOwnProfile, getBlockStatus]);

  const handleAddFriend = async () => {
    try {
      const response = await sendFriendRequest(profileUser.nickname);

      if (response && typeof response === "object" && "status" in response) {
        if (response.status === "sent") {
          // Request was sent successfully
          setFriendStatus("sent");

          // Make sure to set the outgoing request ID
          if ("requestId" in response && response.requestId) {
            setOutgoingRequestId(response.requestId);
          } else {
            console.error(
              "Response status is 'sent' but no requestId found:",
              response
            );
            // Try to fetch status to get the ID
            try {
              const statusResponse = await getFriendStatus(profileUser.nickname);
              if (
                typeof statusResponse === "object" &&
                statusResponse !== null &&
                "requestId" in statusResponse
              ) {
                setOutgoingRequestId(
                  (statusResponse as { requestId?: number }).requestId ?? null
                );
              }
            } catch (statusErr) {
              console.error(
                "Failed to fetch status after sending request:",
                statusErr
              );
            }
          }
        } else if (response.status === "friends") {
          // Became friends immediately (reverse request existed)
          setFriendStatus("friends");
          setOutgoingRequestId(null);
          setFriendRequestId(null);
        } else {
          console.error("Unexpected response status:", response.status);
          setFriendStatus("sent"); // Fallback
        }
      } else {
        // Fallback for unexpected response format
        console.error("Unexpected response format:", response);
        setFriendStatus("sent");

        // Try to get request ID from status endpoint
        try {
          const statusResponse = await getFriendStatus(profileUser.nickname);
          if (
            typeof statusResponse === "object" &&
            statusResponse !== null &&
            "requestId" in statusResponse
          ) {
            setOutgoingRequestId(
              (statusResponse as { requestId?: number }).requestId ?? null
            );
          }
        } catch (statusErr) {
          console.error("Failed to fetch status in fallback:", statusErr);
        }
      }
    } catch (err) {
      console.error("Failed to send friend request:", err);
      // Don't change UI state on error - let user try again
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send friend request.";
      setError((prev) => ({
        ...prev,
        general: errorMessage,
      }));
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendRequestId) return;

    // Immediately update UI (optimistic update)
    setFriendStatus("friends");
    setFriendRequestId(null);

    try {
      await respondToRequest(friendRequestId, true);
    } catch (err) {
      console.error("Failed to accept friend request:", err);
      // Even if API fails, keep the UI updated for user feedback
    }
  };

  const handleRejectRequest = async () => {
    if (!friendRequestId) return;

    // Immediately update UI (optimistic update)
    setFriendStatus("none");
    setFriendRequestId(null);

    try {
      await respondToRequest(friendRequestId, false);
    } catch (err) {
      console.error("Failed to reject friend request:", err);
      // Even if API fails, keep the UI updated for user feedback
    }
  };

  const handleRemoveFriend = async () => {
    // Immediately update UI (optimistic update)
    setFriendStatus("none");

    try {
      await removeFriend(profileUser.id);
    } catch (err) {
      console.error("Failed to remove friend:", err);
      // Revert the optimistic update on error
      setFriendStatus("friends");
      alert("Failed to remove friend.");
    }
  };

  const handleToggleBlock = async () => {
    const wasBlocked = isBlocked;

    // Store original values for potential reversion
    const originalFriendStatus = friendStatus;
    const originalOutgoingRequestId = outgoingRequestId;
    const originalFriendRequestId = friendRequestId;

    setError((prev) => ({ ...prev, block: null }));

    try {
      if (wasBlocked) {
        // Unblocking - simpler case
        setIsBlocked(false);
        await unblockUser(profileUser.id);
      } else {
        // Blocking - need to handle all relationship states first

        // Step 1: Handle existing relationships BEFORE blocking

        // If they are friends, remove friendship first
        if (friendStatus === "friends") {
          try {
            await removeFriend(profileUser.id);
          } catch (removeErr) {
            console.error("Failed to remove friend before block:", removeErr);
            // Don't throw here - we still want to proceed with the block
          }
        }

        // If there's an outgoing request, cancel it
        if (outgoingRequestId) {
          try {
            await cancelOutgoingRequest(outgoingRequestId);
          } catch (cancelErr) {
            console.error(
              "Failed to cancel outgoing request before block:",
              cancelErr
            );
            // Don't throw here - we still want to proceed with the block
          }
        }

        // If there's an incoming request, reject it
        if (friendRequestId) {
          try {
            await respondToRequest(friendRequestId, false);
          } catch (rejectErr) {
            console.error(
              "Failed to reject incoming request before block:",
              rejectErr
            );
            // Don't throw here - we still want to proceed with the block
          }
        }

        // Update UI state immediately after handling relationships
        setFriendStatus("none");
        setFriendRequestId(null);
        setOutgoingRequestId(null);
        setIsBlocked(true);

        // Step 2: Now block the user
        await blockUser(profileUser.id);
      }
    } catch (err) {
      console.error("Failed to toggle block:", err);

      // Revert all optimistic updates on error
      setIsBlocked(wasBlocked);
      setFriendStatus(originalFriendStatus);
      setOutgoingRequestId(originalOutgoingRequestId);
      setFriendRequestId(originalFriendRequestId);

      setError((prev) => ({
        ...prev,
        block: `Failed to ${wasBlocked ? "unblock" : "block"} user`,
      }));
    }
  };

  const showRemoveFriendConfirmation = () => {
    setConfirmationModal({
      isOpen: true,
      type: "removeFriend",
      message: `Are you sure you want to remove ${profileUser.name || profileUser.nickname} from your friends?`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleRemoveFriend();
      },
    });
  };

  const showBlockConfirmation = () => {
    const action = isBlocked ? "unblock" : "block";
    const hasOutgoingRequest = outgoingRequestId !== null;

    setConfirmationModal({
      isOpen: true,
      type: isBlocked ? "unblock" : "block",
      message: `Are you sure you want to ${action} ${profileUser.name || profileUser.nickname}?${
        !isBlocked && (friendStatus === "friends" || hasOutgoingRequest)
          ? " This will also remove them from your friends and cancel any pending friend requests."
          : ""
      }`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleToggleBlock();
      },
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(null);
  };

  const handleCancelRequest = async () => {
    if (!outgoingRequestId) {
      console.error("No outgoing request ID found");
      return;
    }

    // Store original values for potential reversion
    const originalStatus = friendStatus;
    const originalRequestId = outgoingRequestId;

    // Immediately update UI (optimistic update)
    setFriendStatus("none");
    setOutgoingRequestId(null);

    try {
      await cancelOutgoingRequest(originalRequestId);
    } catch (err) {
      console.error("Failed to cancel friend request:", err);
      // Revert the optimistic update on error
      setFriendStatus(originalStatus);
      setOutgoingRequestId(originalRequestId);

      // Show error to user
      setError((prev) => ({
        ...prev,
        general: "Failed to cancel friend request. Please try again.",
      }));
    }
  };

  const showCancelRequestConfirmation = () => {
    setConfirmationModal({
      isOpen: true,
      type: "cancelRequest",
      message: `Are you sure you want to cancel your friend request to ${profileUser.name || profileUser.nickname}?`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleCancelRequest();
      },
    });
  };

  return {
    friendStatus,
    isBlocked,
    blockStatusLoaded,
    blockLoading,
    confirmationModal,
    handleAddFriend,
    handleAcceptRequest,
    handleRejectRequest,
    showRemoveFriendConfirmation,
    showBlockConfirmation,
    closeConfirmationModal,
    showCancelRequestConfirmation,
  };
}
