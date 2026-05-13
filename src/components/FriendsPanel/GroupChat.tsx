import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  ChevronDown,
  Maximize2,
  Minimize2,
  Newspaper,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useChatSocketContext } from "../../context/ChatSocketContext";
import { WsMessageDTO } from "../../types/WSMessageDTO";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";
import {
  chatApiService,
  MessagingGroupDetail,
} from "../../services/chatApiService";
import GroupSettingsModal from "./GroupSettingsModal";

interface Participant {
  id: number;
  nickname: string;
}

interface Props {
  conversationId: number;
  title: string;
  myUserId: number;
  myNickname: string;
  initialParticipants?: Participant[];
  onClose: () => void;
  onGroupChanged?: (detail: MessagingGroupDetail) => void;
  onGroupDeleted?: (groupId: number) => void;
  expandedRail?: React.ReactNode;
  initialExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const PAGE_SIZE = 50;

export default function GroupChat({
  conversationId,
  title,
  myUserId,
  myNickname,
  initialParticipants = [],
  onClose,
  onGroupChanged,
  onGroupDeleted,
  expandedRail,
  initialExpanded = false,
  onExpandedChange,
}: Props) {
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
  const [nicknames, setNicknames] = useState<Map<number, string>>(
    () => new Map(initialParticipants.map((p) => [p.id, p.nickname]))
  );

  const listRef = useRef<HTMLDivElement>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const sendingRef = useRef(false);
  const lastSentRef = useRef("");
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
  } = useChatSocketContext();

  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [conversationId, initialExpanded]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const applyDetail = useCallback(
    (next: MessagingGroupDetail) => {
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

  const displayName = detail?.title?.trim() || title?.trim() || "Group";
  const participantIds = useMemo(
    () => new Set((detail?.participants || []).map((p) => p.userId)),
    [detail]
  );
  const canAddMembers =
    !!detail &&
    (detail.createdById === detail.me.userId ||
      detail.me.role?.toUpperCase() === "ADMIN" ||
      detail.me.permissions?.canAddMembers);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const dayLabel = (d: Date) => {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  };

  const nickOf = useCallback(
    (uid: number) => {
      if (uid === myUserId) return myNickname;
      return nicknames.get(uid) ?? `User ${uid}`;
    },
    [myUserId, myNickname, nicknames]
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
        setMessages(latest);
        setHasMore(latest.length >= PAGE_SIZE);
        setNextPage(1);

        try {
          await markRead(conversationId);
        } catch {
          /* non-fatal */
        }

        unsub = subscribeToConversation(conversationId, (raw: any) => {
          if (raw?.type === "READ") return;
          const m = raw as WsMessageDTO;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          if (m.senderId !== myUserId) {
            markRead(conversationId).catch(() => {});
          }
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
  }, [conversationId, getLatestMessagesAsc, markRead, myUserId, subscribeToConversation]);

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
        const filtered = asc.filter((x) => !existing.has(x.id));
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
  }, [conversationId, nextPage, hasMore, loadingOlder, getPagedMessagesDesc]);

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

  type RenderItem =
    | { type: "sep"; key: string; label: string }
    | { type: "msg"; key: string; data: WsMessageDTO };

  const renderItems = useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];
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

  const Bubble = ({ m }: { m: WsMessageDTO }) => {
    if (Number(m.senderId) === 0) {
      return (
        <div className="my-3 flex w-full justify-center">
          <div className="max-w-[85%] rounded-full border border-emerald-500/20 bg-emerald-950/35 px-3 py-1.5 text-center text-xs text-emerald-200/90">
            {m.content}
          </div>
        </div>
      );
    }

    const mine = m.senderId === myUserId;
    const idx = messages.findIndex((x) => x.id === m.id);
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showHeader =
      !prev ||
      prev.senderId !== m.senderId ||
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <div className={`mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
          {showHeader && (
            <div className={`mb-0.5 px-1 text-xs text-gray-400 ${mine ? "text-right" : "text-left"}`}>
              {mine ? `${fmtTime(m.createdAt)}` : `${nickOf(m.senderId)} - ${fmtTime(m.createdAt)}`}
            </div>
          )}
          <div
            title={new Date(m.createdAt).toLocaleString()}
            className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg ${
              mine
                ? `border border-indigo-400/20 bg-indigo-500/80 text-white ${showHeader ? "rounded-tr-none" : ""}`
                : `border border-gray-700/40 bg-gray-800/80 text-gray-100 ${showHeader ? "rounded-tl-none" : ""}`
            }`}
          >
            {m.content}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const groups: React.ReactElement[] = [];
    let curLabel: string | null = null;
    let curMsgs: React.ReactElement[] = [];
    for (const it of renderItems) {
      if (it.type === "sep") {
        if (curLabel) groups.push(<div key={curLabel} className="relative flex flex-col">{curMsgs}</div>);
        curLabel = it.label;
        curMsgs = [
          <div key={`sep-${it.label}`} className="sticky top-0 z-10 flex w-full justify-center py-1">
            <span className="rounded-full border border-gray-700/30 bg-gray-800 px-3 py-1.5 text-xs text-gray-400">
              {it.label}
            </span>
          </div>,
        ];
      } else {
        curMsgs.push(<Bubble key={it.key} m={it.data} />);
      }
    }
    if (curLabel) groups.push(<div key={curLabel} className="relative flex flex-col">{curMsgs}</div>);
    return groups;
  };

