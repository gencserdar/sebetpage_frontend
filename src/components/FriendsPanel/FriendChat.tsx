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
}

type RenderItem =
  | { type: "sep"; key: string; label: string }
  | { type: "msg"; key: string; data: WsMessageDTO };

export default function FriendChat({
  meEmail,
  meNickname,
  friendEmail,
  friendNickname,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<WsMessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [friendUserId, setFriendUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    resolveDirectConversation,
    getLatestMessagesAsc,
    subscribeToConversation,
    sendMessage,
  } = useChatSocket(meEmail);

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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    )
      return "Yesterday";
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Gün ayraçlarını araya serpiştir
  const renderItems: RenderItem[] = useMemo(() => {
    if (!messages.length) return [];
    const items: RenderItem[] = [];
    let lastDayKey = "";
    for (const m of messages) {
      const d = new Date(m.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDayKey) {
        items.push({
          type: "sep",
          key: `sep-${dayKey}`,
          label: dayLabel(d),
        });
        lastDayKey = dayKey;
      }
      items.push({ type: "msg", key: `msg-${m.id}`, data: m });
    }
    return items;
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // İlk açılış: resolve → latest → subscribe
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const r = await resolveDirectConversation(meEmail, friendEmail);
        if (!mounted) return;
        setConversationId(r.conversationId);
        setMyUserId(r.myUserId);
        setFriendUserId(r.friendUserId);

        const latest = await getLatestMessagesAsc(r.conversationId, 50);
        if (!mounted) return;
        setMessages(latest);

        unsub = subscribeToConversation(r.conversationId, (m: WsMessageDTO) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        });
      } catch (e) {
        console.error("FriendChat init failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meEmail, friendEmail]);

  // Gönder
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMessage = { from: meEmail, to: friendEmail, content: text };
    void sendMessage(msg);
    setInput("");
  }, [input, meEmail, friendEmail, sendMessage]);

  // Baloncuk - SIMPLIFIED AND FIXED
  const Bubble = ({ m }: { m: WsMessageDTO }) => {
    // Let's try a more direct approach - check if senderId matches myUserId from state
    const mine = myUserId !== null && m.senderId === myUserId;
    
    console.log('FINAL DEBUG:', {
      senderId: m.senderId,
      myUserId: myUserId,
      comparison: `${m.senderId} === ${myUserId}`,
      mine: mine,
      content: m.content
    });

    const name = mine ? meNickname : friendNickname;

    const nameRow = (
      <div className={`text-xs text-gray-500 mb-1 px-1 ${mine ? "text-right" : "text-left"}`}>
        {name} • {fmtTime(m.createdAt)}
      </div>
    );

    const bubbleCls = mine
      ? "bg-indigo-500/80 text-white border border-indigo-400/20"
      : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

    return (
      <div className={`w-full flex mb-2 ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[75%]`}>
          {nameRow}
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

  return (
    <div className="fixed bottom-4 right-4 bg-gray-950/98 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-96 text-white border border-gray-800/40">
      {/* Başlık */}
      <div className="flex justify-between items-center mb-3 border-b border-gray-800/40 pb-3">
        <strong className="tracking-wide text-gray-100">{friendNickname}</strong>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1"
        >
          ✕
        </button>
      </div>

      {/* Mesaj listesi - DARK SCROLLBAR */}
      <div
        ref={listRef}
        className="h-80 overflow-y-auto mb-3 bg-gradient-to-b from-gray-900/60 to-black/80 p-3 rounded-xl custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(99, 102, 241, 0.5) rgba(0, 0, 0, 0.4)'
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.4);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.5);
              border-radius: 10px;
              transition: background-color 0.2s ease;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(99, 102, 241, 0.7);
            }
          `
        }} />
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

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-gray-800/40 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded-xl bg-gray-800/80 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/60 border border-gray-750/40 backdrop-blur-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
        />
        <button
          onClick={handleSend}  
          className="px-3 py-2 rounded-xl bg-indigo-500/80 hover:bg-indigo-400/80 transition-colors duration-200 disabled:opacity-50 border border-indigo-400/20 backdrop-blur-sm"
          disabled={!conversationId}
          title={!conversationId ? "Connecting..." : "Send"}
        >
          Send
        </button>
      </div>
    </div>
  );
}