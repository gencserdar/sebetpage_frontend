import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit3, Plus, Check, X, UserMinus, Shield, ShieldOff } from "lucide-react";
import {
  uploadPhoto,
  requestEmailChange,
  confirmEmailChange,
  updateNameSurname,
  updateNickname,
  requestPasswordChange,
  confirmPasswordChange,
  FieldUpdateResponse,
} from "../services/profileService";
import { useUser } from "../context/UserContext";
import { UserDTO } from "../types/userDTO";
import { sendFriendRequest, getFriendStatus, respondToRequest, removeFriend, cancelOutgoingRequest } from "../services/friendService";
import { useBlockService } from "../services/blockService";

interface ProfilePopupProps {
  onClose: () => void;
  user: UserDTO;
  isOwnProfile?: boolean;
}

interface ErrorState {
  [key: string]: string | null | undefined;
  general?: string | null;
  photo?: string | null;
  password?: string | null;
  block?: string | null;
}

type EditableField = "name" | "surname" | "nickname" | "email" | "password";
type UserEditableField = Exclude<EditableField, "password">;

export default function ProfilePopup({ onClose, user }: ProfilePopupProps) {
  const { user: currentUser, setUser } = useUser();
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [error, setError] = useState<ErrorState>({});
  const [loading, setLoading] = useState(false);
  const [updatedFields, setUpdatedFields] = useState<Set<string>>(new Set());
  const [localUser, setLocalUser] = useState<UserDTO>(user);

  // Keep localUser in sync with the parent's `user` prop. After a rename or a
  // verified email change the parent re-fetches the profile and passes us a
  // fresh row; without this sync the popup would still show whatever we
  // optimistically wrote into localUser at submit time.
  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  // Store original values when editing starts (excluding password)
  const originalValues = useRef<Partial<Pick<UserDTO, UserEditableField>>>({});

  // Store temporary edit values (this prevents the "Not set" bug)
  const [tempValues, setTempValues] = useState<
    Partial<Pick<UserDTO, UserEditableField>>
  >({});

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { nickname } = useParams<{ nickname: string }>();
  const navigate = useNavigate();

  // Two-step verification state. While `verify` is set, an OTP modal is shown
  // and the underlying field-edit form is hidden behind it. The kind decides
  // which confirm endpoint we hit on submit; pendingNewEmail is just for
  // display ("we sent a code to ...").
  const [verify, setVerify] = useState<
    | { kind: "email"; pendingNewEmail: string }
    | { kind: "password" }
    | null
  >(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySending, setVerifySending] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "self" | "friends" | "sent" | "received" | "none"
  >("none");
  const [friendRequestId, setFriendRequestId] = useState<number | null>(null);
  const [outgoingRequestId, setOutgoingRequestId] = useState<number | null>(null);

  // Block service hook
  const { blockUser, unblockUser, getBlockStatus, loading: blockLoading } = useBlockService();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockStatusLoaded, setBlockStatusLoaded] = useState(false);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'removeFriend' | 'block' | 'unblock' | 'cancelRequest';
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const isOwnProfile = currentUser?.id === localUser.id;

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!isOwnProfile && user.nickname) {
        try {
          // Fetch friend status
          console.log("Fetching friend status for:", user.nickname);
          const statusResponse = await getFriendStatus(user.nickname);
          console.log("Friend status response:", statusResponse);
          
          if (typeof statusResponse === 'object' && statusResponse !== null && 'status' in statusResponse) {
            const status = (statusResponse as any).status;
            const requestId = (statusResponse as any).requestId;
            
            console.log("Setting friend status:", status);
            console.log("Setting request ID:", requestId);
            
            setFriendStatus(status);
            
            // Set the correct ID based on status
            if (status === 'sent') {
              setOutgoingRequestId(requestId || null);
              setFriendRequestId(null); // Clear incoming request ID
            } else if (status === 'received') {
              setFriendRequestId(requestId || null);
              setOutgoingRequestId(null); // Clear outgoing request ID
            } else {
              setFriendRequestId(null);
              setOutgoingRequestId(null);
            }
          } else {
            console.log("Setting friend status (simple):", statusResponse);
            setFriendStatus(statusResponse as "self" | "friends" | "sent" | "received" | "none");
            // Clear both IDs for simple response
            setFriendRequestId(null);
            setOutgoingRequestId(null);
          }

          // Fetch block status
          const blockStatus = await getBlockStatus(user.nickname);
          setIsBlocked(blockStatus.blockedByMe);
          setBlockStatusLoaded(true);
        } catch (err) {
          console.error("Failed to fetch statuses:", err);
          setBlockStatusLoaded(true);
        }
      }
    };

    fetchStatuses();
  }, [user.nickname, isOwnProfile, getBlockStatus]);

  const triggerHighlight = (field: string) => {
    setUpdatedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(field);
      return newSet;
    });
    setTimeout(() => {
      setUpdatedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }, 5000);
  };

  const startEditing = (field: EditableField) => {
    // Store the original value before editing (only for non-password fields)
    if (field !== "password") {
      originalValues.current[field as UserEditableField] =
        localUser[field as UserEditableField];
      // Initialize temp value with current value
      setTempValues((prev) => ({
        ...prev,
        [field]: localUser[field as UserEditableField],
      }));
    }
    setEditField(field);
  };

  const cancelEditing = (field: EditableField) => {
    // Clear temp values and don't modify the actual user data
    if (field !== "password") {
      setTempValues((prev) => {
        const newTemp = { ...prev };
        delete newTemp[field as UserEditableField];
        return newTemp;
      });
      delete originalValues.current[field as UserEditableField];
    }

    // Reset states
    setEditField(null);
    setError((prev) => ({ ...prev, [field]: null }));

    // Clear password form if canceling password edit
    if (field === "password") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleChange = (field: EditableField, value: string) => {
    if (field === "password") {
      return;
    }
    // Update temp values instead of user data directly
    setTempValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (field: EditableField) => {
    setLoading(true);
    setError((prev) => ({ ...prev, [field]: null }));

    try {
      let response: FieldUpdateResponse | FieldUpdateResponse[];

      if (field === "email") {
        const emailValue = tempValues.email || localUser.email;
        // Don't touch local state — server will send a code to the NEW
        // address; the actual swap happens after the user types it back.
        await requestEmailChange(emailValue);
        setVerify({ kind: "email", pendingNewEmail: emailValue });
        setVerifyCode("");
        setVerifyError(null);
        setEditField(null);
        setLoading(false);
        return;
      } else if (field === "name" || field === "surname") {
        const nameValue = tempValues.name || localUser.name;
        const surnameValue = tempValues.surname || localUser.surname;
        response = await updateNameSurname(nameValue, surnameValue);
        (response as FieldUpdateResponse[]).forEach((fieldUpdate) => {
          setUser((prev) =>
            prev ? { ...prev, [fieldUpdate.field]: fieldUpdate.value } : prev
          );
          setLocalUser((prev) => ({
            ...prev,
            [fieldUpdate.field]: fieldUpdate.value,
          }));
        });
      } else if (field === "nickname") {
        const nicknameValue = tempValues.nickname || localUser.nickname;
        const oldNickname = localUser.nickname;
        response = await updateNickname(nicknameValue);
        const newNickname = (response as FieldUpdateResponse).value;
        setUser((prev) => (prev ? { ...prev, nickname: newNickname } : prev));
        setLocalUser((prev) => ({ ...prev, nickname: newNickname }));
        // Profile URL was keyed on the old nickname; swap it so a refresh or
        // a follow-up navigation doesn't 404 against a name the server no
        // longer has.
        if (oldNickname !== newNickname && nickname === oldNickname) {
          navigate(`/profile/${newNickname}`, { replace: true });
        }
      }

      // Clear original value and temp value since update was successful
      if (field !== "password") {
        delete originalValues.current[field as UserEditableField];
        setTempValues((prev) => {
          const newTemp = { ...prev };
          delete newTemp[field as UserEditableField];
          return newTemp;
        });
      }

      triggerHighlight(field);
      setEditField(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Update failed";
      setError((prev) => ({ ...prev, [field]: errorMessage }));

      // Don't revert on error - keep the temp value for user to correct
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    try {
      setLoading(true);
      const response = await uploadPhoto(e.target.files[0]);
      setUser((prev) =>
        prev ? { ...prev, profileImageUrl: response.value } : prev
      );
      setLocalUser((prev) => ({ ...prev, profileImageUrl: response.value }));
      triggerHighlight("photo");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError((prev) => ({ ...prev, photo: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError((prev) => ({ ...prev, password: "Passwords do not match" }));
      return;
    }
    setLoading(true);
    setError((prev) => ({ ...prev, password: null }));
    try {
      // Server validates the current password, queues the new hash, and
      // emails a code to the current address. We pop the OTP modal — the
      // password isn't actually rotated until the code comes back.
      await requestPasswordChange(currentPassword, newPassword);
      setVerify({ kind: "password" });
      setVerifyCode("");
      setVerifyError(null);
      setEditField(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Password update failed";
      setError((prev) => ({ ...prev, password: errorMessage }));
    }
    setLoading(false);
  };

  // Submit the OTP for whichever change is pending and apply local state.
  const handleVerifySubmit = async () => {
    if (!verify) return;
    const code = verifyCode.trim();
    if (code.length !== 6) {
      setVerifyError("Enter the 6-digit code from your email");
      return;
    }
    setVerifySending(true);
    setVerifyError(null);
    try {
      if (verify.kind === "email") {
        const r = await confirmEmailChange(code);
        const newEmail = r.value;
        setUser((prev) => (prev ? { ...prev, email: newEmail } : prev));
        setLocalUser((prev) => ({ ...prev, email: newEmail }));
        triggerHighlight("email");
      } else {
        await confirmPasswordChange(code);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        triggerHighlight("password");
      }
      setVerify(null);
      setVerifyCode("");
      // Clean up tempValues for email so the field reverts to the saved value
      // if the user reopens the editor.
      setTempValues((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifySending(false);
    }
  };

  const handleVerifyCancel = () => {
    setVerify(null);
    setVerifyCode("");
    setVerifyError(null);
  };

  // Enhanced onClose that clears temp values
  const handleClose = () => {
    if (editField && editField !== "password") {
      cancelEditing(editField);
    } else if (editField === "password") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditField(null);
    }
    // Clear all temp values
    setTempValues({});
    onClose();
  };

  // Helper function to get the display value (temp value if editing, otherwise user value)
  const getFieldValue = (field: UserEditableField): string => {
    if (editField === field && tempValues[field] !== undefined) {
      return tempValues[field] || "";
    }
    return localUser[field] || "";
  };

  const renderField = (
    label: string,
    field: EditableField,
    type: string = "text"
  ) => {
    const isEditing = editField === field;
    const highlight = updatedFields.has(field);
    const displayValue =
      field !== "password" ? getFieldValue(field as UserEditableField) : "";
    const canEdit = isOwnProfile;

    return (
      <div className="group">
        <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">
          {label}
        </label>
        {isEditing && canEdit ? (
          <div className="flex items-center gap-3">
            <input
              type={type}
              value={displayValue}
              onChange={(e) => handleChange(field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit(field);
                } else if (e.key === "Escape") {
                  cancelEditing(field);
                }
              }}
              className={`bg-white/10 text-white rounded-lg px-4 py-3 flex-1 border transition-all duration-300 ${
                highlight
                  ? "bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20"
                  : "border-white/20"
              } focus:border-white/40 focus:outline-none backdrop-blur-sm`}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => handleSubmit(field)}
              className="bg-indigo-500/80 hover:bg-indigo-500 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Check size={16} />
              )}
            </button>
            <button
              onClick={() => cancelEditing(field)}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
              disabled={loading}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border transition-all duration-300 backdrop-blur-sm ${
              highlight
                ? "bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20"
                : "border-white/10"
            }`}
          >
            <span className="text-white">{displayValue || "Not set"}</span>
            {canEdit && (
              <button
                onClick={() => startEditing(field)}
                className="text-gray-300 hover:text-white p-2 transition-colors duration-200"
              >
                <Edit3 size={16} />
              </button>
            )}
          </div>
        )}
        {error[field] && (
          <p className="text-red-400 text-sm mt-2">{error[field]}</p>
        )}
      </div>
    );
  };

  const renderPasswordForm = () => (
    // Wrap the inputs in a <form> with autoComplete="off" so Chrome doesn't
    // treat the popup as a login form and start scattering the saved email
    // into nearby <input>s (the "search bar gets autofilled" bug). The
    // off-screen decoy username + password fields below absorb whichever
    // autofill Chrome insists on dispensing — empty values land there
    // instead of into our real fields.
    <form
      className="space-y-6"
      autoComplete="off"
      onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }}
    >
      {/* autofill decoys — must come before real fields, must not be
          display:none (Chrome ignores those) */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        tabIndex={-1}
        aria-hidden
        style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        tabIndex={-1}
        aria-hidden
        style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
      />

      <div className="space-y-4">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancelEditing("password")}
          autoComplete="new-password"
          name="profile-current-password"
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancelEditing("password")}
          autoComplete="new-password"
          name="profile-new-password"
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handlePasswordSubmit();
            } else if (e.key === "Escape") {
              cancelEditing("password");
            }
          }}
          autoComplete="new-password"
          name="profile-confirm-password"
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
      </div>

      {error.password && (
        <p className="text-red-400 text-sm">{error.password}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 p-3 rounded-lg text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Check size={16} />
          )}
        </button>
        <button
          type="button"
          onClick={() => cancelEditing("password")}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
          disabled={loading}
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );

  const handleAddFriend = async () => {
    try {
      console.log("Sending friend request to:", user.nickname);
      const response = await sendFriendRequest(user.nickname);
      console.log("Friend request response:", response);
      
      // Handle the structured response from backend
      if (response && typeof response === 'object' && 'status' in response) {
        console.log("Response status:", response.status);
        
        if (response.status === "sent") {
          // Request was sent successfully
          setFriendStatus("sent");
          
          // Make sure to set the outgoing request ID
          if ('requestId' in response && response.requestId) {
            setOutgoingRequestId(response.requestId);
            console.log("Set outgoing request ID:", response.requestId);
          } else {
            console.error("Response status is 'sent' but no requestId found:", response);
            // Try to fetch status to get the ID
            try {
              const statusResponse = await getFriendStatus(user.nickname);
              if (typeof statusResponse === 'object' && statusResponse !== null && 'requestId' in statusResponse) {
                setOutgoingRequestId((statusResponse as any).requestId);
                console.log("Got request ID from status:", (statusResponse as any).requestId);
              }
            } catch (statusErr) {
              console.error("Failed to fetch status after sending request:", statusErr);
            }
          }
          
        } else if (response.status === "friends") {
          // Became friends immediately (reverse request existed)
          setFriendStatus("friends");
          setOutgoingRequestId(null);
          setFriendRequestId(null);
          console.log("Became friends immediately");
          
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
          const statusResponse = await getFriendStatus(user.nickname);
          if (typeof statusResponse === 'object' && statusResponse !== null && 'requestId' in statusResponse) {
            setOutgoingRequestId((statusResponse as any).requestId);
            console.log("Got request ID from status fallback:", (statusResponse as any).requestId);
          }
        } catch (statusErr) {
          console.error("Failed to fetch status in fallback:", statusErr);
        }
      }
      
    } catch (err) {
      console.error("Failed to send friend request:", err);
      // Don't change UI state on error - let user try again
      const errorMessage = err instanceof Error ? err.message : "Failed to send friend request.";
      setError(prev => ({ 
        ...prev, 
        general: errorMessage 
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
      console.log("Accept request successful");
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
      console.log("Reject request successful");
    } catch (err) {
      console.error("Failed to reject friend request:", err);
      // Even if API fails, keep the UI updated for user feedback
    }
  };

  const handleRemoveFriend = async () => {
    // Immediately update UI (optimistic update)
    setFriendStatus("none");

    try {
      await removeFriend(user.id);
      console.log("Friend removed successfully");
    } catch (err) {
      console.error("Failed to remove friend:", err);
      // Revert the optimistic update on error
      setFriendStatus("friends");
      alert("Failed to remove friend.");
    }
  };

  // Replace the handleToggleBlock function in ProfilePopup with this fixed version:

const handleToggleBlock = async () => {
  const wasBlocked = isBlocked;
  
  // Store original values for potential reversion
  const originalFriendStatus = friendStatus;
  const originalOutgoingRequestId = outgoingRequestId;
  const originalFriendRequestId = friendRequestId;
  
  setError(prev => ({ ...prev, block: null }));

  try {
    if (wasBlocked) {
      // Unblocking - simpler case
      setIsBlocked(false);
      await unblockUser(user.id);
      console.log("User unblocked successfully");
    } else {
      // Blocking - need to handle all relationship states first
      
      // Step 1: Handle existing relationships BEFORE blocking
      
      // If they are friends, remove friendship first
      if (friendStatus === "friends") {
        console.log("Removing friendship before block");
        try {
          await removeFriend(user.id);
          console.log("Friendship removed successfully before block");
        } catch (removeErr) {
          console.error("Failed to remove friend before block:", removeErr);
          // Don't throw here - we still want to proceed with the block
        }
      }
      
      // If there's an outgoing request, cancel it
      if (outgoingRequestId) {
        console.log("Cancelling outgoing request before block:", outgoingRequestId);
        try {
          await cancelOutgoingRequest(outgoingRequestId);
          console.log("Outgoing friend request cancelled successfully before block");
        } catch (cancelErr) {
          console.error("Failed to cancel outgoing request before block:", cancelErr);
          // Don't throw here - we still want to proceed with the block
        }
      }
      
      // If there's an incoming request, reject it
      if (friendRequestId) {
        console.log("Rejecting incoming request before block:", friendRequestId);
        try {
          await respondToRequest(friendRequestId, false);
          console.log("Incoming friend request rejected successfully before block");
        } catch (rejectErr) {
          console.error("Failed to reject incoming request before block:", rejectErr);
          // Don't throw here - we still want to proceed with the block
        }
      }
      
      // Update UI state immediately after handling relationships
      setFriendStatus("none");
      setFriendRequestId(null);
      setOutgoingRequestId(null);
      setIsBlocked(true);
      
      // Step 2: Now block the user
      await blockUser(user.id);
      console.log("User blocked successfully");
    }
  } catch (err) {
    console.error("Failed to toggle block:", err);
    
    // Revert all optimistic updates on error
    setIsBlocked(wasBlocked);
    setFriendStatus(originalFriendStatus);
    setOutgoingRequestId(originalOutgoingRequestId);
    setFriendRequestId(originalFriendRequestId);
    
    setError(prev => ({ 
      ...prev, 
      block: `Failed to ${wasBlocked ? 'unblock' : 'block'} user` 
    }));
  }
};

  const showRemoveFriendConfirmation = () => {
    setConfirmationModal({
      isOpen: true,
      type: 'removeFriend',
      message: `Are you sure you want to remove ${localUser.name || localUser.nickname} from your friends?`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleRemoveFriend();
      }
    });
  };

  const showBlockConfirmation = () => {
    const action = isBlocked ? 'unblock' : 'block';
    const hasOutgoingRequest = outgoingRequestId !== null;
    
    setConfirmationModal({
      isOpen: true,
      type: isBlocked ? 'unblock' : 'block',
      message: `Are you sure you want to ${action} ${localUser.name || localUser.nickname}?${
        !isBlocked && (friendStatus === 'friends' || hasOutgoingRequest) 
          ? " This will also remove them from your friends and cancel any pending friend requests." 
          : ""
      }`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleToggleBlock();
      }
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
      console.log("Cancelling request with ID:", originalRequestId);
      await cancelOutgoingRequest(originalRequestId);
      console.log("Friend request cancelled successfully");
    } catch (err) {
      console.error("Failed to cancel friend request:", err);
      // Revert the optimistic update on error
      setFriendStatus(originalStatus);
      setOutgoingRequestId(originalRequestId);
      
      // Show error to user
      setError(prev => ({ 
        ...prev, 
        general: "Failed to cancel friend request. Please try again." 
      }));
    }
  };

  const showCancelRequestConfirmation = () => {
    setConfirmationModal({
      isOpen: true,
      type: 'cancelRequest',
      message: `Are you sure you want to cancel your friend request to ${localUser.name || localUser.nickname}?`,
      onConfirm: () => {
        setConfirmationModal(null);
        handleCancelRequest();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div
        className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl h-[740px] flex overflow-hidden border border-white/20 transition-all duration-300
        ${
          isOwnProfile ? "w-full max-w-6xl" : "w-full max-w-md justify-center"
        }`}
      >
        {/* Sol kısım sadece kendi profilin ise görünür */}
        {isOwnProfile && (
          <div className="w-3/5 flex flex-col">
            <div className="px-12 pt-4 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white leading-relaxed">
                  {editField === "password"
                    ? "Change Password"
                    : "Profile Settings"}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-12 pt-6 overflow-y-auto">
              {error.general && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  <p className="text-red-300">{error.general}</p>
                </div>
              )}

              {editField === "password" ? (
                renderPasswordForm()
              ) : (
                <div className="space-y-8">
                  {renderField("First Name", "name")}
                  {renderField("Last Name", "surname")}
                  {renderField("Username", "nickname")}
                  {renderField("Email Address", "email", "email")}

                  {/* Sadece kendi profilinde şifre alanı görünür */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">
                      Password
                    </label>
                    <div
                      className={`flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border backdrop-blur-sm transition-all duration-300 ${
                        updatedFields.has("password")
                          ? "bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20"
                          : "border-white/10"
                      }`}
                    >
                      <span className="text-gray-300">••••••••</span>
                      <button
                        onClick={() => startEditing("password")}
                        className="text-gray-300 hover:text-white p-2 transition-colors duration-200"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sağ kısım - her zaman görünür */}
        <div
          className={`${
            isOwnProfile ? "w-2/5" : "w-full"
          } bg-white/5 backdrop-blur-sm flex flex-col p-6 border-l border-white/10`}
        >
          {!isOwnProfile && (
            <div className="flex justify-end mb-2">
              <button
                onClick={handleClose}
                className="text-gray-300 hover:text-white p-2 rounded-lg transition-colors duration-200"
              >
                <X size={24} />
              </button>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center mb-6">
            <div className="relative w-full aspect-square max-h-full">
              <img
                src={
                  localUser.profileImageUrl || "https://via.placeholder.com/300"
                }
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
                    onChange={handlePhotoUpload}
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
              {localUser.name} {localUser.surname}
            </h1>
            <p className="text-lg md:text-xl mb-4 text-gray-200 truncate">
              @{localUser.nickname}
            </p>

            {/* Action buttons - only show for other users' profiles */}
            {!isOwnProfile && blockStatusLoaded && (
              <div className="mt-4 space-y-3">
                {/* Friend buttons - only show if user is not blocked */}
                {!isBlocked && (
                  <div className="flex justify-center">
                    {friendStatus === "none" && (
                      <button
                        onClick={handleAddFriend}
                        className="bg-indigo-500/80 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
                      >
                        Add Friend
                      </button>
                    )}
                    
                    {friendStatus === "sent" && (
                      <button
                        onClick={showCancelRequestConfirmation}
                        className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
                      >
                        <X size={18} />
                        Cancel Request
                      </button>
                    )}
                    
                    {friendStatus === "friends" && (
                      <button
                        onClick={showRemoveFriendConfirmation}
                        className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
                      >
                        <UserMinus size={18} />
                        Remove Friend
                      </button>
                    )}
                    
                    {friendStatus === "received" && (
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={handleAcceptRequest}
                          className="bg-green-600/80 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
                        >
                          <Check size={18} />
                          Accept
                        </button>
                        <button
                          onClick={handleRejectRequest}
                          className="bg-red-600/80 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center gap-2"
                        >
                          <X size={18} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Block/Unblock button - moved below friend buttons */}
                <div className="flex justify-center">
                  <button
                    onClick={showBlockConfirmation}
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
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-gray-200 mb-6 leading-relaxed">
              {confirmationModal.message}
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
                className={`font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm ${
                  confirmationModal.type === 'block' 
                    ? 'bg-orange-600/80 hover:bg-orange-600 text-white'
                    : confirmationModal.type === 'unblock'
                    ? 'bg-gray-600/80 hover:bg-gray-600 text-white'
                    : 'bg-red-600/80 hover:bg-red-600 text-white'
                }`}
              >
                {confirmationModal.type === 'removeFriend' ? 'Remove' : 
                 confirmationModal.type === 'block' ? 'Block' :
                 confirmationModal.type === 'unblock' ? 'Unblock' : 'Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP verification overlay — shown after a request-* call. The actual
          field stays unchanged on the profile until the code is confirmed. */}
      {verify && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-white text-lg font-semibold mb-2">
              {verify.kind === "email" ? "Confirm new email" : "Confirm password change"}
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              {verify.kind === "email"
                ? <>We sent a 6-digit code to <span className="text-white">{verify.pendingNewEmail}</span>. Enter it below to apply the change.</>
                : <>We sent a 6-digit code to your current email. Enter it below to apply the new password.</>}
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifySubmit();
                if (e.key === "Escape") handleVerifyCancel();
              }}
              placeholder="123456"
              className="bg-white/10 text-white text-center tracking-[0.4em] text-xl rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none mb-3"
              autoFocus
            />
            {verifyError && (
              <p className="text-red-400 text-sm mb-3">{verifyError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleVerifySubmit}
                disabled={verifySending || verifyCode.length !== 6}
                className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 disabled:opacity-50 p-3 rounded-lg text-white font-medium"
              >
                {verifySending ? "Verifying..." : "Confirm"}
              </button>
              <button
                onClick={handleVerifyCancel}
                disabled={verifySending}
                className="bg-white/10 hover:bg-white/20 px-4 rounded-lg text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
