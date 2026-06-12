import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { UserDTO } from "../../types/userDTO";
import FreezeAccountConfirmModal from "../FreezeAccountConfirmModal";
import ProfileVerifyModal from "../ProfilePopup/ProfileVerifyModal";
import { useProfileEditing } from "../ProfilePopup/useProfileEditing";
import AccountSettingsPanel from "./AccountSettingsPanel";

interface AccountSettingsSectionInnerProps {
  user: UserDTO;
  onNavigateHome: () => void;
}

function AccountSettingsSectionInner({ user, onNavigateHome }: AccountSettingsSectionInnerProps) {
  const editing = useProfileEditing({ user, onClose: onNavigateHome });

  return (
    <>
      <AccountSettingsPanel
        editField={editing.editField}
        error={editing.error}
        loading={editing.loading}
        updatedFields={editing.updatedFields}
        currentPassword={editing.currentPassword}
        newPassword={editing.newPassword}
        confirmPassword={editing.confirmPassword}
        getFieldValue={editing.getFieldValue}
        onStartEditing={editing.startEditing}
        onCancelEditing={editing.cancelEditing}
        onFieldChange={editing.handleChange}
        onFieldSubmit={editing.handleSubmit}
        onCurrentPasswordChange={editing.setCurrentPassword}
        onNewPasswordChange={editing.setNewPassword}
        onConfirmPasswordChange={editing.setConfirmPassword}
        onPasswordSubmit={editing.handlePasswordSubmit}
        onPasswordCancel={() => editing.cancelEditing("password")}
        onFreezeAccount={editing.handleFreezeAccount}
        freezeLoading={editing.freezeLoading}
      />

      {editing.freezeConfirmOpen && (
        <FreezeAccountConfirmModal
          loading={editing.freezeLoading}
          onClose={editing.closeFreezeConfirm}
          onConfirm={editing.confirmFreezeAccount}
        />
      )}

      {editing.verify && (
        <ProfileVerifyModal
          verify={editing.verify}
          verifyCode={editing.verifyCode}
          verifyError={editing.verifyError}
          verifySending={editing.verifySending}
          onVerifyCodeChange={editing.setVerifyCode}
          onSubmit={editing.handleVerifySubmit}
          onCancel={editing.handleVerifyCancel}
        />
      )}
    </>
  );
}

export default function AccountSettingsSection() {
  const { user } = useUser();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <AccountSettingsSectionInner user={user} onNavigateHome={() => navigate("/")} />
  );
}
