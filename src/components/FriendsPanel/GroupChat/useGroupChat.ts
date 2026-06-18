import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChatSocketContext } from "../../../context/ChatSocketContext";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { getFriends } from "../../../services/friendService";
import { UserDTO } from "../../../types/userDTO";
import {
  chatApiService,
  MessagingGroupDetail,
} from "../../../services/chatApiService";
import { PAGE_SIZE, dayLabel, getMessageCreatedAtMillis, getMutationMessageId, normalizeWsMessage } from "../FriendChat/chatUtils";
import { GroupChatProps, GroupRenderItem } from "./types";

type UseGroupChatParams = Pick<
  GroupChatProps,
  | "conversationId"
  | "title"
  | "myUserId"
  | "myNickname"
  | "initialParticipants"
  | "onClose"
  | "onGroupChanged"
  | "onGroupDeleted"
  | "initialExpanded"
  | "onExpandedChange"
>;

export function useGroupChat({
  conversationId,
  title,
  myUserId,
  myNickname,
  initialParticipants = [],
  onClose,
  onGroupChanged,
  onGroupDeleted,
  initialExpanded = false,
  onExpandedChange,
}: UseGroupChatParams) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [detail, setDetail] = useState<MessagingGroupDetail | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [friendsList, setFriendsList] = useState<UserDTO[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<number | null>(null);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageActionPending, setMessageActionPending] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<WsMessageDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nicknames, setNicknames] = useState<Map<number, string>>(
    () => new Map(initialParticipants.map((p) => [p.id, p.nickname]))
  );

  const detailRef = useRef<MessagingGroupDetail | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const sendingRef = useRef(false);
  const lastSentRef = useRef("");
  const lastTypingSentRef = useRef(0);
  const typingClearTimerRef = useRef<number | null>(null);
  const messageEdgesRef = useRef<{ firstKey: string | null; lastKey: string | null }>({
    firstKey: null,
    lastKey: null,
  });

  const {
    getLatestMessagesAsc,
    getPagedMessagesDesc,
    subscribeToConversation,
    sendToConversation,
    markRead,
    subscribeFriendEvents,
    subscribeUserUpdates,
    sendTyping,
  } = useChatSocketContext();

  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [conversationId, initialExpanded]);

  useEffect(() => {
    setNicknames((prev) => {
      const next = new Map(prev);
      initialParticipants.forEach((p) => next.set(p.id, p.nickname));
      next.set(myUserId, myNickname);
      return next;
    });
  }, [conversationId, initialParticipants, myUserId, myNickname]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const applyDetail = useCallback(
    (next: MessagingGroupDetail) => {
      detailRef.current = next;
      setDetail(next);
      setNicknames((prev) => {
        const copy = new Map(prev);
        next.knownParticipants?.forEach((p) => copy.set(p.userId, p.nickname));
        next.participants.forEach((p) => copy.set(p.userId, p.nickname));
        copy.set(myUserId, myNickname);
        return copy;
      });
      onGroupChanged?.(next);
    },
    [myNickname, myUserId, onGroupChanged]
  );

  const loadDetail = useCallback(async () => {
    try {
      const next = await chatApiService.getMessagingGroup(conversationId);
      applyDetail(next);
    } catch (e) {
      console.error("Failed to load group detail:", e);
    }
  }, [conversationId, applyDetail]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    return subscribeFriendEvents((event: any) => {
      if (event?.type === "BLOCK_STATUS_CHANGED") {
        const otherId = Number(event?.userId);
        if (
          detailRef.current?.participants.some((participant) => participant.userId === otherId)
        ) {
          void loadDetail();
        }
        return;
      }

      if (Number(event?.conversationId) !== Number(conversationId)) return;
      if (event?.type === "MESSAGING_GROUP_DELETED" || event?.type === "MESSAGING_GROUP_LEFT") {
        onGroupDeleted?.(conversationId);
        onClose();
        return;
      }
      if (event?.type === "MESSAGING_GROUP_ADDED" || event?.type === "MESSAGING_GROUP_UPDATED") {
        void loadDetail();
      }
    });
  }, [conversationId, loadDetail, onClose, onGroupDeleted, subscribeFriendEvents]);

  useEffect(() => {
    return subscribeUserUpdates((u: any) => {
      const uid = Number(u?.id);
      if (!Number.isFinite(uid)) return;
      if (!detailRef.current?.participants.some((p) => p.userId === uid)) return;

      if (u.nickname) {
        setNicknames((prev) => {
          const next = new Map(prev);
          next.set(uid, String(u.nickname));
          return next;
        });
      }

      setDetail((prev) => {
        if (!prev) return prev;
        const patchParticipant = (p: (typeof prev.participants)[number]) =>
          p.userId === uid
            ? {
                ...p,
                nickname: u.nickname ?? p.nickname,
                name: u.name ?? p.name,
                surname: u.surname ?? p.surname,
                profileImageUrl: u.profileImageUrl ?? p.profileImageUrl,
              }
            : p;
        const next = {
          ...prev,
          participants: prev.participants.map(patchParticipant),
          knownParticipants: prev.knownParticipants?.map(patchParticipant),
        };
        detailRef.current = next;
        return next;
      });
    });
  }, [subscribeUserUpdates]);

  const displayName = detail?.title?.trim() || title?.trim() || "Group";
  const participantIds = useMemo(
    () => new Set((detail?.participants || []).map((p) => p.userId)),
    [detail]
  );
  const blockedSenderIds = useMemo(
    () =>
      new Set(
        (detail?.participants || [])
          .filter((p) => p.blockedByMe)
          .map((p) => p.userId)
      ),
    [detail]
  );
  const isMessageVisible = useCallback(
    (senderId: number) => {
      if (!senderId || senderId === myUserId) return true;
      return !blockedSenderIds.has(senderId);
    },
    [blockedSenderIds, myUserId]
  );

  useEffect(() => {
    setMessages((prev) => prev.filter((m) => isMessageVisible(Number(m.senderId))));
  }, [blockedSenderIds, isMessageVisible]);

  const canAddMembers =
    !!detail &&
    (detail.createdById === detail.me.userId ||
      detail.me.role?.toUpperCase() === "ADMIN" ||
      detail.me.permissions?.canAddMembers);

  const nickOf = useCallback(
    (uid: number) => {
      if (uid === myUserId) return myNickname;
      const cached = nicknames.get(uid);
      if (cached) return cached;

      const fromParticipant = detail?.participants?.find((p) => p.userId === uid)?.nickname;
      if (fromParticipant) return fromParticipant;

      const fromKnown = detail?.knownParticipants?.find((p) => p.userId === uid)?.nickname;
      if (fromKnown) return fromKnown;

      const fromInitial = initialParticipants.find((p) => p.id === uid)?.nickname;
      if (fromInitial) return fromInitial;

      return `User ${uid}`;
    },
    [detail, initialParticipants, myNickname, myUserId, nicknames]
  );

  const typingLabel = useMemo(() => {
    if (!typingUserId) return null;
    return `${nickOf(typingUserId)} is typing...`;
  }, [nickOf, typingUserId]);

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
      }
    };
  }, []);

  const applyConversationEvent = useCallback(
    (raw: any) => {
      if (raw?.type === "READ") return;
      if (raw?.type === "TYPING") {
        const uid = Number(raw.userId);
        if (uid && uid !== myUserId) {
          setTypingUserId(uid);
          if (typingClearTimerRef.current !== null) {
            window.clearTimeout(typingClearTimerRef.current);
          }
          typingClearTimerRef.current = window.setTimeout(() => setTypingUserId(null), 3000);
        }
        return;
      }
      if (raw?.type === "MESSAGE_DELETED") {
        const messageId = getMutationMessageId(raw);
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((x) =>
            x.id === messageId ? { ...x, deleted: true, content: "" } : x
          )
        );
        return;
      }
      if (raw?.type === "MESSAGE_EDITED") {
        const updated = normalizeWsMessage(raw.message ?? raw);
        if (!updated.id) return;
        setMessages((prev) =>
          prev.map((x) =>
            x.id === updated.id
              ? {
                  ...x,
                  content: updated.content ?? x.content,
                  editedAt: updated.editedAt ?? new Date().toISOString(),
                  createdAtMillis: updated.createdAtMillis ?? x.createdAtMillis,
                  deleted: false,
                }
              : x
          )
        );
        return;
      }
      const m = normalizeWsMessage(raw);
      if (!isMessageVisible(Number(m.senderId))) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.senderId !== myUserId) {
        markRead(conversationId).catch(() => {});
      }
    },
    [conversationId, isMessageVisible, markRead, myUserId]
  );

  useEffect(() => {
    if (!showAddPanel) return;
    const handler = (e: MouseEvent) => {
      if (
        addPanelRef.current &&
        !addPanelRef.current.contains(e.target as Node) &&
        addBtnRef.current &&
        !addBtnRef.current.contains(e.target as Node)
      ) {
        setShowAddPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddPanel]);

  const handleToggleAdd = useCallback(async () => {
    if (showAddPanel) {
      setShowAddPanel(false);
      return;
    }
    setShowAddPanel(true);
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
  }, [friendsList.length, loadingFriends, showAddPanel]);

  const filteredFriends = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return friendsList
      .filter((f) => !participantIds.has(f.id))
      .filter((f) => !q || f.nickname.toLowerCase().includes(q));
  }, [friendsList, participantIds, addSearch]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    messageEdgesRef.current = { firstKey: null, lastKey: null };
    setMessages([]);

    (async () => {
      try {
        setLoading(true);
        const latest = await getLatestMessagesAsc(conversationId, PAGE_SIZE);
        if (!mounted) return;
        setMessages(latest.filter((m) => isMessageVisible(Number(m.senderId))));
        setHasMore(latest.length >= PAGE_SIZE);
        setNextPage(1);

        try {
          await markRead(conversationId);
        } catch {
          /* non-fatal */
        }

        unsub = subscribeToConversation(conversationId, (raw: any) => {
          applyConversationEvent(raw);
        });
      } catch (e) {
        console.error("GroupChat init failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, [conversationId, getLatestMessagesAsc, isMessageVisible, markRead, myUserId, subscribeToConversation, applyConversationEvent]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prev = el?.scrollHeight ?? 0;
    try {
      const page = await getPagedMessagesDesc(conversationId, nextPage, PAGE_SIZE);
      const asc = page.content.slice().reverse();
      setMessages((m) => {
        const existing = new Set(m.map((x) => x.id));
        const filtered = asc.filter(
          (x) => !existing.has(x.id) && isMessageVisible(Number(x.senderId))
        );
        return filtered.length ? [...filtered, ...m] : m;
      });
      setNextPage((p) => p + 1);
      if (page.last || page.content.length === 0) setHasMore(false);
    } finally {
      setLoadingOlder(false);
      requestAnimationFrame(() => {
        const el2 = listRef.current;
        if (!el2) return;
        el2.scrollTop = el2.scrollHeight - prev;
      });
    }
  }, [conversationId, nextPage, hasMore, loadingOlder, getPagedMessagesDesc, isMessageVisible]);

  useLayoutEffect(() => {
    if (loading) return;
    const first = messages[0];
    const last = messages[messages.length - 1];
    const firstKey = first ? `${first.id}` : null;
    const lastKey = last ? `${last.id}` : null;
    const prev = messageEdgesRef.current;
    messageEdgesRef.current = { firstKey, lastKey };
    if (!messages.length) return;
    const initial = prev.firstKey === null;
    const appended = prev.lastKey !== null && prev.lastKey !== lastKey && prev.firstKey === firstKey;
    if (!initial && !appended) return;
    const stick = () => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    };
    requestAnimationFrame(() => {
      stick();
      requestAnimationFrame(stick);
    });
  }, [messages, loading]);

  useLayoutEffect(() => {
    if (loading) return;
    const el = listRef.current;
    if (!el) return;

    const stick = () => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    };

    let raf1 = 0;
    let raf2 = 0;
    const timers: number[] = [];
    const observer = new ResizeObserver(stick);

    stick();
    observer.observe(el);
    raf1 = requestAnimationFrame(() => {
      stick();
      raf2 = requestAnimationFrame(stick);
    });
    timers.push(window.setTimeout(stick, 80), window.setTimeout(stick, 180));

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [isExpanded, loading]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const h = () => {
      if (el.scrollTop <= 16 && hasMore && !loadingOlder) void loadOlder();
    };
    el.addEventListener("scroll", h, { passive: true });
    return () => el.removeEventListener("scroll", h);
  }, [hasMore, loadingOlder, loadOlder]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isSending || sendingRef.current || text === lastSentRef.current) return;
    setIsSending(true);
    sendingRef.current = true;
    lastSentRef.current = text;
    try {
      sendToConversation(conversationId, myUserId, text);
      setInputValue("");
    } finally {
      setIsSending(false);
      sendingRef.current = false;
      setTimeout(() => {
        lastSentRef.current = "";
      }, 1000);
    }
  }, [inputValue, isSending, conversationId, myUserId, sendToConversation]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      const now = Date.now();
      if (now - lastTypingSentRef.current < 2000) return;
      lastTypingSentRef.current = now;
      sendTyping(conversationId);
    },
    [conversationId, sendTyping]
  );

  const messageCreatedAtMillis = useCallback((message: WsMessageDTO) => {
    return getMessageCreatedAtMillis(message);
  }, []);

  const handleStartEdit = useCallback((message: WsMessageDTO) => {
    setActionError(null);
    setEditingMessageId(message.id);
    setEditDraft(message.content);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditDraft("");
  }, []);

  const handleEditSave = useCallback(async () => {
    if (editingMessageId === null) return;
    const text = editDraft.trim();
    if (!text) return;
    const target = messages.find((m) => m.id === editingMessageId);
    if (!target) return;

    setMessageActionPending(true);
    setActionError(null);
    try {
      const updated = await chatApiService.editMessage(
        conversationId,
        editingMessageId,
        messageCreatedAtMillis(target),
        text
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId
            ? {
                ...m,
                content: updated.content ?? text,
                editedAt: updated.editedAt ?? new Date().toISOString(),
                createdAtMillis: updated.createdAtMillis ?? m.createdAtMillis,
              }
            : m
        )
      );
      setEditingMessageId(null);
      setEditDraft("");
    } catch (e) {
      console.error("Failed to edit message:", e);
      setActionError(e instanceof Error ? e.message : "Failed to edit message");
    } finally {
      setMessageActionPending(false);
    }
  }, [
    conversationId,
    editDraft,
    editingMessageId,
    messageCreatedAtMillis,
    messages,
  ]);

  const handleDeleteMessage = useCallback((message: WsMessageDTO) => {
    setActionError(null);
    setPendingDeleteMessage(message);
  }, []);

  const handleCancelDelete = useCallback(() => {
    if (messageActionPending) return;
    setPendingDeleteMessage(null);
  }, [messageActionPending]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteMessage) return;

    setMessageActionPending(true);
    setActionError(null);
    try {
      await chatApiService.deleteMessage(
        conversationId,
        pendingDeleteMessage.id,
        messageCreatedAtMillis(pendingDeleteMessage)
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingDeleteMessage.id ? { ...m, deleted: true, content: "" } : m
        )
      );
      if (editingMessageId === pendingDeleteMessage.id) {
        handleEditCancel();
      }
      setPendingDeleteMessage(null);
    } catch (e) {
      console.error("Failed to delete message:", e);
      setActionError(e instanceof Error ? e.message : "Failed to delete message");
    } finally {
      setMessageActionPending(false);
    }
  }, [
    conversationId,
    editingMessageId,
    handleEditCancel,
    messageCreatedAtMillis,
    pendingDeleteMessage,
  ]);

  const addMember = async (friend: UserDTO) => {
    if (addingMemberId) return;
    setAddingMemberId(friend.id);
    try {
      const next = await chatApiService.addMessagingGroupMember(conversationId, friend.id);
      applyDetail(next);
      setShowAddPanel(false);
      setAddSearch("");
    } catch (e) {
      console.error("Failed to add member:", e);
    } finally {
      setAddingMemberId(null);
    }
  };

  const renderItems = useMemo<GroupRenderItem[]>(() => {
    const items: GroupRenderItem[] = [];
    let lastDay = "";
    for (const m of messages) {
      const d = new Date(m.createdAt);
      const dk = d.toDateString();
      if (dk !== lastDay) {
        items.push({ type: "sep", key: `sep-${dk}`, label: dayLabel(d) });
        lastDay = dk;
      }
      items.push({ type: "msg", key: `msg-${m.id}`, data: m });
    }
    return items;
  }, [messages]);

  const handleGroupDeleted = useCallback(
    (groupId: number) => {
      onGroupDeleted?.(groupId);
      onClose();
    },
    [onClose, onGroupDeleted]
  );

  return {
    messages,
    loading,
    loadingOlder,
    inputValue,
    setInputValue,
    handleInputChange,
    isSending,
    isExpanded,
    setIsExpanded,
    detail,
    settingsOpen,
    setSettingsOpen,
    showAddPanel,
    addSearch,
    setAddSearch,
    loadingFriends,
    addingMemberId,
    listRef,
    inputRef,
    addPanelRef,
    addBtnRef,
    displayName,
    canAddMembers,
    nickOf,
    handleToggleAdd,
    filteredFriends,
    handleSend,
    addMember,
    renderItems,
    applyDetail,
    handleGroupDeleted,
    typingLabel,
    editingMessageId,
    editDraft,
    setEditDraft,
    handleStartEdit,
    handleEditSave,
    handleEditCancel,
    handleDeleteMessage,
    messageActionPending,
    pendingDeleteMessage,
    handleCancelDelete,
    handleConfirmDelete,
    actionError,
    setActionError,
    initialParticipants,
    onClose,
    myUserId,
    conversationId,
  };
}
