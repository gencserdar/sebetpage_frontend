// PaginatedMessages.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { WsMessageDTO } from "../types/WSMessageDTO";
import { useChatSocketContext } from "../context/ChatSocketContext";

// Extended type for messages with optimistic updates
type ExtendedMessageDTO = WsMessageDTO & {
  tempId?: string;
  timestamp?: string;
};

interface PaginatedMessagesProps {
  conversationId: number;
  currentUserId: number;
}

const MESSAGES_PER_PAGE = 50;
const TOP_SCROLL_THRESHOLD = 100;      // üstten şu kadar px kalınca eski sayfa
const BOTTOM_SCROLL_THRESHOLD = 100;   // dip algısı için tolerans

export default function PaginatedMessages({
  conversationId,
  currentUserId,
}: PaginatedMessagesProps) {
  const [messages, setMessages] = useState<ExtendedMessageDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(0);     // 0: sadece bilgi için kullanılıyor
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const loadingRef = useRef(false);
  const isAtBottomRef = useRef(true); // dipteyiz bilgisini koru (yeni mesajda kaydırma için)

  const {
    subscribeToConversation,
    getLatestMessagesAsc,
    getPagedMessagesDesc,
    sendToConversation,
  } = useChatSocketContext();

  // === Yardımcılar ===
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    // iki kez rAF: layout + paint sonrası garanti
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomSentinelRef.current?.scrollIntoView({ block: "end", behavior });
      });
    });
  }, []);

  const recomputeBottomFlag = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_SCROLL_THRESHOLD;
    isAtBottomRef.current = nearBottom;
  }, []);

  // === İlk yükleme (latest ASC) + en alta kaydır ===
  const loadInitialMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setInitialLoad(true);

      const latest = await getLatestMessagesAsc(conversationId, MESSAGES_PER_PAGE);
      setMessages(latest);
      setCurrentPage(0);

      // toplam sayfa bilgisini çek
      const pageInfo = await getPagedMessagesDesc(conversationId, 0, MESSAGES_PER_PAGE);
      setTotalPages(pageInfo.totalPages);
      setHasMoreMessages(pageInfo.totalPages > 1);

      setInitialLoad(false);

      // paint sonrası kesin dibe
      scrollToBottom("auto");
      // flag'i güncelle
      recomputeBottomFlag();
    } catch (error) {
      console.error("Failed to load initial messages:", error);
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, [conversationId, getLatestMessagesAsc, getPagedMessagesDesc, scrollToBottom, recomputeBottomFlag]);

  // === Üstten eski sayfa yükle (DESC -> ASC prepend) + pozisyon koru ===
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !hasMoreMessages || loadingRef.current) return;

    const nextPage = currentPage + 1;
    if (nextPage >= totalPages) {
      setHasMoreMessages(false);
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      const pageData = await getPagedMessagesDesc(conversationId, nextPage, MESSAGES_PER_PAGE); // DESC
      const olderAsc = [...pageData.content].reverse(); // ASC sıraya çevir

      if (olderAsc.length > 0) {
        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        const prevScrollTop = container?.scrollTop ?? 0;

        setMessages((prev) => {
          // dedup emniyeti
          const existing = new Set(prev.map((m) => m.id));
          const filtered = olderAsc.filter((m) => !existing.has(m.id));
          return filtered.length ? [...filtered, ...prev] : prev;
        });

        setCurrentPage(nextPage);
        setHasMoreMessages(!pageData.last);

        // prepend sonrası pozisyonu koru (jump önleme)
        requestAnimationFrame(() => {
          const el = messagesContainerRef.current;
          if (!el) return;
          const newScrollHeight = el.scrollHeight;
          const delta = newScrollHeight - prevScrollHeight;
          el.scrollTop = prevScrollTop + delta;
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [conversationId, currentPage, totalPages, hasMoreMessages, getPagedMessagesDesc]);

  // === Scroll dinleyici: tepeye yaklaşınca eski sayfayı çağır, dip flag güncelle ===
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // dip flag
    recomputeBottomFlag();

    // tepe kontrolü
    const scrollTop = container.scrollTop;
    if (
      hasMoreMessages &&
      !loadingRef.current &&
      scrollTop <= TOP_SCROLL_THRESHOLD &&
      scrollTop < lastScrollTop.current
    ) {
      void loadOlderMessages();
    }

    lastScrollTop.current = scrollTop;
  }, [hasMoreMessages, loadOlderMessages, recomputeBottomFlag]);

  // === WS aboneliği: yeni mesaj / dedup / dipteyse kaydır ===
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToConversation(
      conversationId,
      (newMessage: WsMessageDTO | ExtendedMessageDTO) => {
        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.id === newMessage.id ||
              (msg.tempId &&
                (newMessage as ExtendedMessageDTO).tempId &&
                msg.tempId === (newMessage as ExtendedMessageDTO).tempId)
          );

          if (exists) {
            // temp -> gerçek dönüşümü vb.
            return prev.map((msg) =>
              msg.id === newMessage.id ||
              (msg.tempId &&
                (newMessage as ExtendedMessageDTO).tempId &&
                msg.tempId === (newMessage as ExtendedMessageDTO).tempId)
                ? (newMessage as ExtendedMessageDTO)
                : msg
            );
          }
          return [...prev, newMessage as ExtendedMessageDTO];
        });

        // dipteyse yumuşakça aşağı kaydır
        if (isAtBottomRef.current) {
          requestAnimationFrame(() => {
            bottomSentinelRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
          });
        }
      }
    );

    return unsubscribe;
  }, [conversationId, subscribeToConversation]);

  // === Konuşma değişirse baştan yükle ===
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setCurrentPage(0);
      setTotalPages(0);
      setHasMoreMessages(true);
      lastScrollTop.current = 0;
      isAtBottomRef.current = true;
      void loadInitialMessages();
    }
  }, [conversationId, loadInitialMessages]);

  // === Sıralama (ASC) ===
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.timestamp || b.createdAt).getTime();
      return timeA - timeB;
    });
  }, [messages]);

  // === Gönder (optimistic + scroll) ===
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !conversationId) return;

      // optimistic (server id gelince WS üzerinden dedup olur)
      const now = Date.now();
      const tempMessage: ExtendedMessageDTO = {
        id: now, // geçici
        tempId: `temp_${now}`,
        conversationId,
        senderId: currentUserId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);

      // gönder
      sendToConversation(conversationId, currentUserId, content.trim());

      // hemen dibe (kullanıcı yazarken dipte olma ihtimali yüksek)
      scrollToBottom("auto");
    },
    [conversationId, currentUserId, sendToConversation, scrollToBottom]
  );

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={handleScroll}
      >
        {/* Loading indicator for older messages */}
        {loading && hasMoreMessages && (
          <div className="text-center py-2">
            <div className="text-sm text-gray-400">Loading older messages...</div>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center py-2">
            <div className="text-xs text-gray-500">No more messages</div>
          </div>
        )}

        {/* Messages */}
        {sortedMessages.map((message, index) => (
          <div
            key={message.tempId || message.id || index}
            className={`flex ${
              message.senderId === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                message.senderId === currentUserId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              } ${message.tempId ? "opacity-70" : ""}`}
            >
              <div className="text-sm">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.senderId === currentUserId ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {new Date(message.timestamp || message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {sortedMessages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        )}

        {/* scroll hedefi */}
        <div ref={bottomSentinelRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
}

// Simple message input component
interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

function MessageInput({ onSendMessage }: MessageInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}
