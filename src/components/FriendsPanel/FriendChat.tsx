import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChatSocket } from "../../hooks/useChatSocket";
import { ChatMessage } from "../../types/ChatMessageType";
import { WsMessageDTO } from "../../types/WSMessageDTO";

interface Props {
  meEmail: string;
  meNickname: string;
  friendEmail: string;
  friendNickname: string;
  onClose: () => void;
  onRemoved?: () => void; // Called when friend removes you
  unreadCount?: number; // Pass unread count from parent
  onMarkAsRead?: () => void; // Called when messages are read
}

type RenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };

const PAGE_SIZE = 50; // hem latest hem paged için aynı

export default function FriendChat({
  meEmail,
  meNickname,
  friendEmail,
  friendNickname,
  onClose,
  onRemoved,
  unreadCount = 0,
  onMarkAsRead,
}: Props) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [friendUserId, setFriendUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoved, setIsRemoved] = useState(false); // Track if friend removed you

  // pagination state
  const [nextPage, setNextPage] = useState(1);      // latest (page0) yüklendi varsayımıyla 1'den başla
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    resolveDirectConversation,
    getLatestMessagesAsc,
    getPagedMessagesDesc,         // ← eski sayfaları çekeceğiz
    subscribeToConversation,
    sendMessage,
    subscribeFriendEvents, // Use existing friend events subscription
  } = useChatSocket(meEmail);

  // === helpers ===
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    if (isToday(d)) return `${hh}:${mm}`;
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mo}.${yyyy} ${hh}:${mm}`;
  };

  const dayLabel = (d: Date) => {
    if (isToday(d)) return "Today";
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  // Gün ayraçları
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

  // En alta scroll ve mark as read
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      // Mark messages as read when chat is open and messages are loaded
      if (messages.length > 0 && onMarkAsRead) {
        onMarkAsRead();
      }
    }
  }, [messages, onMarkAsRead]);

  // İlk açılış: resolve → latest (ASC) → subscribe
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let friendshipUnsub: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const r = await resolveDirectConversation(meEmail, friendEmail);
        if (!mounted) return;
        setConversationId(r.conversationId);
        setMyUserId(r.myUserId);
        setFriendUserId(r.friendUserId);

        const latest = await getLatestMessagesAsc(r.conversationId, PAGE_SIZE);
        if (!mounted) return;
        setMessages(latest);

        // pagination reset
        setNextPage(1);                            // page0 = latest
        setHasMore(latest.length >= PAGE_SIZE);    // 50'den azsa daha yoktur

        unsub = subscribeToConversation(r.conversationId, (m: WsMessageDTO) => {
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
        });

        // Subscribe to friendship changes
        if (subscribeFriendEvents) {
          friendshipUnsub = subscribeFriendEvents((event: any) => {
            console.log("Friend event received:", event); // Debug log
            
            // Check if this event is about the current friend being removed
            if (event.type === 'FRIEND_REMOVED' && event.removedFriend) {
              // Check if the removed friend matches the current chat friend
              if (event.removedFriend.email === friendEmail || event.removedFriend.nickname === friendNickname) {
                console.log("Friend removed detected for:", friendNickname);
                setIsRemoved(true);
                if (onRemoved) {
                  onRemoved();
                }
              }
            }
          });
        }
      } catch (e) {
        console.error("FriendChat init failed:", e);
        // If conversation resolution fails, friend might have removed you
        if (e instanceof Error && e.message.includes('not found')) {
          setIsRemoved(true);
          if (onRemoved) {
            onRemoved();
          }
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
  }, [meEmail, friendEmail]);

  // Eski sayfayı yükle (tepedeyken)
  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore) return;
    setLoadingOlder(true);

    const el = listRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    try {
      const pageData = await getPagedMessagesDesc(conversationId, nextPage, PAGE_SIZE); // DESC gelir
      const olderAsc = pageData.content.slice().reverse(); // ASC sıraya çevir

      setMessages(prev => {
        const existing = new Set(prev.map(x => x.id));
        const filtered = olderAsc.filter(m => !existing.has(m.id));
        return filtered.length ? [...filtered, ...prev] : prev;
      });

      setNextPage(p => p + 1);
      if (pageData.last || pageData.content.length === 0) setHasMore(false);
    } catch (e) {
      console.error("loadOlder failed:", e);
    } finally {
      setLoadingOlder(false);
      // scroll pozisyonunu koru (prepend sonrası atlama olmasın)
      requestAnimationFrame(() => {
        const el2 = listRef.current;
        if (!el2) return;
        const newScrollHeight = el2.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        // tepedeysek ~0 olur; yeni eklenen kadar aşağı it
        el2.scrollTop = delta;
      });
    }
  }, [conversationId, nextPage, hasMore, loadingOlder, getPagedMessagesDesc]);

  // Scroll listener: tepeye yaklaşınca eski sayfayı çek
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop <= 16 && hasMore && !loadingOlder) {
        void loadOlder();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); };
  }, [hasMore, loadingOlder, loadOlder]);

  // Gönder
  const handleSend = useCallback(async () => {
    if (isRemoved) return; // Don't allow sending if removed
    
    const text = input.trim();
    if (!text) return;
    
    try {
      const msg: ChatMessage = { from: meEmail, to: friendEmail, content: text };
      await sendMessage(msg);
      setInput("");
    } catch (e) {
      console.error("Failed to send message:", e);
      // If sending fails, friend might have removed you
      if (e instanceof Error && (e.message.includes('not found') || e.message.includes('forbidden'))) {
        setIsRemoved(true);
        if (onRemoved) {
          onRemoved();
        }
      }
    }
  }, [input, meEmail, friendEmail, sendMessage, isRemoved, onRemoved]);

  // BALONCUK
  const Bubble = ({ m }: { m: WsMessageDTO }) => {
    const senderIdNum = (m as any).senderId != null ? Number((m as any).senderId) : NaN;
    const myId = myUserId != null ? Number(myUserId) : NaN;
    const frId = friendUserId != null ? Number(friendUserId) : NaN;

    const mine = !Number.isNaN(myId) ? senderIdNum === myId
                : !Number.isNaN(frId) ? senderIdNum !== frId
                : false;

    const name = mine ? meNickname : friendNickname;
    const bubbleCls = mine
      ? "bg-indigo-500/80 text-white border border-indigo-400/20"
      : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

    return (
      <div className={`w-full flex mb-2 ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[75%]">
          <div className={`text-xs text-gray-500 mb-1 px-1 ${mine ? "text-right" : "text-left"}`}>
            {name} • {fmtTime(m.createdAt)}
          </div>
          <div className={`rounded-2xl px-3 py-2 shadow-lg backdrop-blur-sm ${bubbleCls}`}>
            {m.content}
          </div>
        </div>
      </div>
    );
  };

  const DaySeparator = ({ label }: { label: string }) => (
    <div className="w-full flex justify-center my-3">
      <span className="text-xs px-3 py-1 rounded-full bg-gray-800/60 text-gray-400 border border-gray-700/30">
        {label}
      </span>
    </div>
  );

  // Red unread indicator component
  const UnreadBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-gray-950">
        {count > 99 ? '99+' : count}
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40">
      {/* header */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-800/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <strong className="tracking-wide text-gray-100">{friendNickname}</strong>
            {/* Unread indicator next to friend name */}
            <UnreadBadge count={unreadCount} />
          </div>
          {isRemoved && (
            <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
              Removed
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1 relative"
        >
          ✕
          {/* Unread indicator on close button when chat is minimized */}
          <UnreadBadge count={unreadCount} />
        </button>
      </div>

      {/* Removed message */}
      {isRemoved && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
          <div className="text-red-400 text-sm">
            Friendship ended. You can no longer send messages.
          </div>
        </div>
      )}

      {/* list */}
      <div
        ref={listRef}
        className="h-80 overflow-y-auto mb-3 bg-gradient-to-b from-gray-900/60 to-black/80 p-3 rounded-xl"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)" }}
      >
        {loadingOlder && (
          <div className="text-center text-xs text-gray-500 mb-2">Loading older…</div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : renderItems.length === 0 ? (
          <div className="text-gray-500">No messages yet.</div>
        ) : (
          renderItems.map((it) =>
            it.type === "sep" ? <DaySeparator key={it.key} label={it.label} /> : <Bubble key={it.key} m={it.data} />
          )
        )}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-gray-800/40 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`flex-1 p-2 rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 border backdrop-blur-sm ${
            isRemoved 
              ? "bg-gray-900/50 border-gray-800/60 cursor-not-allowed" 
              : "bg-gray-800/80 border-gray-750/40 focus:ring-indigo-500/60"
          }`}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={isRemoved ? "Friend removed you..." : "Type a message…"}
          disabled={isRemoved}
        />
        <button
          onClick={handleSend}
          className={`px-3 py-2 rounded-xl transition-colors duration-200 border backdrop-blur-sm ${
            isRemoved || !conversationId
              ? "bg-gray-800/50 border-gray-700/40 text-gray-500 cursor-not-allowed"
              : "bg-indigo-500/80 hover:bg-indigo-400/80 border-indigo-400/20 text-white"
          }`}
          disabled={!conversationId || isRemoved}
          title={
            isRemoved 
              ? "Friend removed you" 
              : !conversationId 
                ? "Connecting..." 
                : "Send"
          }
        >
          Send
        </button>
      </div>
    </div>
  );
}