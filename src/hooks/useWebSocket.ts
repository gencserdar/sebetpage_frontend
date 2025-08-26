// src/hooks/useChatSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { api } from "../services/apiService";
import { ChatMessage } from "../types/ChatMessageType";
import { WsMessageDTO } from "../types/WSMessageDTO";

/** Re-export Page so messageService's import keeps working */
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

type ResolveResp = {
  conversationId: number;
  myUserId: number;
  friendUserId: number;
};

type SubRecord = {
  cb: (msg: WsMessageDTO | any) => void;
  sub?: StompSubscription;
};

export type ReadState = {
  myLastReadAt: string | null;
  friendLastReadAt: string | null;
  seenMyMessageId: number | null;
  myUserId: number;
  friendUserId: number;
};

/* ===========================
   Singleton WebSocket state (module level)
   =========================== */
let sharedClient: Client | null = null;
const convSubs: Map<number, SubRecord> = new Map();

let friendSub: StompSubscription | null = null;
const friendCallbacks: Set<(ev: any) => void> = new Set();

// Presence memory: userId -> online status
const presenceState: Map<number, boolean> = new Map();

function emitPresenceSnapshotTo(cb: (ev: any) => void) {
  const users = Array.from(presenceState.entries()).map(([userId, online]) => ({
    userId,
    online,
  }));
  cb({ type: "PRESENCE_SNAPSHOT", users });
}

