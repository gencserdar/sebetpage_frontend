import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChatSocketContext } from "../../../context/ChatSocketContext";
import { useProfileNavigation } from "../../../hooks/useProfileNavigation";
import { blockService } from "../../../services/blockService";
import { getFriends } from "../../../services/friendService";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { UserDTO } from "../../../types/userDTO";
import { PAGE_SIZE, dayLabel } from "./chatUtils";
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

  const inputEl = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const lastSentMessageRef = useRef("");
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
          if (raw && raw.type === "READ") {
            if (Number(raw.readerUserId) === Number(friendUserId)) {
              setFriendLastReadAt(raw.lastReadAt || null);
            }
            return;
          }
          const m = raw as WsMessageDTO;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (Number(m.senderId) !== Number(resolvedMyUserId)) {
            markRead(convId).catch(() => {});
          }
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

  const seenMyMessageId = useMemo(() => {
    if (!friendLastReadAt || !myUserId) return null;
    const t = new Date(friendLastReadAt).getTime();
    let id: number | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId === myUserId && new Date(m.createdAt).getTime() <= t) {
        id = m.id;
        break;
      }
    }
    return id;
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
  };
}