  const header = (
    <div className="relative mb-3 flex items-center justify-between border-b border-gray-800/40 pb-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="block max-w-full truncate border-0 bg-transparent p-0 text-left font-semibold text-gray-100 transition-colors hover:text-indigo-300 focus:outline-none"
          title="Group settings"
        >
          {displayName}
        </button>
        <div className="truncate text-xs text-gray-500">
          {detail?.participants?.length
            ? `${detail.participants.length} members`
            : initialParticipants.length > 0
              ? initialParticipants.map((p) => p.nickname).join(", ")
              : "Group chat"}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 pl-2">
        {canAddMembers && (
          <button
            ref={addBtnRef}
            onClick={handleToggleAdd}
            className={`rounded-lg p-1.5 transition-colors ${
              showAddPanel
                ? "bg-indigo-500/30 text-indigo-300"
                : "text-gray-500 hover:bg-gray-800/60 hover:text-white"
            }`}
            title="Add people"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800/60 hover:text-white"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800/60 hover:text-white"
          title="Group settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800/60 hover:text-white"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showAddPanel && (
        <div
          ref={addPanelRef}
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-gray-700/50 bg-gray-900 p-3 shadow-2xl"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Add friends</p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search friends..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              className="w-full rounded-lg bg-gray-800 py-2 pl-8 pr-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/60"
              autoFocus
            />
          </div>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {loadingFriends ? (
              <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {addSearch ? "No matches" : "No friends to add"}
              </div>
            ) : (
              filteredFriends.map((f) => (
                <button
                  key={f.id}
                  disabled={!!addingMemberId}
                  onClick={() => addMember(f)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <img
                    src={f.profileImageUrl || "/default_pp.png"}
                    alt="pfp"
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-200">{f.nickname}</span>
                  {addingMemberId === f.id && (
                    <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const messageList = (expanded: boolean) => (
    <div
      ref={listRef}
      className={`mb-3 overflow-y-auto rounded-xl bg-gradient-to-b from-gray-900/60 to-black/80 p-3 ${
        expanded ? "min-h-0 flex-1" : "h-80"
      }`}
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)" }}
    >
      {loadingOlder && (
        <div className="mb-2 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : renderItems.length === 0 ? (
        <div className="text-sm text-gray-500">No messages yet. Say hello!</div>
      ) : (
        renderList()
      )}
    </div>
  );

  const input = (
    <div className="flex items-center gap-2 border-t border-gray-800/40 pt-3">
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={isSending ? "Sending..." : "Type a message..."}
        disabled={isSending}
        className="flex-1 rounded-xl bg-gray-800/80 p-2 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/60"
      />
      <button
        onClick={handleSend}
        disabled={isSending}
        className={`flex min-w-[60px] items-center justify-center rounded-xl px-3 py-2 transition-colors ${
          isSending
            ? "cursor-not-allowed bg-gray-800/50 text-gray-500"
            : "bg-indigo-500/80 text-white hover:bg-indigo-400/80"
        }`}
      >
        {isSending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "Send"
        )}
      </button>
    </div>
  );

  const settingsModal = (
    <GroupSettingsModal
      groupId={conversationId}
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      onChanged={applyDetail}
      onDeleted={(groupId) => {
        onGroupDeleted?.(groupId);
        onClose();
      }}
    />
  );

  if (isExpanded) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 md:flex-row">
          {expandedRail}
          <div className="flex h-1/2 flex-col overflow-hidden bg-gray-900/95 backdrop-blur-xl md:h-auto md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-800/40 bg-gray-950/80 px-5 py-4 pl-16">
              <span className="select-none text-lg font-bold tracking-wide text-indigo-400">SebetPage</span>
              <div className="flex items-center gap-3">
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white" title="Search">
                  <Search className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white" title="Incoming requests">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white" title="Menu">
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex flex-1 select-none flex-col items-center justify-center gap-2 text-gray-600">
              <Newspaper className="h-10 w-10 opacity-40" />
              <span className="text-sm">Posts</span>
            </div>
          </div>
          <div className="flex h-1/2 min-h-0 flex-col overflow-hidden border-t border-gray-800/40 bg-gray-950/98 p-4 backdrop-blur-xl md:h-auto md:w-1/2 md:border-l md:border-t-0">
            {header}
            {messageList(true)}
            {input}
          </div>
        </div>
        {settingsModal}
      </>
    );
  }

  return (
    <>
      <div
        style={{ zIndex: 52 }}
        className="fixed bottom-4 right-4 w-96 rounded-2xl border border-gray-800/40 bg-gray-950/98 p-4 text-white shadow-2xl backdrop-blur-xl"
      >
        {header}
        {messageList(false)}
        {input}
      </div>
      {settingsModal}
    </>
  );
}
