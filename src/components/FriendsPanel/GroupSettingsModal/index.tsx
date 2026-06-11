import GroupSettingsActionsSection from "./GroupSettingsActionsSection";
import GroupSettingsDeleteConfirm from "./GroupSettingsDeleteConfirm";
import GroupSettingsDescriptionSection from "./GroupSettingsDescriptionSection";
import GroupSettingsHeader from "./GroupSettingsHeader";
import GroupSettingsHero from "./GroupSettingsHero";
import GroupSettingsMembersSection from "./GroupSettingsMembersSection";
import GroupSettingsTitleSection from "./GroupSettingsTitleSection";
import { useGroupSettings } from "./useGroupSettings";
import { GroupSettingsModalProps } from "./types";

export default function GroupSettingsModal(props: GroupSettingsModalProps) {
  const settings = useGroupSettings(props);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <style>
        {`
          .group-settings-scroll::-webkit-scrollbar { width: 8px; }
          .group-settings-scroll::-webkit-scrollbar-track { background: rgba(3,7,18,.75); border-radius: 999px; }
          .group-settings-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,.55); border-radius: 999px; }
          .group-settings-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.8); }
        `}
      </style>
      <div className="relative flex h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 text-white shadow-2xl">
        <GroupSettingsHeader onClose={settings.close} />

        <div
          className="group-settings-scroll flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.55) rgba(3,7,18,.75)" }}
        >
          {settings.detail ? (
            <div className="relative pb-5">
              <GroupSettingsHero
                detail={settings.detail}
                initial={settings.initial}
                canEditPhoto={settings.canEditPhoto}
                saving={settings.saving}
                fileInputRef={settings.fileInputRef}
                onUploadPhoto={settings.uploadPhoto}
              />

              <div className="relative z-10 -mt-28 bg-gray-950 pb-5 before:pointer-events-none before:absolute before:bottom-full before:left-0 before:right-0 before:h-28 before:bg-gradient-to-b before:from-transparent before:via-gray-950/70 before:to-gray-950 before:content-['']">
                <GroupSettingsTitleSection
                  displayName={settings.displayName}
                  editingTitle={settings.editingTitle}
                  titleDraft={settings.titleDraft}
                  canEditName={settings.canEditName}
                  saving={settings.saving}
                  onStartEdit={() => settings.setEditingTitle(true)}
                  onCancelEdit={() => settings.setEditingTitle(false)}
                  onTitleDraftChange={settings.setTitleDraft}
                  onSave={() => settings.saveGroupPatch({ title: settings.titleDraft })}
                />

                <div className="space-y-5 px-4 pt-5">
                  <GroupSettingsDescriptionSection
                    description={settings.detail.description || ""}
                    editingDescription={settings.editingDescription}
                    descriptionDraft={settings.descriptionDraft}
                    canEditDescription={settings.canEditDescription}
                    saving={settings.saving}
                    onStartEdit={() => settings.setEditingDescription(true)}
                    onCancelEdit={() => settings.setEditingDescription(false)}
                    onDescriptionDraftChange={settings.setDescriptionDraft}
                    onSave={() => settings.saveGroupPatch({ description: settings.descriptionDraft })}
                  />

                  <GroupSettingsMembersSection
                    detail={settings.detail}
                    filteredParticipants={settings.filteredParticipants}
                    memberSearch={settings.memberSearch}
                    onlineParticipantIds={settings.onlineParticipantIds}
                    permissionUserId={settings.permissionUserId}
                    permissionSyncingUserIds={settings.permissionSyncingUserIds}
                    saving={settings.saving}
                    canRemoveMembers={settings.canRemoveMembers}
                    isGroupAdmin={settings.isGroupAdmin}
                    canGrant={settings.canGrant}
                    meIsAdmin={settings.meIsAdmin}
                    onMemberSearchChange={settings.setMemberSearch}
                    onTogglePermissionPanel={(userId) =>
                      settings.setPermissionUserId(
                        settings.permissionUserId === userId ? null : userId
                      )
                    }
                    onRemoveParticipant={settings.removeParticipant}
                    onTogglePermission={settings.togglePermission}
                  />

                  <GroupSettingsActionsSection
                    detail={settings.detail}
                    saving={settings.saving}
                    meIsAdmin={settings.meIsAdmin}
                    error={settings.error}
                    onToggleMute={() =>
                      settings.updateParticipant(settings.detail!.me, { muted: !settings.detail!.me.muted })
                    }
                    onExitGroup={settings.exitGroup}
                    onOpenDeleteConfirm={() => settings.setConfirmDeleteOpen(true)}
                  />
                </div>
              </div>
            </div>
          ) : settings.loading ? (
            <div className="h-full min-h-[520px]" />
          ) : (
            <div className="py-8 text-center text-gray-500">Group not found.</div>
          )}
        </div>
      </div>

      {settings.confirmDeleteOpen && (
        <GroupSettingsDeleteConfirm
          deleteText={settings.deleteText}
          saving={settings.saving}
          onDeleteTextChange={settings.setDeleteText}
          onCancel={() => settings.setConfirmDeleteOpen(false)}
          onConfirm={settings.deleteGroup}
        />
      )}
    </div>
  );
}