export function useChatSocket(principalEmail: string) {
  const connectedOnceRef = useRef(false);

  useEffect(() => {
    if (!principalEmail) return;

    // Set JWT token in cookies for WebSocket authentication
    const token = localStorage.getItem("token");
    if (token) {
      document.cookie = `jwt-token=${token}; Path=/; SameSite=Lax`;
    }

    // Create shared client if it doesn't exist
    if (!sharedClient) {
      sharedClient = new Client({
        webSocketFactory: () => new SockJS("http://localhost:8085/ws"),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: () => {
          console.log("WebSocket connected for:", principalEmail);
          
          // Subscribe to friends queue for presence and friend events
          if (!friendSub) {
            friendSub = sharedClient!.subscribe("/user/queue/friends", (message: IMessage) => {
              try {
                const event = JSON.parse(message.body);
                
                // Add detailed logging for friend events
                console.log("Raw friend event received:", event);

                // Handle presence snapshot (initial state)
                if (event?.type === "PRESENCE_SNAPSHOT" && Array.isArray(event.users)) {
                  console.log("Processing presence snapshot with users:", event.users);
                  presenceState.clear();
                  event.users.forEach((u: any) =>
                    presenceState.set(Number(u.userId), !!u.online)
                  );
                } 
                // Handle presence updates (real-time changes)
                else if (event?.type === "PRESENCE_UPDATE") {
                  console.log("Processing presence update:", event);
                  presenceState.set(Number(event.userId), !!event.online);
                }
                // Handle friend request events
                else if (event?.type?.includes("FRIEND_REQUEST")) {
                  console.log("Processing friend request event:", {
                    type: event.type,
                    requestId: event.requestId,
                    request: event.request,
                    fullEvent: event
                  });
                }

                // Notify all subscribed components
                console.log("Notifying", friendCallbacks.size, "friend event subscribers");
                friendCallbacks.forEach((callback) => callback(event));
              } catch (error) {
                console.error("Friend event parse error:", error, "Raw message:", message.body);
              }
            });
          }

          // Request initial presence snapshot from server
          sharedClient!.publish({ 
            destination: "/app/friends/snapshot", 
            body: "{}" 
          });

          // Reestablish conversation subscriptions after reconnect
          convSubs.forEach((record, conversationId) => {
            try { 
              record.sub?.unsubscribe(); 
            } catch {}
            
            record.sub = sharedClient!.subscribe(
              `/user/queue/messages/${conversationId}`,
              (frame: IMessage) => {
                try { 
                  record.cb(JSON.parse(frame.body)); 
                } catch (error) { 
                  console.error("Message parse error:", error); 
                }
              }
            );
          });
        },
        
        onStompError: (frame) => {
          console.error("STOMP Broker error:", frame.headers["message"], frame.body);
        },
        
        onWebSocketError: (error) => {
          console.error("WebSocket error:", error);
        },
        
        onDisconnect: () => {
          console.log("WebSocket disconnected");
        }
      });

      sharedClient.activate();
      connectedOnceRef.current = true;
    } else if (!sharedClient.active && !sharedClient.connected) {
      // Reactivate if connection was lost
      sharedClient.activate();
    }

    // Cleanup function - don't disconnect as it's shared
    return () => {
      // The shared client should persist across component unmounts
      // Only disconnect when the entire app unmounts
    };
  }, [principalEmail]);

  /** Subscribe to a specific conversation for real-time messages */
  const subscribeToConversation = useCallback(
    (conversationId: number, onMessage: (msg: WsMessageDTO | any) => void) => {
      const client = sharedClient;

      // Store the subscription record
      const record: SubRecord = { cb: onMessage, sub: undefined };
      convSubs.set(conversationId, record);

      if (!client?.connected) {
        console.warn("WebSocket not connected yet, will subscribe after connection");
        return () => {
          const existingRecord = convSubs.get(conversationId);
          existingRecord?.sub?.unsubscribe();
          convSubs.delete(conversationId);
        };
      }

      // Unsubscribe existing subscription if any
      convSubs.get(conversationId)?.sub?.unsubscribe();

      // Create new subscription
      const subscription = client.subscribe(
        `/user/queue/messages/${conversationId}`, 
        (frame: IMessage) => {
          try {
            const messageData = JSON.parse(frame.body);
            onMessage(messageData);
          } catch (error) {
            console.error("Message parse error:", error);
          }
        }
      );

      // Update the record with the new subscription
      convSubs.set(conversationId, { cb: onMessage, sub: subscription });
      
      // Return unsubscribe function
      return () => {
        try { 
          subscription.unsubscribe(); 
        } catch {}
        convSubs.delete(conversationId);
      };
    },
    []
  );

  /** Resolve direct conversation between two users */
  const resolveDirectConversation = useCallback(
    async (fromEmail: string, toEmail: string): Promise<ResolveResp> => {
      const response = await api(
        `/api/conversations/direct/resolve?friendEmail=${encodeURIComponent(toEmail)}`
      );
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        try {
          const errorJson = errorText ? JSON.parse(errorText) : {};
          throw new Error(errorJson.error || `Resolve failed: ${response.status} ${response.statusText}`);
        } catch {
          throw new Error(`Resolve failed: ${response.status} ${response.statusText}`);
        }
      }
      
      return response.json() as Promise<ResolveResp>;
    },
    []
  );

  /** Send message using legacy ChatMessage format */
  const sendMessage = useCallback(
    async (message: ChatMessage) => {
      const client = sharedClient;
      if (!client?.connected) {
        console.warn("WebSocket not connected, message not sent");
        return;
      }
      
      const resolveResponse = await resolveDirectConversation(message.from, message.to);
      client.publish({
        destination: "/app/chat/send",
        body: JSON.stringify({
          conversationId: resolveResponse.conversationId,
          senderId: resolveResponse.myUserId,
          content: message.content,
        }),
      });
    },
    [resolveDirectConversation]
  );

  /** Send message directly to a conversation */
  const sendToConversation = useCallback(
    (conversationId: number, senderId: number, content: string) => {
      const client = sharedClient;
      if (!client?.connected) {
        console.warn("WebSocket not connected, message not sent");
        return;
      }
      
      client.publish({
        destination: "/app/chat/send",
        body: JSON.stringify({ conversationId, senderId, content }),
      });
    },
    []
  ); 

  /** Get latest messages in ascending order (for initial load) */
  const getLatestMessagesAsc = useCallback(
    async (conversationId: number, limit = 50): Promise<WsMessageDTO[]> => {
      const response = await api(
        `/api/conversations/${conversationId}/messages/latest?limit=${limit}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get latest messages: ${response.status} ${errorText}`);
      }
      
      return response.json() as Promise<WsMessageDTO[]>;
    }, 
    []
  );

  /** Get paginated messages in descending order (for loading older messages) */
  const getPagedMessagesDesc = useCallback(
    async (conversationId: number, page = 0, size = 50): Promise<Page<WsMessageDTO>> => {
      const response = await api(
        `/api/conversations/${conversationId}/messages?page=${page}&size=${size}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get paged messages: ${response.status} ${errorText}`);
      }
      
      return response.json() as Promise<Page<WsMessageDTO>>;
    },
    []
  );

  /** Get read state for a conversation */
  const getReadState = useCallback(
    async (conversationId: number): Promise<ReadState> => {
      const response = await api(`/api/conversations/${conversationId}/messages/read-state`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get read state: ${response.status} ${errorText}`);
      }
      
      return response.json() as Promise<ReadState>;
    }, 
    []
  );

  /** Mark conversation as read */
  const markRead = useCallback(
    async (conversationId: number) => {
      const response = await api(`/api/conversations/${conversationId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark as read: ${response.status} ${errorText}`);
      }
      
      return response.json();
    }, 
    []
  );

  /** Subscribe to friend events (presence updates, friend removal, etc.) */
  const subscribeFriendEvents = useCallback(
    (callback: (event: any) => void) => {
      friendCallbacks.add(callback);
      
      // Immediately send current presence snapshot to new subscriber
      emitPresenceSnapshotTo(callback);
      
      // Return unsubscribe function
      return () => {
        friendCallbacks.delete(callback);
      };
    }, 
    []
  );

  /** Get current online status of a user */
  const getUserOnlineStatus = useCallback(
    (userId: number): boolean => {
      return presenceState.get(userId) || false;
    },
    []
  );

  /** Disconnect and cleanup all WebSocket connections */
  const disconnect = useCallback(() => {
    try {
      // Unsubscribe from all conversations
      convSubs.forEach((record) => record.sub?.unsubscribe());
      convSubs.clear();
      
      // Unsubscribe from friends
      friendSub?.unsubscribe();
      friendSub = null;
      friendCallbacks.clear();
      
      // Clear presence state
      presenceState.clear();
      
      // Disconnect and cleanup client
      sharedClient?.deactivate();
      sharedClient = null;
      
      console.log("WebSocket disconnected and cleaned up");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, []);

  return {
    // Core chat functionality
    subscribeToConversation,
    resolveDirectConversation,
    sendMessage,
    sendToConversation,

    // Message history
    getLatestMessagesAsc,
    getPagedMessagesDesc,

    // Read receipts
    getReadState,
    markRead,

    // Friends and presence
    subscribeFriendEvents,
    getUserOnlineStatus,

    // Utility
    disconnect,
    
    // Connection state
    isConnected: sharedClient?.connected || false,
  };
}