import { useEffect, useRef } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface ChatMessage {
  from: string;     // principal (email)
  to: string;       // principal (email)
  content: string;
  timestamp?: string;
}

export function useChatSocket(
  principalEmail: string,
  onMessage: (msg: ChatMessage) => void
) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token in localStorage");
      return;
    }

    /* Token’i cookie’ye koy – interceptor okuyacak */
    document.cookie = `jwt-token=${token}; path=/; SameSite=Lax`;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8085/ws"),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("WS connected as", principalEmail);

        client.subscribe("/user/queue/messages", (m: IMessage) => {
          try {
            onMessage(JSON.parse(m.body) as ChatMessage);
          } catch (err) {
            console.error("Parse error:", err);
          }
        });
      },
      onStompError: f =>
        console.error("Broker error:", f.headers["message"], f.body),
      onWebSocketError: e => console.error("WebSocket error:", e),
      onWebSocketClose: e => console.log("WebSocket closed:", e),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      document.cookie =
        "jwt-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };
  }, [principalEmail, onMessage]);

  const sendMessage = (msg: ChatMessage) => {
    const c = clientRef.current;
    if (c?.connected) {
      c.publish({ destination: "/app/chat", body: JSON.stringify(msg) });
    } else {
      console.warn("WS not connected, message skipped");
    }
  };

  return { sendMessage };
}
