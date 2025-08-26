import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Edit3, Camera, Check, X, UserMinus, Shield, ShieldOff } from "lucide-react";
import { 
  uploadPhoto, 
  updateEmail, 
  updateNameSurname, 
  updateNickname,
  changePassword,
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
        response = await updateEmail(emailValue);
        const newEmail = (response as FieldUpdateResponse).value;
        setUser((prev) => (prev ? { ...prev, email: newEmail } : prev));
        setLocalUser((prev) => ({ ...prev, email: newEmail }));
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
        response = await updateNickname(nicknameValue);
        const newNickname = (response as FieldUpdateResponse).value;
        setUser((prev) => (prev ? { ...prev, nickname: newNickname } : prev));
        setLocalUser((prev) => ({ ...prev, nickname: newNickname }));
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
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      triggerHighlight("password");
      setEditField(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Password update failed";
      setError((prev) => ({ ...prev, password: errorMessage }));
    }
    setLoading(false);
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
    <div className="space-y-6">
      <div className="space-y-4">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancelEditing("password")}
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancelEditing("password")}
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
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
      </div>

      {error.password && (
        <p className="text-red-400 text-sm">{error.password}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handlePasswordSubmit}
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
          onClick={() => cancelEditing("password")}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
          disabled={loading}
        >
          <X size={16} />
        </button>
      </div>
    </div>
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
        // Blocking - need to cancel friend request first, then block
        
        // Step 1: Cancel any existing friend request BEFORE blocking
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
        
        // Update UI state immediately after successful cancellation (or attempt)
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <label className="absolute bottom-4 right-4 cursor-pointer">
                  <div className="bg-white/20 hover:bg-white/30 p-3 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm">
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Camera size={18} />
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
    </div>
  );
}
