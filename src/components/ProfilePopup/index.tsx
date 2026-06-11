import { useUser } from "../../context/UserContext";
import ProfileConfirmationModal from "./ProfileConfirmationModal";
import ProfilePreviewPanel from "./ProfilePreviewPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";
import ProfileVerifyModal from "./ProfileVerifyModal";
import { ProfilePopupProps } from "./types";
import { useProfileEditing } from "./useProfileEditing";
import { useProfileSocial } from "./useProfileSocial";

export default function ProfilePopup({ onClose, user }: ProfilePopupProps) {
  const { user: currentUser } = useUser();
  const editing = useProfileEditing({ user, onClose });
  const isOwnProfile = currentUser?.id === editing.localUser.id;

  const social = useProfileSocial({
    profileUser: editing.localUser,
    isOwnProfile,
    setError: editing.setError,
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div
        className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl h-[740px] flex overflow-hidden border border-white/20 transition-all duration-300 ${
          isOwnProfile ? "w-full max-w-6xl" : "w-full max-w-md justify-center"
        }`}
      >
        {isOwnProfile && (
          <ProfileSettingsPanel
            editField={editing.editField}
            error={editing.error}
            loading={editing.loading}
            updatedFields={editing.updatedFields}
            currentPassword={editing.currentPassword}
            newPassword={editing.newPassword}
            confirmPassword={editing.confirmPassword}
            getFieldValue={editing.getFieldValue}
            onClose={editing.handleClose}
            onStartEditing={editing.startEditing}
            onCancelEditing={editing.cancelEditing}
            onFieldChange={editing.handleChange}
            onFieldSubmit={editing.handleSubmit}
            onCurrentPasswordChange={editing.setCurrentPassword}
            onNewPasswordChange={editing.setNewPassword}
            onConfirmPasswordChange={editing.setConfirmPassword}
            onPasswordSubmit={editing.handlePasswordSubmit}
            onPasswordCancel={() => editing.cancelEditing("password")}
          />
        )}

        <ProfilePreviewPanel
          user={editing.localUser}
          isOwnProfile={isOwnProfile}
          loading={editing.loading}
          updatedFields={editing.updatedFields}
          error={editing.error}
          friendStatus={social.friendStatus}
          isBlocked={social.isBlocked}
          blockStatusLoaded={social.blockStatusLoaded}
          blockLoading={social.blockLoading}
          onClose={editing.handleClose}
          onPhotoUpload={editing.handlePhotoUpload}
          onAddFriend={social.handleAddFriend}
          onCancelRequest={social.showCancelRequestConfirmation}
          onRemoveFriend={social.showRemoveFriendConfirmation}
          onAcceptRequest={social.handleAcceptRequest}
          onRejectRequest={social.handleRejectRequest}
          onBlockToggle={social.showBlockConfirmation}
        />
      </div>

      {social.confirmationModal?.isOpen && (
        <ProfileConfirmationModal
          modal={social.confirmationModal}
          onClose={social.closeConfirmationModal}
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
    </div>
  );
}
