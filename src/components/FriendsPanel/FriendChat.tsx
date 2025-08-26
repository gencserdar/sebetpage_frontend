import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChatSocketContext } from "../../context/ChatSocketContext";
import { ChatMessage } from "../../types/ChatMessageType";
import { WsMessageDTO } from "../../types/WSMessageDTO";
import { useNavigate } from "react-router-dom";

interface Props {
  meEmail: string;
  meNickname: string;
  friendEmail: string;
  friendNickname: string;
  onClose: () => void;
  onRemoved?: () => void;
  unreadCount?: number;
  onMarkAsRead?: (conversationId: number) => void;
}

type RenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };

const PAGE_SIZE = 50;

export default function FriendChat({
  meEmail,
  meNickname,
  friendEmail,
  friendNickname,
  onClose,
  onRemoved,
  unreadCount = 0,
}: Props) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [friendUserId, setFriendUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoved, setIsRemoved] = useState(false);

  // SEEN
  const [friendLastReadAt, setFriendLastReadAt] = useState<string | null>(null);

  // pagination
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Use the context instead of direct hook
  const {
    resolveDirectConversation,
    getLatestMessagesAsc,
    getPagedMessagesDesc,
    subscribeToConversation,
    sendMessage,
    subscribeFriendEvents,
    getReadState,
    markRead,
  } = useChatSocketContext();

  // === helpers ===
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
    if (isToday(d)) return `${hh}:${mm}`;
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mo}.${yyyy} ${hh}:${mm}`;
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
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  const navigate = useNavigate();
  const openFriendProfile = useCallback(() => {
    navigate(`/profile/${friendNickname}`);
  }, [navigate, friendNickname]);

  // En alta scroll + okundu bildir
  useEffect(() => {
    const h = () => {
      if (conversationId) markRead(conversationId);
    };
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [conversationId, markRead]);

  // İlk açılış: resolve → read-state → latest → subscribe
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

        // READ-STATE: karşı tarafın last_read_at
        try {
          const rs = await getReadState(r.conversationId);
          if (mounted) {
            setFriendLastReadAt(rs.friendLastReadAt || null);
          }
        } catch (e) {
          console.warn("read-state failed", e);
        }

        const latest = await getLatestMessagesAsc(r.conversationId, PAGE_SIZE);
        if (!mounted) return;
        setMessages(latest);

        setNextPage(1);
        setHasMore(latest.length >= PAGE_SIZE);

        // canlı akış (mesaj + READ event)
        unsub = subscribeToConversation(r.conversationId, (raw: any) => {
          if (raw && raw.type === "READ") {
            // karşı taraf okuduysa güncelle
            if (Number(raw.readerUserId) === Number(r.friendUserId)) {
              setFriendLastReadAt(raw.lastReadAt || null);
            }
            return;
          }
          const m = raw as WsMessageDTO;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        });

        // (opsiyonel) friend events
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
  }, [meEmail, friendEmail]);

  // Eski sayfayı yükle (tepedeyken)
  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore) return;
    setLoadingOlder(true);

    const el = listRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    try {
      const pageData = await getPagedMessagesDesc(
        conversationId,
        nextPage,
        PAGE_SIZE
      ); // DESC gelir
      const olderAsc = pageData.content.slice().reverse(); // ASC sıraya çevir

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
        el2.scrollTop = delta; // prepend sonrası pozisyonu koru
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
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [hasMore, loadingOlder, loadOlder]);

  // Gönder
  const handleSend = useCallback(async () => {
    if (isRemoved) return;

    const text = input.trim();
    if (!text) return;

    try {
      const msg: ChatMessage = {
        from: meEmail,
        to: friendEmail,
        content: text,
      };
      await sendMessage(msg);
      setInput("");
    } catch (e) {
      console.error("Failed to send message:", e);
      if (
        e instanceof Error &&
        (e.message.includes("not found") || e.message.includes("forbidden"))
      ) {
        setIsRemoved(true);
        onRemoved?.();
      }
    }
  }, [input, meEmail, friendEmail, sendMessage, isRemoved, onRemoved]);

  // "Seen" olacak mesaj id'si
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

  // BALONCUK
  const Bubble = ({ m }: { m: WsMessageDTO }) => {
    const mine = m.senderId === myUserId;

    const name = mine ? meNickname : friendNickname;
    const bubbleCls = mine
      ? "bg-indigo-500/80 text-white border border-indigo-400/20"
      : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

    return (
      <div
        className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[75%] flex flex-col ${
            mine ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`text-xs text-gray-500 px-1 ${
              mine ? "text-right" : "text-left"
            } ${(() => {
              // Find the index of this message in the messages array
              const idx = messages.findIndex((msg) => msg.id === m.id);
              let showDetail = true;
              if (idx > 0) {
                const prev = messages[idx - 1];
                const prevTime = new Date(prev.createdAt).getTime();
                const currTime = new Date(m.createdAt).getTime();
                // If previous message is from the same sender and within 1 minute, hide name/time
                if (
                  prev.senderId === m.senderId &&
                  currTime - prevTime < 60 * 1000
                ) {
                  showDetail = false;
                }
              }
              return showDetail ? "mb-1" : "mb-0";
            })()}`}
          >
            {(() => {
              // Find the index of this message in the messages array
              const idx = messages.findIndex((msg) => msg.id === m.id);
              let showDetail = true;
              if (idx > 0) {
                const prev = messages[idx - 1];
                const prevTime = new Date(prev.createdAt).getTime();
                const currTime = new Date(m.createdAt).getTime();
                // If previous message is from the same sender and within 1 minute, hide name/time
                if (
                  prev.senderId === m.senderId &&
                  currTime - prevTime < 60 * 1000
                ) {
                  showDetail = false;
                }
              }
              return (
                showDetail && (
                  <span>
                    {name} • {fmtTime(m.createdAt)}
                  </span>
                )
              );
            })()}
          </div>
          <div
            className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg backdrop-blur-sm ${bubbleCls} ${(() => {
              // Find the index of this message in the messages array
              const idx = messages.findIndex((msg) => msg.id === m.id);
              let showDetail = true;
              if (idx > 0) {
                const prev = messages[idx - 1];
                const prevTime = new Date(prev.createdAt).getTime();
                const currTime = new Date(m.createdAt).getTime();
                if (
                  prev.senderId === m.senderId &&
                  currTime - prevTime < 60 * 1000
                ) {
                  showDetail = false;
                }
              }
              // If showDetail, add sharp corner
              if (showDetail) {
                return mine ? "rounded-tr-none" : "rounded-tl-none";
              }
              return "";
            })()}`}
            style={{ maxWidth: "100%" }}
          >
            {m.content}
          </div>
          {mine && seenMyMessageId === m.id && (
            <div className="mt-1 text-[11px] text-indigo-300/80 text-right">
              Seen
            </div>
          )}
        </div>
      </div>
    );
  };

  const DaySeparator = ({ label }: { label: string }) => (
    <div className="w-full flex justify-center my-3">
      <span className="text-xs px-3 py-2 rounded-full bg-gray-800/60 text-gray-400 border border-gray-700/30">
        {label}
      </span>
    </div>
  );

  // Sadece kırmızı nokta (sayı yok) — unread indikasyonu
  const UnreadDot = ({ show }: { show: boolean }) =>
    !show ? null : (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2 align-middle" />
    );

  return (
    <div className="fixed bottom-4 right-4 bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40">
      {/* header */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-800/40 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={openFriendProfile}
            onKeyDown={(e) => e.key === "Enter" && openFriendProfile()}
            className="tracking-wide text-gray-100 font-semibold hover:text-indigo-300 transition-colors focus:outline-none rounded-md px-1 cursor-pointer"
            title="Open profile"
            aria-label={`Open ${friendNickname}'s profile`}
          >
            {friendNickname}
          </button>

          <UnreadDot show={(unreadCount ?? 0) > 0} />

          {isRemoved && (
            <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
              Removed
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1"
          title="Close"
        >
          ✕
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
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)",
        }}
      >
        {loadingOlder && (
          <div className="text-center text-xs text-gray-500 mb-2">
            Loading older…
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : renderItems.length === 0 ? (
          <div className="text-gray-500">No messages yet.</div>
        ) : (
          renderItems.map((it) =>
            it.type === "sep" ? (
              <DaySeparator key={it.key} label={it.label} />
            ) : (
              <Bubble key={it.key} m={it.data} />
            )
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
