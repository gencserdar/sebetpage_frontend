import { Edit3, X } from "lucide-react";
import ProfileField from "./ProfileField";
import ProfilePasswordForm from "./ProfilePasswordForm";
import {
  EditableField,
  ErrorState,
  UserEditableField,
} from "./types";

export interface ProfileSettingsPanelProps {
  editField: EditableField | null;
  error: ErrorState;
  loading: boolean;
  updatedFields: Set<string>;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  getFieldValue: (field: UserEditableField) => string;
  onClose: () => void;
  onStartEditing: (field: EditableField) => void;
  onCancelEditing: (field: EditableField) => void;
  onFieldChange: (field: UserEditableField, value: string) => void;
  onFieldSubmit: (field: EditableField) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordSubmit: () => void;
  onPasswordCancel: () => void;
  onFreezeAccount: () => void;
  freezeLoading?: boolean;
}

export default function ProfileSettingsPanel({
  editField,
  error,
  loading,
  updatedFields,
  currentPassword,
  newPassword,
  confirmPassword,
  getFieldValue,
  onClose,
  onStartEditing,
  onCancelEditing,
  onFieldChange,
  onFieldSubmit,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordSubmit,
  onPasswordCancel,
  onFreezeAccount,
  freezeLoading = false,
}: ProfileSettingsPanelProps) {
  const fieldProps = {
    canEdit: true,
    loading,
    onChange: onFieldChange,
    onSubmit: onFieldSubmit,
    onStartEditing,
    onCancel: onCancelEditing,
  };

  return (
    <div className="w-3/5 flex flex-col">
      <div className="px-12 pt-4 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white leading-relaxed">
            {editField === "password" ? "Change Password" : "Profile Settings"}
          </h2>
          <button
            onClick={onClose}
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
          <ProfilePasswordForm
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            loading={loading}
            error={error.password}
            onCurrentPasswordChange={onCurrentPasswordChange}
            onNewPasswordChange={onNewPasswordChange}
            onConfirmPasswordChange={onConfirmPasswordChange}
            onSubmit={onPasswordSubmit}
            onCancel={onPasswordCancel}
          />
        ) : (
          <div className="space-y-8">
            <ProfileField
              label="First Name"
              field="name"
              isEditing={editField === "name"}
              highlight={updatedFields.has("name")}
              displayValue={getFieldValue("name")}
              error={error.name}
              {...fieldProps}
            />
            <ProfileField
              label="Last Name"
              field="surname"
              isEditing={editField === "surname"}
              highlight={updatedFields.has("surname")}
              displayValue={getFieldValue("surname")}
              error={error.surname}
              {...fieldProps}
            />
            <ProfileField
              label="Username"
              field="nickname"
              isEditing={editField === "nickname"}
              highlight={updatedFields.has("nickname")}
              displayValue={getFieldValue("nickname")}
              error={error.nickname}
              {...fieldProps}
            />
            <ProfileField
              label="Email Address"
              field="email"
              type="email"
              isEditing={editField === "email"}
              highlight={updatedFields.has("email")}
              displayValue={getFieldValue("email")}
              error={error.email}
              {...fieldProps}
            />

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
                  onClick={() => onStartEditing("password")}
                  className="text-gray-300 hover:text-white p-2 transition-colors duration-200"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {editField !== "password" && (
          <div className="mt-10 pt-8 border-t border-white/10">
            <button
              type="button"
              onClick={onFreezeAccount}
              disabled={freezeLoading || loading}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              {freezeLoading ? "Freezing..." : "Freeze account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
