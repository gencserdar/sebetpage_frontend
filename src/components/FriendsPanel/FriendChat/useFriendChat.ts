import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChatSocketContext } from "../../../context/ChatSocketContext";
import { useProfileNavigation } from "../../../hooks/useProfileNavigation";
import { blockService } from "../../../services/blockService";
import { chatApiService } from "../../../services/chatApiService";
import { getFriends } from "../../../services/friendService";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { UserDTO } from "../../../types/userDTO";
import { PAGE_SIZE, dayLabel, getMessageCreatedAtMillis, getMutationMessageId, normalizeWsMessage } from "./chatUtils";
import { FriendChatProps, RenderItem } from "./types";

type UseFriendChatParams = Pick<
  FriendChatProps,
  | "meEmail"
  | "friendUserId"
  | "friendEmail"
  | "friendNickname"
  | "onRemoved"
  | "initialExpanded"
  | "onExpandedChange"
>;

export function useFriendChat({
  meEmail,
  friendUserId,
  friendEmail,
  friendNickname,
  onRemoved,
  initialExpanded = false,
  onExpandedChange,
}: UseFriendChatParams) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoved, setIsRemoved] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blocksMe, setBlocksMe] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [friendLastReadAt, setFriendLastReadAt] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [friendsList, setFriendsList] = useState<UserDTO[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageActionPending, setMessageActionPending] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<WsMessageDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const inputEl = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const lastSentMessageRef = useRef("");
  const lastTypingSentRef = useRef(0);
  const typingClearTimerRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const messageEdgesRef = useRef<{ firstKey: string | null; lastKey: string | null }>({
    firstKey: null,
    lastKey: null,
  });
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const {
    resolveDirectConversation,
    getLatestMessagesAsc,
    getPagedMessagesDesc,
    subscribeToConversation,
    sendToConversation,
    subscribeFriendEvents,
    getReadState,
    markRead,
    subscribeUnreadEvents,
    getConversationUnread,
    sendTyping,
  } = useChatSocketContext();

  const { openProfile } = useProfileNavigation();

  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [friendUserId, initialExpanded]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const renderItems: RenderItem[] = useMemo(() => {
    if (!messages.length) return [];
    const items: RenderItem[] = [];
    let lastDayKey = "";
    for (const m of messages) {
      const d = new Date(m.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDayKey) {
        items.push({ type: "sep", key: `sep-${dayKey}`, label: dayLabel(d) });
        lastDayKey = dayKey;
      }
      items.push({ type: "msg", key: `msg-${m.id}`, data: m });
    }
    return items;
  }, [messages]);

  const openFriendProfile = useCallback(() => {
    openProfile(friendNickname, friendUserId);
  }, [openProfile, friendNickname, friendUserId]);

  const isBlocked = blockedByMe || blocksMe;
  const blockHint = blockedByMe
    ? "You blocked this user"
    : blocksMe
    ? "This user blocked you"
    : null;

  const refreshBlockStatus = useCallback(async () => {
    try {
      const status = await blockService.getBlockStatus(friendNickname);
      setBlockedByMe(status.blockedByMe);
      setBlocksMe(status.blocksMe);
    } catch (e) {
      console.warn("block status failed", e);
    }
  }, [friendNickname]);

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
        const list = await getFriends();
        setFriendsList(list.filter((f) => f.id !== friendUserId));
      } catch {
        // non-fatal
      } finally {
        setLoadingFriends(false);
      }
    }
  }, [showAddPanel, friendsList.length, loadingFriends, friendUserId]);

  const filteredFriends = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return friendsList;
    return friendsList.filter((f) => f.nickname.toLowerCase().includes(q));
  }, [friendsList, addSearch]);

  useEffect(() => {
    if (!conversationId) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(getConversationUnread(conversationId));
    const unsub = subscribeUnreadEvents((evt) => {
      if (evt.conversationId === conversationId) {
        setUnreadCount(evt.unreadCount ?? 0);
      }
    });
    return unsub;
  }, [conversationId, subscribeUnreadEvents, getConversationUnread]);

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current !== null) {
        window.clearTimeout(typingClearTimerRef.current);
      }
    };
  }, []);

  const applyConversationEvent = useCallback((raw: any, convId: number, resolvedMyUserId: number) => {
    if (raw?.type === "READ") {
      if (Number(raw.readerUserId) === Number(friendUserId)) {
        setFriendLastReadAt(raw.lastReadAt || null);
      }
      return;
    }
    if (raw?.type === "TYPING") {
      if (Number(raw.userId) !== Number(resolvedMyUserId)) {
        setTypingLabel("typing...");
        if (typingClearTimerRef.current !== null) {
          window.clearTimeout(typingClearTimerRef.current);
        }
        typingClearTimerRef.current = window.setTimeout(() => setTypingLabel(null), 3000);
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
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    if (Number(m.senderId) !== Number(resolvedMyUserId)) {
      markRead(convId).catch(() => {});
    }
  }, [friendUserId, markRead]);

  useEffect(() => {
    const h = () => {
      if (conversationId) markRead(conversationId);
    };
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [conversationId, markRead]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let friendshipUnsub: (() => void) | undefined;
    let mounted = true;
    messageEdgesRef.current = { firstKey: null, lastKey: null };
    setMessages([]);

    (async () => {
      try {
        setLoading(true);
        const r = await resolveDirectConversation(friendUserId);
        if (!mounted) return;

        const convId = r.id;
        const resolvedMyUserId = r.userAId === friendUserId ? r.userBId : r.userAId;

        setConversationId(convId);
        setMyUserId(resolvedMyUserId);

        void refreshBlockStatus();

        try {
          const rs = await getReadState(convId);
          if (mounted) setFriendLastReadAt(rs.friendLastReadAt || null);
        } catch (e) {
          console.warn("read-state failed", e);
        }

        const latest = await getLatestMessagesAsc(convId, PAGE_SIZE);
        if (!mounted) return;
        setMessages(latest);
        setNextPage(1);
        setHasMore(latest.length >= PAGE_SIZE);

        try {
          await markRead(convId);
        } catch {
          // non-fatal
        }

        unsub = subscribeToConversation(convId, (raw: any) => {
          applyConversationEvent(raw, convId, resolvedMyUserId);
        });

        if (subscribeFriendEvents) {
          friendshipUnsub = subscribeFriendEvents((event: any) => {
            if (event?.type === "BLOCK_STATUS_CHANGED" && Number(event.userId) === friendUserId) {
              void refreshBlockStatus();
              return;
            }
            if (event?.type === "FRIEND_REMOVED" && event.removedFriend) {
              if (
                event.removedFriend.email === friendEmail ||
                event.removedFriend.nickname === friendNickname
              ) {
                setIsRemoved(true);
                onRemoved?.();
              }
            }
          });
        }
      } catch (e) {
        console.error("FriendChat init failed:", e);
        if (e instanceof Error && e.message.includes("not found")) {
          setIsRemoved(true);
          onRemoved?.();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsub?.();
      friendshipUnsub?.();
    };
  }, [
    meEmail,
    friendUserId,
    friendEmail,
    friendNickname,
    onRemoved,
    resolveDirectConversation,
    getLatestMessagesAsc,
    getReadState,
    markRead,
    subscribeToConversation,
    subscribeFriendEvents,
    refreshBlockStatus,
    applyConversationEvent,
  ]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore) return;
    setLoadingOlder(true);

    const el = listRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    try {
      const pageData = await getPagedMessagesDesc(conversationId, nextPage, PAGE_SIZE);
      const olderAsc = pageData.content.slice().reverse();

      setMessages((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        const filtered = olderAsc.filter((m) => !existing.has(m.id));
        return filtered.length ? [...filtered, ...prev] : prev;
      });

      setNextPage((p) => p + 1);
      if (pageData.last || pageData.content.length === 0) setHasMore(false);
    } catch (e) {
      console.error("loadOlder failed:", e);
    } finally {
      setLoadingOlder(false);
      requestAnimationFrame(() => {
        const el2 = listRef.current;
        if (!el2) return;
        el2.scrollTop = el2.scrollHeight - prevScrollHeight;
      });
    }
  }, [conversationId, nextPage, hasMore, loadingOlder, getPagedMessagesDesc]);

  useLayoutEffect(() => {
    if (loading) return;

    const first = messages[0];
    const last = messages[messages.length - 1];
    const firstKey = first ? `${first.id}-${first.createdAt}` : null;
    const lastKey = last ? `${last.id}-${last.createdAt}` : null;
    const previous = messageEdgesRef.current;

    messageEdgesRef.current = { firstKey, lastKey };
    if (!messages.length) return;

    const initialPaint = previous.firstKey === null && previous.lastKey === null;
    const appendedNewest =
      previous.lastKey !== null &&
      previous.lastKey !== lastKey &&
      previous.firstKey === firstKey;

    if (!initialPaint && !appendedNewest) return;

    const stickToBottom = () => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => {
      stickToBottom();
      requestAnimationFrame(stickToBottom);
    });
  }, [messages, loading]);

  useLayoutEffect(() => {
    if (loading) return;
    const el = listRef.current;
    if (!el) return;

    const stickToBottom = () => {
      const node = listRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight;
    };

    let raf1 = 0;
    let raf2 = 0;
    const timers: number[] = [];
    const observer = new ResizeObserver(stickToBottom);

    stickToBottom();
    observer.observe(el);
    raf1 = requestAnimationFrame(() => {
      stickToBottom();
      raf2 = requestAnimationFrame(stickToBottom);
    });
    timers.push(window.setTimeout(stickToBottom, 80), window.setTimeout(stickToBottom, 180));

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
    const onScroll = () => {
      if (el.scrollTop <= 16 && hasMore && !loadingOlder) {
        void loadOlder();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingOlder, loadOlder]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isRemoved || isBlocked || isSending || sendingRef.current || text === lastSentMessageRef.current) return;
    if (!conversationId || !myUserId) {
      console.warn("Chat not ready yet");
      return;
    }

    setIsSending(true);
    sendingRef.current = true;
    lastSentMessageRef.current = text;

    try {
      sendToConversation(conversationId, myUserId, text);
      setInputValue("");
    } catch (e) {
      console.error("Failed to send message:", e);
      lastSentMessageRef.current = "";
    } finally {
      setIsSending(false);
      sendingRef.current = false;
      setTimeout(() => {
        lastSentMessageRef.current = "";
      }, 1000);
    }
  }, [sendToConversation, conversationId, myUserId, isRemoved, isBlocked, inputValue, isSending]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (!conversationId || isRemoved || isBlocked) return;
      const now = Date.now();
      if (now - lastTypingSentRef.current < 2000) return;
      lastTypingSentRef.current = now;
      sendTyping(conversationId);
    },
    [conversationId, isRemoved, isBlocked, sendTyping]
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
    if (!conversationId || editingMessageId === null) return;
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
    if (!conversationId || !pendingDeleteMessage) return;

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

  const seenMyMessageId = useMemo(() => {
    if (!friendLastReadAt || !myUserId || !messages.length) return null;

    const visible = messages.filter((m) => !m.deleted && Number(m.senderId) !== 0);
    if (!visible.length) return null;

    const lastMsg = visible[visible.length - 1];
    // Only show "Seen" when my message is still the latest in the thread.
    if (lastMsg.senderId !== myUserId) return null;

    const readAt = new Date(friendLastReadAt).getTime();
    if (!Number.isFinite(readAt)) return null;

    const lastMsgTime = new Date(lastMsg.createdAt).getTime();
    if (!Number.isFinite(lastMsgTime) || lastMsgTime > readAt) return null;

    return lastMsg.id;
  }, [friendLastReadAt, myUserId, messages]);

  return {
    messages,
    conversationId,
    myUserId,
    loading,
    isRemoved,
    isBlocked,
    blockedByMe,
    blocksMe,
    blockHint,
    isSending,
    inputValue,
    setInputValue,
    handleInputChange,
    isExpanded,
    setIsExpanded,
    showAddPanel,
    addSearch,
    setAddSearch,
    filteredFriends,
    loadingFriends,
    creatingGroup,
    setCreatingGroup,
    setShowAddPanel,
    loadingOlder,
    renderItems,
    listRef,
    inputEl,
    addPanelRef,
    addBtnRef,
    openFriendProfile,
    handleToggleAdd,
    handleSend,
    seenMyMessageId,
    unreadCount,
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
  };
}
