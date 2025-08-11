import { useEffect, useRef, useCallback } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { ChatMessage } from "../types/ChatMessageType";
import { WsMessageDTO } from "../types/WSMessageDTO";
import { api } from "../services/apiService";

/** Re-export Page so messageService's import keeps working */
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index
  size: number;
  first: boolean;
  last: boolean;
};

type PrivateHandler = (msg: ChatMessage) => void;

type ResolveResp = {
  conversationId: number;
  myUserId: number;       // senderId olarak kullanılacak
  friendUserId: number;
};

type SubRecord = {
  cb: (msg: WsMessageDTO) => void;
  sub?: StompSubscription;
};

export function useChatSocket(
  principalEmail: string,
  onPrivateMessage?: PrivateHandler // hâlâ /user/queue/messages dinlemek isteyenler için
) {
  const clientRef = useRef<Client | null>(null);
  const convSubsRef = useRef<Map<number, SubRecord>>(new Map());
  const resolveCacheRef = useRef<Map<string, ResolveResp>>(new Map()); // key: `${fromEmail}|${toEmail}`

  // --- friend events channel (for live friends/requests) ---
  const friendEventCallbacksRef = useRef(new Set<(ev: any) => void>());
  const friendSubRef = useRef<StompSubscription | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token in localStorage");
      return;
    }

    // JwtHandshakeInterceptor hangi cookie adını okuyorsa aynı olmalı:
    document.cookie = `jwt-token=${token}; path=/; SameSite=Lax`;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8085/ws"),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("WS connected as", principalEmail);

        // Eski özel-queue akışı (opsiyonel)
        if (onPrivateMessage) {
          client.subscribe("/user/queue/messages", (m: IMessage) => {
            try {
              onPrivateMessage(JSON.parse(m.body) as ChatMessage);
            } catch (err) {
              console.error("Parse error:", err);
            }
          });
        }

        // NEW: friend events (/user/queue/friends)
        if (!friendSubRef.current) {
          friendSubRef.current = client.subscribe("/user/queue/friends", (m: IMessage) => {
            try {
              const ev = JSON.parse(m.body);
              friendEventCallbacksRef.current.forEach(cb => cb(ev));
            } catch (e) {
              console.error("Friend event parse error:", e);
            }
          });
        }

        // Auto re-subscribe for conversations
        convSubsRef.current.forEach((rec, conversationId) => {
          try {
            rec.sub?.unsubscribe();
            const sub = client.subscribe(`/topic/chat/${conversationId}`, (frame: IMessage) => {
              try { rec.cb(JSON.parse(frame.body) as WsMessageDTO); }
              catch (e) { console.error("Parse error:", e); }
            });
            rec.sub = sub;
          } catch (e) {
            console.error("Auto-resubscribe failed for", conversationId, e);
          }
        });
      },
      onStompError: f => console.error("Broker error:", f.headers["message"], f.body),
      onWebSocketError: e => console.error("WebSocket error:", e),
      onWebSocketClose: e => console.log("WebSocket closed:", e),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      // tüm conversation subscription'larını kapat
      convSubsRef.current.forEach(rec => rec.sub?.unsubscribe());
      convSubsRef.current.clear();

      // friend events sub kapat
      friendSubRef.current?.unsubscribe();
      friendSubRef.current = null;
      friendEventCallbacksRef.current.clear();

      client.deactivate();
      document.cookie = "jwt-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalEmail, onPrivateMessage]);

  /** (İsteğe bağlı) belirli bir conversation'a subscribe edebilirsin */
  const subscribeToConversation = useCallback((
    conversationId: number,
    onMessage: (msg: WsMessageDTO) => void
  ) => {
    const c = clientRef.current;

    // callback’i kaydet (bağlı olmasa bile)
    const rec: SubRecord = { cb: onMessage, sub: undefined };
    convSubsRef.current.set(conversationId, rec);

    if (!c?.connected) {
      console.warn("WS not connected yet, will subscribe after connect");
      return () => {
        const r = convSubsRef.current.get(conversationId);
        r?.sub?.unsubscribe();
        convSubsRef.current.delete(conversationId);
      };
    }

    // aynı convId için eski sub varsa kapat
    convSubsRef.current.get(conversationId)?.sub?.unsubscribe();

    const sub = c.subscribe(`/topic/chat/${conversationId}`, (frame: IMessage) => {
      try { onMessage(JSON.parse(frame.body) as WsMessageDTO); }
      catch (e) { console.error("Parse error:", e); }
    });

    convSubsRef.current.set(conversationId, { cb: onMessage, sub });
    return () => {
      sub.unsubscribe();
      convSubsRef.current.delete(conversationId);
    };
  }, []);

  /** direct conversation resolve (REST) — cache'li */
  const resolveDirectConversation = useCallback(async (fromEmail: string, toEmail: string): Promise<ResolveResp> => {
    const key = `${fromEmail}|${toEmail}`;
    const cached = resolveCacheRef.current.get(key);
    if (cached) return cached;

    try {
      const res = await api(`/api/conversations/direct/resolve?friendEmail=${encodeURIComponent(toEmail)}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        try {
          const errorJson = errorText ? JSON.parse(errorText) : {};
          throw new Error(`Resolve failed: ${errorJson.error || res.statusText}`);
        } catch {
          throw new Error(`Resolve failed: ${res.status} ${res.statusText}`);
        }
      }
      const data = (await res.json()) as ResolveResp;
      resolveCacheRef.current.set(key, data);
      return data;
    } catch (error) {
      console.error('Error in resolveDirectConversation:', error);
      throw error;
    }
  }, []);

  /** Yeni AES akışını, eski sendMessage API üstünden kullan */
  const sendMessage = useCallback(async (msg: ChatMessage) => {
    const c = clientRef.current;
    if (!c?.connected) {
      console.warn("WS not connected, message skipped");
      return;
    }

    const r = await resolveDirectConversation(msg.from, msg.to);
    const payload = {
      conversationId: r.conversationId,
      senderId: r.myUserId,
      content: msg.content,
    };
    c.publish({ destination: "/app/chat/send", body: JSON.stringify(payload) });
  }, [resolveDirectConversation]);

  /** Dilersen doğrudan yeni API'yi de kullanabilirsin */
  const sendToConversation = useCallback((conversationId: number, senderId: number, content: string) => {
    const c = clientRef.current;
    if (!c?.connected) {
      console.warn("WS not connected, message skipped");
      return;
    }
    const payload = { conversationId, senderId, content };
    c.publish({ destination: "/app/chat/send", body: JSON.stringify(payload) });
  }, []);

  /** Tarihçe yardımcıları */
  const getLatestMessagesAsc = useCallback(async (conversationId: number, limit = 50) => {
    const res = await api(`/api/conversations/${conversationId}/messages/latest?limit=${limit}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`latest failed: ${res.status} ${t}`);
    }
    return res.json() as Promise<WsMessageDTO[]>;
  }, []);

  const getPagedMessagesDesc = useCallback(async (conversationId: number, page = 0, size = 50) => {
    const res = await api(`/api/conversations/${conversationId}/messages?page=${page}&size=${size}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`page failed: ${res.status} ${t}`);
    }
    return res.json() as Promise<Page<WsMessageDTO>>;
  }, []);

  /** Opsiyonel: manuel disconnect */
  const disconnect = useCallback(() => {
    try {
      convSubsRef.current.forEach(rec => rec.sub?.unsubscribe());
      convSubsRef.current.clear();
      friendSubRef.current?.unsubscribe();
      friendSubRef.current = null;
      friendEventCallbacksRef.current.clear();
      clientRef.current?.deactivate();
    } catch (e) {
      console.error("Disconnect error", e);
    }
  }, []);

  /** NEW: friend events subscribe */
  const subscribeFriendEvents = useCallback((cb: (ev: any) => void) => {
    friendEventCallbacksRef.current.add(cb);
    return () => { friendEventCallbacksRef.current.delete(cb); }; // <- void
  }, []);

  return {
    // chat
    subscribeToConversation,
    sendToConversation,
    sendMessage,
    disconnect,
    resolveDirectConversation,

    // history
    getLatestMessagesAsc,
    getPagedMessagesDesc,

    // friends
    subscribeFriendEvents,
  };
}
