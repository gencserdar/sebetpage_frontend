import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatSocketContext } from "../../context/ChatSocketContext";
import { WsMessageDTO } from "../../types/WSMessageDTO";

interface Participant {
  id: number;
  nickname: string;
}

interface Props {
  conversationId: number;
  title: string;           // group name (may be empty → show "Group")
  myUserId: number;
  myNickname: string;
  /** Known participants at open time. Resolved lazily as messages arrive. */
  initialParticipants?: Participant[];
  onClose: () => void;
}

const PAGE_SIZE = 50;

export default function GroupChat({
  conversationId,
  title,
  myUserId,
  myNickname,
  initialParticipants = [],
  onClose,
}: Props) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  // userId → nickname cache, seeded from initialParticipants
  const [nicknames] = useState<Map<number, string>>(
    () => new Map(initialParticipants.map((p) => [p.id, p.nickname]))
  );

  const listRef = useRef<HTMLDivElement>(null);
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
  } = useChatSocketContext();

  const displayName = title && title.trim() ? title.trim() : "Group";

  // ── helpers ────────────────────────────────────────────────────────────

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const dayLabel = (d: Date) => {
    if (isToday(d)) return "Today";
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

  // ── Init ───────────────────────────────────────────────────────────────

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

        try { await markRead(conversationId); } catch { /* non-fatal */ }

        unsub = subscribeToConversation(conversationId, (raw: any) => {
          if (raw?.type === "READ") return; // group read events – ignore for now
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── Load older ─────────────────────────────────────────────────────────

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

  // ── Scroll to bottom ───────────────────────────────────────────────────

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
    const stick = () => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; };
    requestAnimationFrame(() => { stick(); requestAnimationFrame(stick); });
  }, [messages, loading]);

  // ── Scroll listener ────────────────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const h = () => { if (el.scrollTop <= 16 && hasMore && !loadingOlder) void loadOlder(); };
    el.addEventListener("scroll", h, { passive: true });
    return () => el.removeEventListener("scroll", h);
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Send ───────────────────────────────────────────────────────────────

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
      setTimeout(() => { lastSentRef.current = ""; }, 1000);
    }
  }, [inputValue, isSending, conversationId, myUserId, sendToConversation]);

  // ── Render ─────────────────────────────────────────────────────────────

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
    const mine = m.senderId === myUserId;
    const idx = messages.findIndex((x) => x.id === m.id);
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showHeader =
      !prev ||
      prev.senderId !== m.senderId ||
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <div className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[85%]`}>
          {showHeader && (
            <div className={`text-xs text-gray-400 mb-0.5 px-1 ${mine ? "text-right" : "text-left"}`}>
              {mine ? `${fmtTime(m.createdAt)}` : `${nickOf(m.senderId)} · ${fmtTime(m.createdAt)}`}
            </div>
          )}
          <div
            title={new Date(m.createdAt).toLocaleString()}
            className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg ${
              mine
                ? `bg-indigo-500/80 text-white border border-indigo-400/20 ${showHeader ? "rounded-tr-none" : ""}`
                : `bg-gray-800/80 text-gray-100 border border-gray-700/40 ${showHeader ? "rounded-tl-none" : ""}`
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
        if (curLabel) groups.push(<div key={curLabel} className="flex flex-col relative">{curMsgs}</div>);
        curLabel = it.label;
        curMsgs = [
          <div key={`sep-${it.label}`} className="w-full flex justify-center py-1 sticky top-0 z-10">
            <span className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700/30">
              {it.label}
            </span>
          </div>,
        ];
      } else {
        curMsgs.push(<Bubble key={it.key} m={it.data} />);
      }
    }
    if (curLabel) groups.push(<div key={curLabel} className="flex flex-col relative">{curMsgs}</div>);
    return groups;
  };

  return (
    <div
      style={{ zIndex: 52 }}
      className="fixed bottom-4 right-[26rem] bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40"
    >
      {/* header */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-800/40 pb-3">
        <div className="min-w-0">
          <div className="font-semibold text-gray-100 truncate">{displayName}</div>
          <div className="text-xs text-gray-500 truncate">
            {initialParticipants.length > 0
              ? initialParticipants.map((p) => p.nickname).join(", ")
              : "Group chat"}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors hover:bg-gray-800/60 rounded-lg p-1.5 flex-shrink-0 ml-2"
        >
          ✕
        </button>
      </div>

      {/* messages */}
      <div
        ref={listRef}
        className="h-80 overflow-y-auto mb-3 bg-gradient-to-b from-gray-900/60 to-black/80 p-3 rounded-xl"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)" }}
      >
        {loadingOlder && (
          <div className="flex justify-center mb-2">
            <div style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }} className="w-6 h-6 border-4 rounded-full animate-spin" />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }} className="w-8 h-8 border-4 rounded-full animate-spin" />
          </div>
        ) : renderItems.length === 0 ? (
          <div className="text-gray-500 text-sm">No messages yet. Say hello!</div>
        ) : (
          renderList()
        )}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-gray-800/40 pt-3">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={isSending ? "Sending…" : "Type a message…"}
          disabled={isSending}
          className="flex-1 p-2 rounded-xl text-white placeholder-gray-500 outline-none bg-gray-800/80 focus:ring-2 focus:ring-indigo-500/60"
        />
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`px-3 py-2 rounded-xl transition-colors flex items-center justify-center min-w-[60px] ${
            isSending
              ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
              : "bg-indigo-500/80 hover:bg-indigo-400/80 text-white"
          }`}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : "Send"}
        </button>
      </div>
    </div>
  );
}
