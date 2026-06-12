import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chatApiService,
  MessagingGroupDetail,
  MessagingGroupParticipant,
  MessagingGroupPermissions,
} from "../../../services/chatApiService";
import { useChatSocketContext } from "../../../context/ChatSocketContext";
import { useProfileNavigation } from "../../../hooks/useProfileNavigation";
import { getFriends } from "../../../services/friendService";
import { UserDTO } from "../../../types/userDTO";
import { emptyPermissions, formatGroupLoadError } from "./constants";
import { GroupSettingsModalProps } from "./types";

type UseGroupSettingsParams = Pick<
  GroupSettingsModalProps,
  "groupId" | "open" | "onClose" | "onChanged" | "onDeleted"
>;

export function useGroupSettings({
  groupId,
  open,
  onClose,
  onChanged,
  onDeleted,
}: UseGroupSettingsParams) {
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
  const [showAddMembersPanel, setShowAddMembersPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [friendsList, setFriendsList] = useState<UserDTO[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<number | null>(null);

  const detailRef = useRef<MessagingGroupDetail | null>(null);
  const addPanelRef = useRef<HTMLDivElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  const editingTitleRef = useRef(false);
  const editingDescriptionRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPermissionTimersRef = useRef<Map<number, number>>(new Map());
  const pendingPermissionsRef = useRef<Map<number, MessagingGroupPermissions>>(new Map());
  const permissionSyncingRef = useRef<Set<number>>(new Set());

  const { openProfile } = useProfileNavigation();
  const { subscribeFriendEvents, subscribeUserUpdates, getUserOnlineStatus } = useChatSocketContext();

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
    if (resetUi) {
      setLoading(true);
      setDetail(null);
      detailRef.current = null;
      setPermissionUserId(null);
      setMemberSearch("");
    }
    setError(null);
    try {
      const next = await chatApiService.getMessagingGroup(groupId);
      applyDetail(next, { resetDrafts: resetUi });
    } catch (e) {
      setDetail(null);
      detailRef.current = null;
      setError(formatGroupLoadError(e));
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
      if (event?.type === "BLOCK_STATUS_CHANGED") {
        const otherId = Number(event?.userId);
        if (
          detailRef.current?.participants.some((participant) => participant.userId === otherId)
        ) {
          void load(false);
        }
        return;
      }

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
      if (participant.blocksMe) return;
      if (getUserOnlineStatus(participant.userId)) next.add(participant.userId);
    });
    setOnlineParticipantIds(next);
  }, [detail, getUserOnlineStatus]);

  useEffect(() => {
    if (!open) return undefined;
    const participantIds = () =>
      new Set((detailRef.current?.participants || []).map((participant) => participant.userId));

    const blocksMeUser = (userId: number) =>
      detailRef.current?.participants.some(
        (participant) => participant.userId === userId && participant.blocksMe
      ) ?? false;

    return subscribeFriendEvents((event: any) => {
      const type = event?.type;
      if (type === "PRESENCE_SNAPSHOT" && Array.isArray(event.users)) {
        const activeParticipantIds = participantIds();
        const next = new Set<number>();
        event.users.forEach((entry: any) => {
          const userId = Number(entry?.userId);
          if (
            entry?.online &&
            activeParticipantIds.has(userId) &&
            !blocksMeUser(userId)
          ) {
            next.add(userId);
          }
        });
        setOnlineParticipantIds(next);
        return;
      }

      const userId = Number(event?.userId);
      if (!Number.isFinite(userId) || !participantIds().has(userId)) return;
      if (type === "PRESENCE_UPDATE") {
        setOnlineParticipantIds((prev) => {
          const next = new Set(prev);
          if (event.online && !blocksMeUser(userId)) next.add(userId);
          else next.delete(userId);
          return next;
        });
      } else if (type === "FRIEND_ONLINE") {
        if (!blocksMeUser(userId)) {
          setOnlineParticipantIds((prev) => new Set(prev).add(userId));
        }
      } else if (type === "FRIEND_OFFLINE") {
        setOnlineParticipantIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    });
  }, [open, subscribeFriendEvents]);

  useEffect(() => {
    if (!open) return undefined;
    return subscribeUserUpdates((u: any) => {
      const uid = Number(u?.id);
      if (!Number.isFinite(uid)) return;
      if (!detailRef.current?.participants.some((p) => p.userId === uid)) return;

      const patchParticipant = (p: MessagingGroupParticipant): MessagingGroupParticipant =>
        p.userId === uid
          ? {
              ...p,
              nickname: u.nickname ?? p.nickname,
              name: u.name ?? p.name,
              surname: u.surname ?? p.surname,
              profileImageUrl: u.profileImageUrl ?? p.profileImageUrl,
            }
          : p;

      applyDetail(
        {
          ...detailRef.current!,
          me: patchParticipant(detailRef.current!.me),
          participants: detailRef.current!.participants.map(patchParticipant),
        },
        { resetDrafts: false }
      );
    });
  }, [open, applyDetail, subscribeUserUpdates]);

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
  const canAddMembers = canGrant("canAddMembers");

  const participantIds = useMemo(
    () => new Set((detail?.participants || []).map((p) => p.userId)),
    [detail]
  );

  const filteredFriends = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return friendsList
      .filter((f) => !participantIds.has(f.id))
      .filter((f) => !q || f.nickname.toLowerCase().includes(q));
  }, [friendsList, participantIds, addSearch]);

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
  const sortParticipants = (items: MessagingGroupParticipant[]) =>
    items
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

  const regularParticipants = sortParticipants(
    filtered.filter((participant) => !participant.blockedByMe)
  );
  const blockedParticipants = sortParticipants(
    filtered.filter((participant) => participant.blockedByMe)
  );

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

  useEffect(() => {
    if (!showAddMembersPanel) return;
    const handler = (e: MouseEvent) => {
      if (
        addPanelRef.current &&
        !addPanelRef.current.contains(e.target as Node) &&
        addBtnRef.current &&
        !addBtnRef.current.contains(e.target as Node)
      ) {
        setShowAddMembersPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddMembersPanel]);

  const handleToggleAddMembers = useCallback(async () => {
    if (!canAddMembers) return;
    if (showAddMembersPanel) {
      setShowAddMembersPanel(false);
      return;
    }
    setShowAddMembersPanel(true);
    if (friendsList.length === 0 && !loadingFriends) {
      setLoadingFriends(true);
      try {
        setFriendsList(await getFriends());
      } catch (e) {
        console.error("Failed to load friends:", e);
      } finally {
        setLoadingFriends(false);
      }
    }
  }, [canAddMembers, showAddMembersPanel, friendsList.length, loadingFriends]);

  const addMember = async (friend: UserDTO) => {
    if (!groupId || addingMemberId || !canAddMembers) return;
    setAddingMemberId(friend.id);
    try {
      const next = await chatApiService.addMessagingGroupMember(groupId, friend.id);
      applyDetail(next);
      setShowAddMembersPanel(false);
      setAddSearch("");
    } catch (e) {
      console.error("Failed to add member:", e);
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAddingMemberId(null);
    }
  };

  const openParticipantProfile = useCallback(
    (nickname: string, userId: number) => {
      if (!nickname) return;
      openProfile(nickname, userId);
    },
    [openProfile]
  );

  const close = () => {
    setShowAddMembersPanel(false);
    onClose();
  };

  const togglePermission = (
    participant: MessagingGroupParticipant,
    key: keyof MessagingGroupPermissions
  ) => {
    const enabled = canGrant(key);
    const checked = participant.permissions?.[key] ?? false;
    const canToggle = enabled && !isGroupAdmin(participant) && (meIsAdmin || !checked);
    if (!canToggle || saving) return;

    const permissions = {
      ...(participant.permissions || emptyPermissions),
      [key]: !checked,
    } as MessagingGroupPermissions;
    patchParticipantLocally(participant.userId, { permissions });
    schedulePermissionSave(participant.userId, permissions);
  };

  return {
    detail,
    loading,
    saving,
    error,
    editingTitle,
    setEditingTitle,
    editingDescription,
    setEditingDescription,
    titleDraft,
    setTitleDraft,
    descriptionDraft,
    setDescriptionDraft,
    permissionUserId,
    setPermissionUserId,
    permissionSyncingUserIds,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    deleteText,
    setDeleteText,
    memberSearch,
    setMemberSearch,
    onlineParticipantIds,
    fileInputRef,
    meIsAdmin,
    canEditName,
    canEditDescription,
    canEditPhoto,
    canRemoveMembers,
    canAddMembers,
    showAddMembersPanel,
    addSearch,
    setAddSearch,
    loadingFriends,
    filteredFriends,
    addingMemberId,
    addPanelRef,
    addBtnRef,
    handleToggleAddMembers,
    addMember,
    openParticipantProfile,
    displayName,
    initial,
    regularParticipants,
    blockedParticipants,
    isGroupAdmin,
    canGrant,
    close,
    saveGroupPatch,
    uploadPhoto,
    updateParticipant,
    removeParticipant,
    exitGroup,
    deleteGroup,
    togglePermission,
  };
}
