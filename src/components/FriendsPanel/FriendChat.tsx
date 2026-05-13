import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useChatSocketContext } from "../../context/ChatSocketContext";
import { WsMessageDTO } from "../../types/WSMessageDTO";
import { useNavigate } from "react-router-dom";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";
import { chatApiService, MessagingGroup } from "../../services/chatApiService";
import { Bell, ChevronDown, Maximize2, Minimize2, Newspaper, Plus, Search } from "lucide-react";

interface Props {
  meEmail: string;
  meNickname: string;
  friendUserId: number;
  friendEmail: string;
  friendNickname: string;
  onClose: () => void;
  onRemoved?: () => void;
  unreadCount?: number;
  onMarkAsRead?: (conversationId: number) => void;
  expandedRail?: React.ReactNode;
  initialExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Called after a new messaging group is successfully created from this chat. */
  onGroupCreated?: (
    group: MessagingGroup,
    participants: { id: number; nickname: string }[]
  ) => void;
}

type RenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };

const PAGE_SIZE = 50;

// ── Icons ──────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <Plus className="w-4 h-4" aria-hidden="true" />
);

const ExpandIcon = () => (
  <Maximize2 className="w-4 h-4" aria-hidden="true" />
);

const CollapseIcon = () => (
  <Minimize2 className="w-4 h-4" aria-hidden="true" />
);

const SearchIcon = () => (
  <Search className="w-5 h-5" aria-hidden="true" />
);

const BellIcon = () => (
  <Bell className="w-5 h-5" aria-hidden="true" />
);

const ChevronIcon = () => (
  <ChevronDown className="w-5 h-5" aria-hidden="true" />
);

// ── Component ──────────────────────────────────────────────────────────────

