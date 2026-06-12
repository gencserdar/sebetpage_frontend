import { useUser } from "../../context/UserContext";
import { UserDTO } from "../../types/userDTO";
import BioEditor from "../Profile/BioEditor";
import SocialLinksEditor from "../Profile/SocialLinksEditor";
import { useProfileSettings } from "../Profile/useProfileSettings";
import ProfileCardGridEditor from "../ProfileCard/ProfileCardGridEditor";
import SettingsSectionHeader from "./SettingsSectionHeader";

function ProfileSettingsSectionInner({ user }: { user: UserDTO }) {
  const settings = useProfileSettings(user.id, { editable: true });

  if (settings.loading) {
    return (
      <div>
        <SettingsSectionHeader
          title="Profile"
          description="Write your bio, link your accounts, and design your canvas."
        />
        <div className="mb-6 h-[7.5rem] animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mb-6 h-[34rem] animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-52 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <SettingsSectionHeader
        title="Profile"
        description="Write your bio, link your accounts, and design your canvas."
      />

      {(settings.error || settings.saving) && (
        <div className="mb-3" aria-live="polite">
          {settings.error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {settings.error}
            </p>
          ) : (
            <p className="px-1 text-xs text-gray-500">Saving…</p>
          )}
        </div>
      )}

      <BioEditor bio={settings.bio} onBioChange={settings.setBio} />

      <ProfileCardGridEditor
        widgets={settings.widgets}
        onAddWidget={settings.addWidget}
        onRemoveWidget={settings.removeWidget}
        onUpdateWidget={settings.updateWidget}
      />

      <SocialLinksEditor
        socialLinks={settings.socialLinks}
        onAdd={settings.addSocialLink}
        onUpdate={settings.updateSocialLink}
        onRemove={settings.removeSocialLink}
      />
    </div>
  );
}

export default function ProfileSettingsSection() {
  const { user } = useUser();

  if (!user) return null;

  return <ProfileSettingsSectionInner user={user} />;
}
