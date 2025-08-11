import { useEffect, useRef, useCallback } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { ChatMessage } from "../types/ChatMessageType";
import { WsMessageDTO } from "../types/WSMessageDTO";
import { api } from "../services/apiService";

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page
  size: number;
  first: boolean;
  last: boolean;
};

type PrivateHandler = (msg: ChatMessage) => void;

type ResolveResp = {
  conversationId: number;
  myUserId: number;
  friendUserId: number;
};

type SubRecord = {
  cb: (msg: WsMessageDTO) => void;
  sub?: StompSubscription;
};

export function useChatSocket(
  principalEmail: string,
  onPrivateMessage?: PrivateHandler
) {
  const clientRef = useRef<Client | null>(null);
  const convSubsRef = useRef<Map<number, SubRecord>>(new Map());
  const resolveCacheRef = useRef<Map<string, ResolveResp>>(new Map());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token in localStorage");
      return;
    }

    document.cookie = `jwt-token=${token}; path=/; SameSite=Lax`;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8085/ws"),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("WS connected as", principalEmail);

        if (onPrivateMessage) {
          client.subscribe("/user/queue/messages", (m: IMessage) => {
            try {
              onPrivateMessage(JSON.parse(m.body) as ChatMessage);
            } catch (err) {
              console.error("Parse error:", err);
            }
          });
        }

        // yeniden bağlanınca tüm topic’lere tekrar abone ol
        convSubsRef.current.forEach((rec, conversationId) => {
          try {
            rec.sub?.unsubscribe();
            const sub = client.subscribe(`/topic/chat/${conversationId}`, (frame: IMessage) => {
              try {
                rec.cb(JSON.parse(frame.body) as WsMessageDTO);
              } catch (e) {
                console.error("Parse error:", e);
              }
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
      convSubsRef.current.forEach(rec => rec.sub?.unsubscribe());
      convSubsRef.current.clear();
      client.deactivate();
      document.cookie = "jwt-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };
    // BAĞIMLILIK: sadece principalEmail. onPrivateMessage değiştirme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalEmail]);

  const subscribeToConversation = useCallback((
    conversationId: number,
    onMessage: (msg: WsMessageDTO) => void
  ) => {
    const c = clientRef.current;

    // callback’i kaydet
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

    // eski aboneyi kapat
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

  const resolveDirectConversation = useCallback(async (fromEmail: string, toEmail: string): Promise<ResolveResp> => {
    const key = `${fromEmail}|${toEmail}`;
    const cached = resolveCacheRef.current.get(key);
    if (cached) return cached;

    const res = await api(`/api/conversations/direct/resolve?friendEmail=${encodeURIComponent(toEmail)}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      try {
        const j = txt ? JSON.parse(txt) : {};
        throw new Error(j.error || `Resolve failed: ${res.status} ${res.statusText}`);
      } catch {
        throw new Error(`Resolve failed: ${res.status} ${res.statusText}`);
      }
    }
    const data = (await res.json()) as ResolveResp;
    resolveCacheRef.current.set(key, data);
    return data;
  }, []);

  const sendMessage = useCallback(async (msg: ChatMessage) => {
    const c = clientRef.current;
    if (!c?.connected) {
      console.warn("WS not connected, message skipped");
      return;
    }
    const r = await resolveDirectConversation(msg.from, msg.to);
    const payload = { conversationId: r.conversationId, senderId: r.myUserId, content: msg.content };
    c.publish({ destination: "/app/chat/send", body: JSON.stringify(payload) });
  }, [resolveDirectConversation]);

  const sendToConversation = useCallback((conversationId: number, senderId: number, content: string) => {
    const c = clientRef.current;
    if (!c?.connected) {
      console.warn("WS not connected, message skipped");
      return;
    }
    c.publish({ destination: "/app/chat/send", body: JSON.stringify({ conversationId, senderId, content }) });
  }, []);

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
    return res.json();
  }, []);

  const disconnect = useCallback(() => {
    try {
      convSubsRef.current.forEach(rec => rec.sub?.unsubscribe());
      convSubsRef.current.clear();
      clientRef.current?.deactivate();
    } catch (e) {
      console.error("Disconnect error", e);
    }
  }, []);

  return {
    subscribeToConversation,
    sendToConversation,
    sendMessage,
    disconnect,
    resolveDirectConversation,
    getLatestMessagesAsc,
    getPagedMessagesDesc,
  };
}
