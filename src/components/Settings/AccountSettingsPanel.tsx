import { Edit3, Snowflake, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import ProfileField from "../ProfilePopup/ProfileField";
import ProfilePasswordForm from "../ProfilePopup/ProfilePasswordForm";
import SettingsSectionHeader from "./SettingsSectionHeader";
import {
  EditableField,
  ErrorState,
  UserEditableField,
} from "../ProfilePopup/types";

export interface AccountSettingsPanelProps {
  editField: EditableField | null;
  error: ErrorState;
  loading: boolean;
  updatedFields: Set<string>;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  getFieldValue: (field: UserEditableField) => string;
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
  onDeleteAccount: () => void;
  freezeLoading?: boolean;
  deleteLoading?: boolean;
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
        {title}
      </h3>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export default function AccountSettingsPanel({
  editField,
  error,
  loading,
  updatedFields,
  currentPassword,
  newPassword,
  confirmPassword,
  getFieldValue,
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
  onDeleteAccount,
  freezeLoading = false,
  deleteLoading = false,
}: AccountSettingsPanelProps) {
  const fieldProps = {
    canEdit: true,
    loading,
    onChange: onFieldChange,
    onSubmit: onFieldSubmit,
    onStartEditing,
    onCancel: onCancelEditing,
  };

  if (editField === "password") {
    return (
      <div>
        <SettingsSectionHeader
          title="Change password"
          description="Use a strong password you don't use elsewhere."
        />

        {error.general && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-300">{error.general}</p>
          </div>
        )}

        <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
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
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsSectionHeader
        title="Account"
        description="Manage your credentials and account security."
      />

      {error.general && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-300">{error.general}</p>
        </div>
      )}

      <div className="max-w-xl space-y-4">
        <SettingsCard title="Personal info">
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
        </SettingsCard>

        <SettingsCard title="Sign-in">
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
            <label className="mb-2 block text-sm font-medium uppercase tracking-wider text-gray-400">
              Password
            </label>
            <div
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-all duration-300 ${
                updatedFields.has("password")
                  ? "border-green-400/50 bg-green-500/10 shadow-lg shadow-green-500/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <span className="text-gray-400">••••••••</span>
              <button
                type="button"
                onClick={() => onStartEditing("password")}
                className="rounded-md p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>
        </SettingsCard>

        <section className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
              <Snowflake size={18} className="text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white">Freeze account</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Temporarily hide your profile and go offline. You can unfreeze anytime by
                logging back in.
              </p>
              <button
                type="button"
                onClick={onFreezeAccount}
                disabled={freezeLoading || loading}
                className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {freezeLoading ? "Freezing..." : "Freeze account"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
              <Trash2 size={18} className="text-red-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white">Delete account</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Permanently remove your account data. Groups and communities stay
                open if other members remain.
              </p>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={deleteLoading || freezeLoading || loading}
                className="mt-4 rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
