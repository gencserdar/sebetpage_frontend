import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  uploadPhoto,
  requestEmailChange,
  confirmEmailChange,
  updateNameSurname,
  updateNickname,
  requestPasswordChange,
  confirmPasswordChange,
  FieldUpdateResponse,
  freezeAccount,
} from "../../services/profileService";
import { useUser } from "../../context/UserContext";
import { useProfileNavigation } from "../../hooks/useProfileNavigation";
import { UserDTO } from "../../types/userDTO";
import {
  EditableField,
  ErrorState,
  UserEditableField,
  VerifyState,
} from "./types";

export interface UseProfileEditingParams {
  user: UserDTO;
  onClose: () => void;
}

export interface UseProfileEditingReturn {
  editField: EditableField | null;
  error: ErrorState;
  setError: React.Dispatch<React.SetStateAction<ErrorState>>;
  loading: boolean;
  updatedFields: Set<string>;
  localUser: UserDTO;
  tempValues: Partial<Pick<UserDTO, UserEditableField>>;
  currentPassword: string;
  setCurrentPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  verify: VerifyState;
  verifyCode: string;
  setVerifyCode: React.Dispatch<React.SetStateAction<string>>;
  verifyError: string | null;
  verifySending: boolean;
  startEditing: (field: EditableField) => void;
  cancelEditing: (field: EditableField) => void;
  handleChange: (field: EditableField, value: string) => void;
  handleSubmit: (field: EditableField) => Promise<void>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePasswordSubmit: () => Promise<void>;
  handleVerifySubmit: () => Promise<void>;
  handleVerifyCancel: () => void;
  handleClose: () => void;
  getFieldValue: (field: UserEditableField) => string;
  triggerHighlight: (field: string) => void;
  handleFreezeAccount: () => void;
  confirmFreezeAccount: () => Promise<void>;
  freezeConfirmOpen: boolean;
  closeFreezeConfirm: () => void;
  freezeLoading: boolean;
}

export function useProfileEditing({
  user,
  onClose,
}: UseProfileEditingParams): UseProfileEditingReturn {
  const { setUser, logout } = useUser();
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [error, setError] = useState<ErrorState>({});
  const [loading, setLoading] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
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
  const { replaceProfileNickname } = useProfileNavigation();

  // Two-step verification state. While `verify` is set, an OTP modal is shown
  // and the underlying field-edit form is hidden behind it. The kind decides
  // which confirm endpoint we hit on submit; pendingNewEmail is just for
  // display ("we sent a code to ...").
  const [verify, setVerify] = useState<VerifyState>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySending, setVerifySending] = useState(false);

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
          replaceProfileNickname(newNickname);
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

  const handleFreezeAccount = () => {
    setError({});
    setFreezeConfirmOpen(true);
  };

  const closeFreezeConfirm = () => {
    if (!freezeLoading) setFreezeConfirmOpen(false);
  };

  const confirmFreezeAccount = async () => {
    setFreezeLoading(true);
    setError({});
    try {
      await freezeAccount();
      setFreezeConfirmOpen(false);
      onClose();
      await logout();
    } catch (err) {
      setError({
        general: err instanceof Error ? err.message : "Could not freeze account",
      });
    } finally {
      setFreezeLoading(false);
    }
  };

  return {
    editField,
    error,
    setError,
    loading,
    updatedFields,
    localUser,
    tempValues,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    verify,
    verifyCode,
    setVerifyCode,
    verifyError,
    verifySending,
    startEditing,
    cancelEditing,
    handleChange,
    handleSubmit,
    handlePhotoUpload,
    handlePasswordSubmit,
    handleVerifySubmit,
    handleVerifyCancel,
    handleClose,
    getFieldValue,
    triggerHighlight,
    handleFreezeAccount,
    confirmFreezeAccount,
    freezeConfirmOpen,
    closeFreezeConfirm,
    freezeLoading,
  };
}
