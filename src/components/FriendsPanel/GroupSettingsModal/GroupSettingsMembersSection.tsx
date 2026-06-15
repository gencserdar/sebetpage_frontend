import { Check, Loader2, Search, Shield, UserMinus } from "lucide-react";
import {
  MessagingGroupDetail,
  MessagingGroupParticipant,
  MessagingGroupPermissions,
} from "../../../services/chatApiService";
import { permissionRows } from "./constants";

interface GroupSettingsMembersSectionProps {
  detail: MessagingGroupDetail;
  regularParticipants: MessagingGroupParticipant[];
  blockedParticipants: MessagingGroupParticipant[];
  memberSearch: string;
  onlineParticipantIds: Set<number>;
  permissionUserId: number | null;
  permissionSyncingUserIds: Set<number>;
  saving: boolean;
  canRemoveMembers: boolean;
  isGroupAdmin: (participant: MessagingGroupParticipant) => boolean;
  canGrant: (permission: keyof MessagingGroupPermissions) => boolean;
  meIsAdmin: boolean;
  onMemberSearchChange: (value: string) => void;
  onTogglePermissionPanel: (userId: number) => void;
  onRemoveParticipant: (participant: MessagingGroupParticipant) => void;
  onTogglePermission: (
    participant: MessagingGroupParticipant,
    key: keyof MessagingGroupPermissions
  ) => void;
  onOpenParticipantProfile: (nickname: string, userId: number) => void;
}