export default function FriendChat({
  meEmail,
  meNickname,
  friendUserId,
  friendEmail,
  friendNickname,
  onClose,
  onRemoved,
  unreadCount = 0,
  expandedRail,
  initialExpanded = false,
  onExpandedChange,
  onGroupCreated,
}: Props) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoved, setIsRemoved] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const inputEl = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const lastSentMessageRef = useRef<string>("");

  // SEEN
  const [friendLastReadAt, setFriendLastReadAt] = useState<string | null>(null);

  // pagination
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const messageEdgesRef = useRef<{ firstKey: string | null; lastKey: string | null }>({
    firstKey: null,
    lastKey: null,
  });

  // ── Expand & Add-to-group state ─────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [friendsList, setFriendsList] = useState<UserDTO[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
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

  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [friendUserId, initialExpanded]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // ── helpers ────────────────────────────────────────────────────────────

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const dayLabel = (d: Date) => {
    if (isToday(d)) return "Today";
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (
      d.getDate() === y.getDate() &&
      d.getMonth() === y.getMonth() &&
      d.getFullYear() === y.getFullYear()
    )
      return "Yesterday";
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
  };

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

  const navigate = useNavigate();
  const openFriendProfile = useCallback(() => {
    navigate(`/profile/${friendNickname}`, { state: { fallbackId: friendUserId } });
  }, [navigate, friendNickname, friendUserId]);

  // ── Add-panel: click-outside close ────────────────────────────────────

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

  // ── Load friends for add panel ─────────────────────────────────────────

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
    return friendsList.filter((f) =>
      f.nickname.toLowerCase().includes(q)
    );
  }, [friendsList, addSearch]);

  // ── Mark read on window focus ──────────────────────────────────────────

  useEffect(() => {
    const h = () => {
      if (conversationId) markRead(conversationId);
    };
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [conversationId, markRead]);

  // ── Init: resolve → read-state → latest → subscribe ───────────────────

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

        try {
          const rs = await getReadState(convId);
          if (mounted) {
            setFriendLastReadAt(rs.friendLastReadAt || null);
          }
        } catch (e) {
          console.warn("read-state failed", e);
        }

        const latest = await getLatestMessagesAsc(convId, PAGE_SIZE);
        if (!mounted) return;
        setMessages(latest);

        setNextPage(1);
        setHasMore(latest.length >= PAGE_SIZE);

        try { await markRead(convId); } catch { /* non-fatal */ }

        unsub = subscribeToConversation(convId, (raw: any) => {
          if (raw && raw.type === "READ") {
            if (Number(raw.readerUserId) === Number(friendUserId)) {
              setFriendLastReadAt(raw.lastReadAt || null);
            }
            return;
          }
          const m = raw as WsMessageDTO;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          if (Number(m.senderId) !== Number(resolvedMyUserId)) {
            markRead(convId).catch(() => { /* non-fatal */ });
          }
        });

        if (subscribeFriendEvents) {
          friendshipUnsub = subscribeFriendEvents((event: any) => {
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
      if (unsub) unsub();
      if (friendshipUnsub) friendshipUnsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meEmail, friendUserId]);

  // ── Load older messages ────────────────────────────────────────────────

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
        const newScrollHeight = el2.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        el2.scrollTop = delta;
      });
    }
  }, [conversationId, nextPage, hasMore, loadingOlder, getPagedMessagesDesc]);

  // ── Scroll to bottom on new messages ──────────────────────────────────

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

  // ── Scroll listener for older pages ───────────────────────────────────

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop <= 16 && hasMore && !loadingOlder) {
        void loadOlder();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Send ───────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isRemoved || isSending || sendingRef.current || text === lastSentMessageRef.current) return;
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
      setTimeout(() => { lastSentMessageRef.current = ""; }, 1000);
    }
  }, [sendToConversation, conversationId, myUserId, isRemoved, inputValue, isSending]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Seen indicator ─────────────────────────────────────────────────────

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

  // ── Sub-components ─────────────────────────────────────────────────────

  const Bubble = ({ m }: { m: WsMessageDTO }) => {
    const mine = m.senderId === myUserId;
    const bubbleCls = mine
      ? "bg-indigo-500/80 text-white border border-indigo-400/20"
      : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

    const idx = messages.findIndex((msg) => msg.id === m.id);
    let showDetail = true;
    if (idx > 0) {
      const prev = messages[idx - 1];
      const currTime = new Date(m.createdAt).getTime();
      const prevTime = new Date(prev.createdAt).getTime();
      if (prev.senderId === m.senderId && currTime - prevTime < 5 * 60 * 1000) {
        showDetail = false;
      }
    }

    return (
      <div className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`w-full flex flex-col ${mine ? "items-end" : "items-start"}`}>
          {showDetail && (
            <div className="w-full text-xs text-gray-500 px-1 text-center mb-2">
              <span>{fmtTime(m.createdAt)}</span>
            </div>
          )}
          <div
            title={new Date(m.createdAt).toLocaleString()}
            className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg backdrop-blur-sm ${bubbleCls} ${
              showDetail ? (mine ? "rounded-tr-none" : "rounded-tl-none") : ""
            }`}
            style={{ maxWidth: "90%" }}
          >
            {m.content}
          </div>
          {mine && seenMyMessageId === m.id && (
            <div className="mt-1 text-[11px] text-indigo-300/80 text-right">Seen</div>
          )}
        </div>
      </div>
    );
  };

  const DaySeparator = ({ label }: { label: string }) => {
    const [scrolling, setScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const separatorRef = useRef<HTMLDivElement | null>(null);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
      const el = listRef.current;
      if (!el) return;
      const onScroll = () => {
        setScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => setScrolling(false), 2000);
        if (separatorRef.current) {
          const rect = separatorRef.current.getBoundingClientRect();
          const parentRect = el.getBoundingClientRect();
          setFadeOut(el.scrollTop > 0 && rect.top - parentRect.top < 20);
        }
      };
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        el.removeEventListener("scroll", onScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }, [messages]);

    return (
      <div
        ref={separatorRef}
        className={`w-full flex justify-center py-1 px-3 sticky top-0 z-20 transition-opacity duration-500 ${
          scrolling || !fadeOut ? "opacity-80" : "opacity-0"
        }`}
      >
        <span className="text-xs px-3 py-2 rounded-full bg-gray-800 text-gray-400 border border-gray-700/30">
          {label}
        </span>
      </div>
    );
  };

  const renderList = () => {
    const groups: React.ReactElement[] = [];
    let currentDayLabel: string | null = null;
    let currentMessages: React.ReactElement[] = [];

    for (const it of renderItems) {
      if (it.type === "sep") {
        if (currentDayLabel) {
          groups.push(
            <div key={currentDayLabel} className="flex flex-col relative">
              <DaySeparator label={currentDayLabel} />
              {currentMessages}
            </div>
          );
        }
        currentDayLabel = it.label;
        currentMessages = [];
      } else {
        currentMessages.push(<Bubble key={it.key} m={it.data} />);
      }
    }
    if (currentDayLabel) {
      groups.push(
        <div key={currentDayLabel} className="flex flex-col relative">
          <DaySeparator label={currentDayLabel} />
          {currentMessages}
        </div>
      );
    }
    return groups;
  };

  const UnreadDot = ({ show }: { show: boolean }) =>
    !show ? null : (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2 align-middle" />
    );

  // ── Shared: header, messages, input ───────────────────────────────────

  const chatHeader = (
    <div className="relative flex justify-between items-center mb-3 border-b border-gray-800/40 pb-3">
      {/* Left: name */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={openFriendProfile}
          onKeyDown={(e) => e.key === "Enter" && openFriendProfile()}
          className="tracking-wide text-gray-100 font-semibold hover:text-indigo-300 transition-colors focus:outline-none rounded-md px-1 cursor-pointer truncate"
          title="Open profile"
          aria-label={`Open ${friendNickname}'s profile`}
        >
          {friendNickname}
        </button>
        <UnreadDot show={(unreadCount ?? 0) > 0} />
        {isRemoved && (
          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30 whitespace-nowrap">
            Removed
          </span>
        )}
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* + Add to group */}
        <button
          ref={addBtnRef}
          onClick={handleToggleAdd}
          className={`p-1.5 rounded-lg transition-colors duration-200 ${
            showAddPanel
              ? "bg-indigo-500/30 text-indigo-300"
              : "text-gray-500 hover:text-white hover:bg-gray-800/60"
          }`}
          title="Add people to group"
        >
          <PlusIcon />
        </button>

        {/* Expand / Collapse */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1.5"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1.5"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Add-to-group dropdown */}
      {showAddPanel && (
        <div
          ref={addPanelRef}
          className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl z-30 p-3"
        >
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide flex items-center gap-2">
            Add friends to group
            {creatingGroup && (
              <span className="inline-block w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
            )}
          </p>
          <div className="relative mb-2">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search friends…"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-800 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500/60"
              autoFocus
            />
          </div>
          <div
            className="max-h-48 overflow-y-auto flex flex-col gap-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.4) transparent" }}
          >
            {loadingFriends ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading…</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {addSearch ? "No matches" : "No other friends"}
              </div>
            ) : (
              filteredFriends.map((f) => (
                <button
                  key={f.id}
                  disabled={creatingGroup}
                  onClick={async () => {
                    if (creatingGroup) return;
                    setCreatingGroup(true);
                    try {
                      const group = await chatApiService.createMessagingGroup(
                        [friendUserId, f.id],
                        `${friendNickname}, ${f.nickname}`
                      );
                      setShowAddPanel(false);
                      setAddSearch("");
                      const participants = [
                        { id: friendUserId, nickname: friendNickname },
                        { id: f.id,         nickname: f.nickname },
                      ];
                      // Notify via prop (if wired) or the FriendsPanel window bridge
                      if (onGroupCreated) {
                        onGroupCreated(group, participants);
                      } else if ((window as any).__friendsPanelGroupCreated) {
                        (window as any).__friendsPanelGroupCreated(group, participants);
                      }
                    } catch (err) {
                      console.error("Failed to create group:", err);
                    } finally {
                      setCreatingGroup(false);
                    }
                  }}
                  className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors text-left ${
                    creatingGroup ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-500/20"
                  }`}
                >
                  <img
                    src={f.profileImageUrl || "/default_pp.png"}
                    alt="pfp"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <span className="text-sm text-gray-200">{f.nickname}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const chatMessages = (expanded: boolean) => (
    <div
      ref={listRef}
      className={`overflow-y-auto mb-3 bg-gradient-to-b from-gray-900/60 to-black/80 p-3 rounded-xl ${
        expanded ? "min-h-0 flex-1" : "h-80"
      }`}
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)" }}
    >
      {loadingOlder && (
        <div className="flex justify-center mb-2">
          <div
            style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }}
            className="w-8 h-8 border-4 rounded-full animate-spin"
          />
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div
            style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }}
            className="w-8 h-8 border-4 rounded-full animate-spin"
          />
        </div>
      ) : renderItems.length === 0 ? (
        <div className="text-gray-500">No messages yet.</div>
      ) : (
        renderList()
      )}
    </div>
  );

  const chatInput = (
    <div className="flex items-center gap-2 border-t border-gray-800/40 pt-3">
      <input
        ref={inputEl}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        type="text"
        name="chat-message"
        autoComplete="off"
        spellCheck={false}
        className={`flex-1 p-2 rounded-xl text-white placeholder-gray-500 outline-none border-none focus:ring-2 border backdrop-blur-sm ${
          isRemoved || isSending
            ? "bg-gray-900/50 border-gray-800/60 cursor-not-allowed"
            : "bg-gray-800/80 border-gray-750/40 focus:ring-indigo-500/60"
        }`}
        placeholder={isRemoved ? "Friendship ended..." : isSending ? "Sending..." : "Type a message…"}
        disabled={isRemoved || isSending}
      />
      <button
        onClick={handleSend}
        className={`px-3 py-2 rounded-xl transition-colors duration-200 border-none backdrop-blur-sm flex items-center justify-center min-w-[60px] ${
          isRemoved || !conversationId || isSending
            ? "bg-gray-800/50 border-gray-700/40 text-gray-500 cursor-not-allowed"
            : "bg-indigo-500/80 hover:bg-indigo-400/80 border-indigo-400/20 text-white"
        }`}
        disabled={!conversationId || isRemoved || isSending}
        title={isRemoved ? "Friend removed you" : !conversationId ? "Connecting..." : isSending ? "Sending..." : "Send"}
      >
        {isSending ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "Send"
        )}
      </button>
    </div>
  );

  const removedBanner = isRemoved && (
    <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
      <div className="text-red-400 text-sm">
        Friendship ended. You can no longer send messages.
      </div>
    </div>
  );

  // ── Expanded view ──────────────────────────────────────────────────────

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black/90">
        {expandedRail}
        {/* Left: Mini feed panel */}
        <div className="h-1/2 md:h-auto md:w-1/2 flex flex-col bg-gray-900/95 backdrop-blur-xl overflow-hidden">
          {/* Mini navbar */}
          <div className="flex items-center justify-between px-5 py-4 pl-16 border-b border-gray-800/40 bg-gray-950/80">
            <span className="text-lg font-bold tracking-wide text-indigo-400 select-none">
              SebetPage
            </span>
            <div className="flex items-center gap-3">
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Search"
              >
                <SearchIcon />
              </button>
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Incoming requests"
              >
                <BellIcon />
              </button>
              <button
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/60"
                title="Menu"
              >
                <ChevronIcon />
              </button>
            </div>
          </div>

          {/* Feed placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 select-none gap-2">
            <Newspaper className="w-10 h-10 opacity-40" aria-hidden="true" />
            <span className="text-sm">Posts</span>
          </div>
        </div>

        {/* Right: Chat panel */}
        <div className="h-1/2 min-h-0 md:h-auto md:w-1/2 flex flex-col bg-gray-950/98 backdrop-blur-xl p-4 border-t md:border-t-0 md:border-l border-gray-800/40 overflow-hidden">
          {chatHeader}
          {removedBanner}
          {chatMessages(true)}
          {chatInput}
        </div>
      </div>
    );
  }

  // ── Normal floating widget ─────────────────────────────────────────────

  return (
    <div
      style={{ zIndex: 51 }}
      className="fixed bottom-4 right-4 bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40"
    >
      {chatHeader}
      {removedBanner}
      {chatMessages(false)}
      {chatInput}
    </div>
  );
}
