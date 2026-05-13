import {
  Check,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  Search,
  Shield,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatApiService,
  MessagingGroupDetail,
  MessagingGroupParticipant,
  MessagingGroupPermissions,
} from "../../services/chatApiService";
import { useChatSocketContext } from "../../context/ChatSocketContext";

interface Props {
  groupId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged?: (detail: MessagingGroupDetail) => void;
  onDeleted?: (groupId: number) => void;
}

const permissionRows: Array<{ key: keyof MessagingGroupPermissions; label: string }> = [
  { key: "canChangePhoto", label: "Group photo" },
  { key: "canChangeDescription", label: "Description" },
  { key: "canChangeName", label: "Name" },
  { key: "canRemoveMembers", label: "Remove users" },
  { key: "canAddMembers", label: "Add users" },
];

const emptyPermissions: MessagingGroupPermissions = {
  canChangePhoto: false,
  canChangeDescription: false,
  canChangeName: false,
  canRemoveMembers: false,
  canAddMembers: false,
};

export default function GroupSettingsModal({
  groupId,
  open,
  onClose,
  onChanged,
  onDeleted,
}: Props) {
  const [detail, setDetail] = useState<MessagingGroupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [permissionUserId, setPermissionUserId] = useState<number | null>(null);
  const [permissionSyncingUserIds, setPermissionSyncingUserIds] = useState<Set<number>>(() => new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [onlineParticipantIds, setOnlineParticipantIds] = useState<Set<number>>(() => new Set());
  const detailRef = useRef<MessagingGroupDetail | null>(null);
  const editingTitleRef = useRef(false);
  const editingDescriptionRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPermissionTimersRef = useRef<Map<number, number>>(new Map());
  const pendingPermissionsRef = useRef<Map<number, MessagingGroupPermissions>>(new Map());
  const permissionSyncingRef = useRef<Set<number>>(new Set());
  const { subscribeFriendEvents, getUserOnlineStatus } = useChatSocketContext();

  useEffect(() => {
    editingTitleRef.current = editingTitle;
  }, [editingTitle]);

  useEffect(() => {
    editingDescriptionRef.current = editingDescription;
  }, [editingDescription]);

  const clearPermissionSync = useCallback(() => {
    pendingPermissionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingPermissionTimersRef.current.clear();
    pendingPermissionsRef.current.clear();
    permissionSyncingRef.current = new Set();
    setPermissionSyncingUserIds(new Set());
  }, []);

  const applyDetail = useCallback(
    (next: MessagingGroupDetail, options?: { resetDrafts?: boolean }) => {
      let merged = next;
      if (pendingPermissionsRef.current.size > 0) {
        const patchOne = (participant: MessagingGroupParticipant): MessagingGroupParticipant => {
          const pending = pendingPermissionsRef.current.get(participant.userId);
          return pending ? { ...participant, permissions: pending } : participant;
        };
        merged = {
          ...next,
          me: patchOne(next.me),
          participants: next.participants.map(patchOne),
        };
      }

      detailRef.current = merged;
      setDetail(merged);
      const resetDrafts = options?.resetDrafts ?? true;
      if (resetDrafts || !editingTitleRef.current) setTitleDraft(merged.title || "");
      if (resetDrafts || !editingDescriptionRef.current) setDescriptionDraft(merged.description || "");
      onChanged?.(merged);
    },
    [onChanged]
  );

  const load = useCallback(async (resetUi = true) => {
    if (!open || !groupId) return;
    if (resetUi) setLoading(true);
    setError(null);
    if (resetUi) {
      setPermissionUserId(null);
      setMemberSearch("");
    }
    try {
      const next = await chatApiService.getMessagingGroup(groupId);
      applyDetail(next, { resetDrafts: resetUi });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load group");
    } finally {
      if (resetUi) setLoading(false);
    }
  }, [applyDetail, groupId, open]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) {
      setConfirmDeleteOpen(false);
      setDeleteText("");
      setEditingTitle(false);
      setEditingDescription(false);
      setPermissionUserId(null);
      setMemberSearch("");
      clearPermissionSync();
    }
  }, [clearPermissionSync, open]);

  useEffect(() => {
    return clearPermissionSync;
  }, [clearPermissionSync]);

  useEffect(() => {
    if (!open || !groupId) return undefined;
    return subscribeFriendEvents((event: any) => {
      if (Number(event?.conversationId) !== Number(groupId)) return;
      if (event?.type === "MESSAGING_GROUP_DELETED" || event?.type === "MESSAGING_GROUP_LEFT") {
        onDeleted?.(groupId);
        onClose();
        return;
      }
      if (event?.type === "MESSAGING_GROUP_ADDED" || event?.type === "MESSAGING_GROUP_UPDATED") {
        void load(false);
      }
    });
  }, [groupId, load, onClose, onDeleted, open, subscribeFriendEvents]);

  useEffect(() => {
    if (!detail) {
      setOnlineParticipantIds(new Set());
      return;
    }
    const next = new Set<number>();
    detail.participants.forEach((participant) => {
      if (getUserOnlineStatus(participant.userId)) next.add(participant.userId);
    });
    setOnlineParticipantIds(next);
  }, [detail, getUserOnlineStatus]);

  useEffect(() => {
    if (!open) return undefined;
    const participantIds = () =>
      new Set((detailRef.current?.participants || []).map((participant) => participant.userId));

    return subscribeFriendEvents((event: any) => {
      const type = event?.type;
      if (type === "PRESENCE_SNAPSHOT" && Array.isArray(event.users)) {
        const activeParticipantIds = participantIds();
        const next = new Set<number>();
        event.users.forEach((entry: any) => {
          const userId = Number(entry?.userId);
          if (entry?.online && activeParticipantIds.has(userId)) next.add(userId);
        });
        setOnlineParticipantIds(next);
        return;
      }

      const userId = Number(event?.userId);
      if (!Number.isFinite(userId) || !participantIds().has(userId)) return;
      if (type === "PRESENCE_UPDATE") {
        setOnlineParticipantIds((prev) => {
          const next = new Set(prev);
          if (event.online) next.add(userId);
          else next.delete(userId);
          return next;
        });
      } else if (type === "FRIEND_ONLINE") {
        setOnlineParticipantIds((prev) => new Set(prev).add(userId));
      } else if (type === "FRIEND_OFFLINE") {
        setOnlineParticipantIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    });
  }, [open, subscribeFriendEvents]);

  if (!open) return null;

  const me = detail?.me;
  const isCreator = !!detail && detail.createdById === detail.me.userId;
  const meIsAdmin = !!me && (isCreator || me.role?.toUpperCase() === "ADMIN");

  const canGrant = (permission: keyof MessagingGroupPermissions) => {
    if (!detail || !me) return false;
    return meIsAdmin || !!me.permissions?.[permission];
  };

  const isGroupAdmin = (participant: MessagingGroupParticipant) =>
    !!detail &&
    (participant.userId === detail.createdById || participant.role?.toUpperCase() === "ADMIN");

  const canEditName = canGrant("canChangeName");
  const canEditDescription = canGrant("canChangeDescription");
  const canEditPhoto = canGrant("canChangePhoto");
  const canRemoveMembers = canGrant("canRemoveMembers");

  const displayName = detail?.title?.trim() || "Group chat";
  const initial = displayName.charAt(0).toUpperCase();
  const memberSearchNeedle = memberSearch.trim().toLowerCase();
  const filtered = detail
    ? memberSearchNeedle
      ? detail.participants.filter((participant) => {
          const haystack = [
            participant.nickname,
            participant.name,
            participant.surname,
            participant.role,
            participant.userId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(memberSearchNeedle);
        })
      : detail.participants
    : [];
  const selfUserId = detail?.me.userId;
  const filteredParticipants = filtered
    .map((participant, index) => ({ participant, index }))
    .sort((a, b) => {
      const aSelf = a.participant.userId === selfUserId;
      const bSelf = b.participant.userId === selfUserId;
      if (aSelf !== bSelf) return aSelf ? -1 : 1;
      const aOnline = aSelf || onlineParticipantIds.has(a.participant.userId);
      const bOnline = bSelf || onlineParticipantIds.has(b.participant.userId);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ participant }) => participant);

  const setPermissionSyncing = (userId: number, syncing: boolean) => {
    const next = new Set(permissionSyncingRef.current);
    if (syncing) next.add(userId);
    else next.delete(userId);
    permissionSyncingRef.current = next;
    setPermissionSyncingUserIds(new Set(next));
  };

  const patchParticipantLocally = (
    userId: number,
    patch: Partial<Pick<MessagingGroupParticipant, "muted" | "permissions">>
  ) => {
    const current = detailRef.current;
    if (!current) return;
    const patchOne = (participant: MessagingGroupParticipant): MessagingGroupParticipant => {
      if (participant.userId !== userId) return participant;
      return {
        ...participant,
        muted: patch.muted ?? participant.muted,
        permissions: patch.permissions ?? participant.permissions,
      };
    };
    applyDetail({
      ...current,
      me: current.me.userId === userId ? patchOne(current.me) : current.me,
      participants: current.participants.map(patchOne),
    }, { resetDrafts: false });
  };

  const mergeParticipantDetail = (next: MessagingGroupDetail, userId: number) => {
    const current = detailRef.current;
    if (!current) {
      applyDetail(next, { resetDrafts: false });
      return;
    }

    const updatedParticipant = next.participants.find((p) => p.userId === userId);
    applyDetail({
      ...current,
      me: next.me.userId === userId ? next.me : current.me,
      participants: current.participants.map((p) =>
        p.userId === userId ? updatedParticipant ?? p : p
      ),
      knownParticipants: next.knownParticipants ?? current.knownParticipants,
    }, { resetDrafts: false });
  };

  const flushPermissionSave = async (userId: number) => {
    if (permissionSyncingRef.current.has(userId)) return;
    const permissions = pendingPermissionsRef.current.get(userId);
    const current = detailRef.current;
    if (!current || !permissions) return;

    pendingPermissionsRef.current.delete(userId);
    setPermissionSyncing(userId, true);
    setError(null);
    try {
      const next = await chatApiService.updateMessagingGroupParticipant(current.id, userId, {
        permissions,
      });
      if (!pendingPermissionsRef.current.has(userId)) {
        mergeParticipantDetail(next, userId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update permissions");
      void load();
    } finally {
      setPermissionSyncing(userId, false);
      if (pendingPermissionsRef.current.has(userId)) {
        void flushPermissionSave(userId);
      }
    }
  };

  const schedulePermissionSave = (userId: number, permissions: MessagingGroupPermissions) => {
    pendingPermissionsRef.current.set(userId, permissions);
    const existing = pendingPermissionTimersRef.current.get(userId);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      pendingPermissionTimersRef.current.delete(userId);
      void flushPermissionSave(userId);
    }, 220);
    pendingPermissionTimersRef.current.set(userId, timer);
  };

  const saveGroupPatch = async (
    patch: Partial<Pick<MessagingGroupDetail, "title" | "description" | "imageUrl">>
  ) => {
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      applyDetail(await chatApiService.updateMessagingGroup(detail.id, patch));
      setEditingTitle(false);
      setEditingDescription(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file?: File) => {
    if (!detail || !file || saving) return;
    setSaving(true);
    setError(null);
    try {
      applyDetail(await chatApiService.uploadMessagingGroupPhoto(detail.id, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateParticipant = async (
    participant: MessagingGroupParticipant,
    patch: { muted?: boolean; permissions?: MessagingGroupPermissions }
  ) => {
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      applyDetail(await chatApiService.updateMessagingGroupParticipant(detail.id, participant.userId, patch));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const removeParticipant = async (participant: MessagingGroupParticipant) => {
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      applyDetail(await chatApiService.removeMessagingGroupMember(detail.id, participant.userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setSaving(false);
    }
  };

  const exitGroup = async () => {
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      await chatApiService.exitMessagingGroup(detail.id);
      onDeleted?.(detail.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to exit group");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!detail || saving || deleteText !== "I confirm deletion.") return;
    setSaving(true);
    setError(null);
    try {
      await chatApiService.deleteMessagingGroup(detail.id);
      onDeleted?.(detail.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const permissionButton = (participant: MessagingGroupParticipant, row: typeof permissionRows[number]) => {
    const enabled = canGrant(row.key);
    const checked = participant.permissions?.[row.key] ?? false;
    const syncing = permissionSyncingUserIds.has(participant.userId);
    const canToggle = enabled && !isGroupAdmin(participant) && (meIsAdmin || !checked);
    const nextPermissions = {
      ...(participant.permissions || emptyPermissions),
      [row.key]: !checked,
    };

    return (
      <button
        key={row.key}
        type="button"
        disabled={!canToggle || saving}
        onClick={() => {
          if (!canToggle) return;
          const permissions = nextPermissions as MessagingGroupPermissions;
          patchParticipantLocally(participant.userId, { permissions });
          schedulePermissionSave(participant.userId, permissions);
        }}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
          checked
            ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
            : "border-gray-800 bg-white/[0.03] text-gray-300 hover:border-emerald-700/60 hover:bg-emerald-950/45 hover:text-emerald-100"
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
  };

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
        <div className="z-10 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 py-3">
          <h2 className="text-base font-semibold">Group settings</h2>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="group-settings-scroll flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.55) rgba(3,7,18,.75)" }}
        >
          {detail ? (
            <div className="relative pb-5">
              <div
                className="sticky top-0 z-0 aspect-square w-full overflow-hidden border-b border-gray-800"
              >
                {detail.imageUrl ? (
                  <img
                    src={detail.imageUrl}
                    alt="Group"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-indigo-900/55 text-6xl font-bold"
                  >
                    {initial}
                  </div>
                )}
                {canEditPhoto && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/45 hover:opacity-100 disabled:cursor-not-allowed"
                    title="Upload group photo"
                  >
                    {saving ? (
                      <Loader2 className="h-9 w-9 animate-spin" />
                    ) : (
                      <Plus className="h-10 w-10" />
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => uploadPhoto(e.target.files?.[0])}
                />
              </div>

              <div className="relative z-10 -mt-28 bg-gray-950 pb-5 before:pointer-events-none before:absolute before:bottom-full before:left-0 before:right-0 before:h-28 before:bg-gradient-to-b before:from-transparent before:via-gray-950/70 before:to-gray-950 before:content-['']">
                <div className="border-b border-gray-800 px-4 py-4">
                <div className="flex items-center justify-center gap-2">
                  {editingTitle ? (
                    <>
                      <input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGroupPatch({ title: titleDraft });
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-white/10 px-4 py-3 text-white outline-none focus:border-indigo-400"
                        autoFocus
                      />
                      <button
                        onClick={() => saveGroupPatch({ title: titleDraft })}
                        disabled={!canEditName || saving}
                        className="rounded-lg bg-indigo-500 px-3 py-3 text-white transition hover:bg-indigo-400 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingTitle(false)}
                        className="rounded-lg bg-white/10 px-3 py-3 text-white transition hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        onDoubleClick={() => canEditName && setEditingTitle(true)}
                        className="min-w-0 truncate text-lg font-semibold"
                      >
                        {displayName}
                      </div>
                      {canEditName && (
                        <button
                          onClick={() => setEditingTitle(true)}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
                          title="Change name"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-5 px-4 pt-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</span>
                    {canEditDescription && !editingDescription && (
                      <button
                        onClick={() => setEditingDescription(true)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
                        title="Edit description"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {editingDescription ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingDescription(false);
                        }}
                        rows={3}
                        className="min-w-0 flex-1 resize-none rounded-lg border border-gray-700 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                        autoFocus
                      />
                      <button
                        onClick={() => saveGroupPatch({ description: descriptionDraft })}
                        disabled={saving}
                        className="rounded-lg bg-indigo-500 px-3 py-3 text-white transition hover:bg-indigo-400 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingDescription(false)}
                        className="rounded-lg bg-white/10 px-3 py-3 text-white transition hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p
                      onDoubleClick={() => canEditDescription && setEditingDescription(true)}
                      className="min-h-[28px] rounded-lg px-1 py-1 text-sm leading-relaxed text-gray-300 transition hover:text-gray-100"
                    >
                      {detail.description?.trim() || "No description yet."}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Participants
                    </span>
                    <span className="text-xs text-gray-600">
                      {filteredParticipants.length}/{detail.participants.length}
                    </span>
                  </div>
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      type="search"
                      placeholder="Filter members..."
                      className="w-full rounded-xl border border-gray-800 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-indigo-500/60 focus:bg-white/[0.06]"
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredParticipants.length === 0 ? (
                      <div className="rounded-xl border border-gray-800 bg-white/[0.02] px-3 py-4 text-center text-sm text-gray-500">
                        No members found.
                      </div>
                    ) : filteredParticipants.map((p) => {
                      const admin = isGroupAdmin(p);
                      const self = p.userId === detail.me.userId;
                      const online = self || onlineParticipantIds.has(p.userId);
                      return (
                        <div
                          key={p.userId}
                          className={`relative flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                            online
                              ? "border-emerald-400/25 bg-emerald-500/10"
                              : "border-gray-800 bg-white/[0.03]"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={p.profileImageUrl || "/default_pp.png"}
                              alt="pfp"
                              className="h-9 w-9 rounded-full object-cover"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-gray-950 ${
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
                          </div>

                          {admin && (
                            <span className="shrink-0 rounded-full border border-indigo-400/35 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100">
                              Admin
                            </span>
                          )}

                          {!self && !admin && (
                            <button
                              onClick={() => setPermissionUserId(permissionUserId === p.userId ? null : p.userId)}
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-emerald-950/50 hover:text-emerald-200"
                              title="Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}

                          {canRemoveMembers && !admin && !self && (
                            <button
                              onClick={() => removeParticipant(p)}
                              disabled={saving}
                              className="rounded-lg p-1.5 text-red-300 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
                              title="Remove user"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}

                          {permissionUserId === p.userId && (
                            <div className="absolute right-2 top-11 z-10 w-64 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-2xl">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Permissions
                              </div>
                              <div className="space-y-2">
                                {permissionRows.map((row) => permissionButton(p, row))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => detail && updateParticipant(detail.me, { muted: !detail.me.muted })}
                  disabled={saving}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${
                    detail.me.muted
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                      : "border-gray-800 bg-white/[0.03] text-gray-200 hover:border-emerald-700/60 hover:bg-emerald-950/45"
                  }`}
                >
                  <span>Mute notifications</span>
                  {detail.me.muted && <Check className="h-4 w-4 text-emerald-300" />}
                </button>

                <div className="flex flex-col gap-2 border-t border-gray-800 pt-4">
                  <button
                    onClick={exitGroup}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-900 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Exit group
                  </button>
                  {meIsAdmin && (
                    <button
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete group
                    </button>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}
              </div>
            </div>
            </div>
          ) : loading ? (
            <div className="h-full min-h-[520px]" />
          ) : (
            <div className="py-8 text-center text-gray-500">Group not found.</div>
          )}
        </div>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-gray-950 p-4 text-white shadow-2xl">
            <h3 className="text-base font-semibold text-red-200">Delete group</h3>
            <p className="mt-2 text-sm text-gray-400">
              Type <span className="font-mono text-gray-200">I confirm deletion.</span> to permanently delete this group.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={deleteGroup}
                disabled={deleteText !== "I confirm deletion." || saving}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
