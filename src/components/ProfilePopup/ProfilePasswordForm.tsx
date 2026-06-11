import { Check, X } from "lucide-react";
import PasswordRequirements from "../PasswordRequirements";
import { isPasswordValid } from "../../utils/passwordPolicy";

export interface ProfilePasswordFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error?: string | null;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ProfilePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  loading,
  error,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onCancel,
}: ProfilePasswordFormProps) {
  return (
    <form
      className="space-y-6"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="text"
        name="username"
        autoComplete="username"
        tabIndex={-1}
        aria-hidden
        style={{
          position: "absolute",
          opacity: 0,
          height: 0,
          width: 0,
          pointerEvents: "none",
        }}
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        tabIndex={-1}
        aria-hidden
        style={{
          position: "absolute",
          opacity: 0,
          height: 0,
          width: 0,
          pointerEvents: "none",
        }}
      />

      <div className="space-y-4">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => onCurrentPasswordChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
          autoComplete="new-password"
          name="profile-current-password"
          className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
        />
        <div className="space-y-2">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onCancel()}
            autoComplete="new-password"
            name="profile-new-password"
            className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
          />
          <PasswordRequirements password={newPassword} />
        </div>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
            autoComplete="new-password"
            name="profile-confirm-password"
            className="bg-white/10 text-white rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none transition-colors duration-200 backdrop-blur-sm"
          />
          <PasswordRequirements
            password={newPassword}
            confirmPassword={confirmPassword}
            matchOnly
            visible={confirmPassword.length > 0}
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 disabled:bg-indigo-500/40 disabled:cursor-not-allowed p-3 rounded-lg text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
          disabled={
            loading ||
            !currentPassword ||
            !isPasswordValid(newPassword) ||
            newPassword !== confirmPassword
          }
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Check size={16} />
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
          disabled={loading}
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );
}