function MemberRow({
  p,
  detail,
  onlineParticipantIds,
  permissionUserId,
  permissionSyncingUserIds,
  saving,
  canRemoveMembers,
  isGroupAdmin,
  canGrant,
  meIsAdmin,
  blocked,
  onTogglePermissionPanel,
  onRemoveParticipant,
  onTogglePermission,
  onOpenParticipantProfile,
}: {
  p: MessagingGroupParticipant;
  detail: MessagingGroupDetail;
  onlineParticipantIds: Set<number>;
  permissionUserId: number | null;
  permissionSyncingUserIds: Set<number>;
  saving: boolean;
  canRemoveMembers: boolean;
  isGroupAdmin: (participant: MessagingGroupParticipant) => boolean;
  canGrant: (permission: keyof MessagingGroupPermissions) => boolean;
  meIsAdmin: boolean;
  blocked?: boolean;
  onTogglePermissionPanel: (userId: number) => void;
  onRemoveParticipant: (participant: MessagingGroupParticipant) => void;
  onTogglePermission: (
    participant: MessagingGroupParticipant,
    key: keyof MessagingGroupPermissions
  ) => void;
  onOpenParticipantProfile: (nickname: string, userId: number) => void;
}) {
  const admin = isGroupAdmin(p);
  const self = p.userId === detail.me.userId;
  const online = !p.blocksMe && (self || onlineParticipantIds.has(p.userId));

  const openProfile = () => onOpenParticipantProfile(p.nickname, p.userId);

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
        online
          ? "border-emerald-400/25 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={openProfile}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
        title={`View ${p.nickname}'s profile`}
      >
        <div className="relative shrink-0">
          <img
            src={p.profileImageUrl || "/default_pp.png"}
            alt="pfp"
            className="h-9 w-9 rounded-full object-cover"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-app-surface ${
              online ? "bg-emerald-400" : "bg-gray-500"
            }`}
            title={online ? "Online" : "Offline"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${online ? "text-emerald-100" : "text-gray-100"}`}>
            {p.nickname}
            {self && <span className="ml-1 text-gray-500">(you)</span>}
          </div>
          {blocked && <div className="text-xs text-amber-200/80">(blocked)</div>}
        </div>
      </button>

      {admin && (
        <span className="shrink-0 rounded-full border border-indigo-400/35 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100">
          Admin
        </span>
      )}

      {!blocked && !self && !admin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePermissionPanel(p.userId);
          }}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-emerald-950/50 hover:text-emerald-200"
          title="Permissions"
        >
          <Shield className="h-4 w-4" />
        </button>
      )}

      {canRemoveMembers && !admin && !self && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveParticipant(p);
          }}
          disabled={saving}
          className="rounded-lg p-1.5 text-red-300 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
          title="Remove user"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}

      {!blocked && permissionUserId === p.userId && (
        <div className="absolute right-2 top-11 z-10 w-64 rounded-xl border border-white/10 bg-app-surface p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Permissions
          </div>
          <div className="space-y-2">
            {permissionRows.map((row) => {
              const enabled = canGrant(row.key);
              const checked = p.permissions?.[row.key] ?? false;
              const syncing = permissionSyncingUserIds.has(p.userId);
              const canToggle = enabled && !admin && (meIsAdmin || !checked);

              return (
                <button
                  key={row.key}
                  type="button"
                  disabled={!canToggle || saving}
                  onClick={() => onTogglePermission(p, row.key)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                    checked
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                      : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-emerald-700/60 hover:bg-emerald-950/45 hover:text-emerald-100"
                  } ${canToggle && !saving ? "" : "cursor-not-allowed opacity-45"}`}
                >
                  <span>{row.label}</span>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                  ) : (
                    checked && <Check className="h-4 w-4 text-emerald-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupSettingsMembersSection({
  detail,
  regularParticipants,
  blockedParticipants,
  memberSearch,
  onlineParticipantIds,
  permissionUserId,
  permissionSyncingUserIds,
  saving,
  canRemoveMembers,
  isGroupAdmin,
  canGrant,
  meIsAdmin,
  onMemberSearchChange,
  onTogglePermissionPanel,
  onRemoveParticipant,
  onTogglePermission,
  onOpenParticipantProfile,
}: GroupSettingsMembersSectionProps) {
  const shownCount = regularParticipants.length + blockedParticipants.length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Participants
        </span>
        <span className="text-xs text-gray-600">
          {shownCount}/{detail.participants.length}
        </span>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          value={memberSearch}
          onChange={(e) => onMemberSearchChange(e.target.value)}
          type="search"
          placeholder="Filter members..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-indigo-500/60 focus:bg-white/[0.06]"
        />
      </div>
      <div className="space-y-2">
        {shownCount === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-sm text-gray-500">
            No members found.
          </div>
        ) : (
          regularParticipants.map((p) => (
            <MemberRow
              key={p.userId}
              p={p}
              detail={detail}
              onlineParticipantIds={onlineParticipantIds}
              permissionUserId={permissionUserId}
              permissionSyncingUserIds={permissionSyncingUserIds}
              saving={saving}
              canRemoveMembers={canRemoveMembers}
              isGroupAdmin={isGroupAdmin}
              canGrant={canGrant}
              meIsAdmin={meIsAdmin}
              onTogglePermissionPanel={onTogglePermissionPanel}
              onRemoveParticipant={onRemoveParticipant}
              onTogglePermission={onTogglePermission}
              onOpenParticipantProfile={onOpenParticipantProfile}
            />
          ))
        )}
      </div>

      {blockedParticipants.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          {blockedParticipants.map((p) => (
            <MemberRow
              key={`blocked-${p.userId}`}
              p={p}
              detail={detail}
              onlineParticipantIds={onlineParticipantIds}
              permissionUserId={permissionUserId}
              permissionSyncingUserIds={permissionSyncingUserIds}
              saving={saving}
              canRemoveMembers={canRemoveMembers}
              isGroupAdmin={isGroupAdmin}
              canGrant={canGrant}
              meIsAdmin={meIsAdmin}
              blocked
              onTogglePermissionPanel={onTogglePermissionPanel}
              onRemoveParticipant={onRemoveParticipant}
              onTogglePermission={onTogglePermission}
              onOpenParticipantProfile={onOpenParticipantProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
