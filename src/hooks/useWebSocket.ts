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
  id: number;
  type: "DIRECT" | "GROUP";
  userAId: number;
  userBId: number;
  title: string;
  createdAtMillis: number;
};

type SubRecord = {
  cb: (msg: WsMessageDTO | any) => void;
  sub?: StompSubscription;
};

type WsTicketResponse = {
  ticket: string;
  expiresInSeconds: number;
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

let unreadSub: StompSubscription | null = null;
const unreadCallbacks: Set<(ev: UnreadEvent) => void> = new Set();

// Presence memory: userId -> online status
const presenceState: Map<number, boolean> = new Map();

// Unread memory: total across all conversations + per-conversation breakdown,
// kept in sync with server-pushed UNREAD_COUNT_UPDATE frames so the navbar
// "Messages" badge can render without re-fetching on every render.
let totalUnread: number = 0;
const unreadByConversation: Map<number, number> = new Map();

// Identity of the user the current sharedClient was opened for. We compare
// this against the principalEmail passed to useChatSocket on every render —
// if it changed (logout → login as someone else, even in the same tab) we
// tear the old WS down before opening a new one. Without this, the previous
// session's STOMP connection stays alive and the new user's actions get
// attributed to the previous principal server-side.
let activePrincipal: string | null = null;
let nextWsTicket: string | null = null;

async function fetchWsTicket(): Promise<string> {
  const response = await api("/api/ws-ticket", { method: "POST" });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`WebSocket ticket failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as WsTicketResponse;
  if (!data.ticket) throw new Error("WebSocket ticket response did not include a ticket");
  return data.ticket;
}

// Generic entity-update plumbing.
//
// Today only USER_UPDATED is fanned out by the gateway, but the broadcaster
// pattern is intentionally generic — when group/post mutations start firing
// GROUP_UPDATED / POST_UPDATED events, add a sibling cache + callback set
// here and a matching dispatch case in the friend-queue handler below.
//
// userCache: id -> latest known user row, populated by USER_UPDATED frames
// (and seeded ad-hoc by callers via cacheUser if they want). Components can
// look up the freshest copy without holding a subscription.
const userCache: Map<number, any> = new Map();
const userUpdateCallbacks: Set<(user: any) => void> = new Set();

export type UserUpdateEvent = {
  type: "USER_UPDATED";
  entityType: "USER";
  entity: { id: number; email?: string; nickname: string; name?: string; surname?: string; profileImageUrl?: string };
};

export type UnreadEvent = {
  conversationId: number;
  unreadCount: number;
  totalUnreadCount: number;
};

function emitPresenceSnapshotTo(cb: (ev: any) => void) {
  const users = Array.from(presenceState.entries()).map(([userId, online]) => ({
    userId,
    online,
  }));
  cb({ type: "PRESENCE_SNAPSHOT", users });
}

/**
 * Hard-reset the WS singleton. Closes the STOMP client, unsubscribes every
 * tracked subscription, and clears all module-level caches (presence,
 * unread counts, callback sets) so the next reconnect starts from a clean
 * slate. Called on logout (principalEmail goes empty) or principal swap
 * (different user logs in on the same tab).
 *
 * Exported so non-hook code (UserContext.logout) can fire-and-forget the
 * teardown without waiting for React to re-render and the hook's useEffect
 * to notice principalEmail went empty. That extra round-trip leaves a
 * window in which the server still considers the user online and
 * presence-broadcasts late.
 */
export function tearDownChatSocket() { tearDownSocket(); }

function tearDownSocket() {
  try {
    convSubs.forEach((r) => { try { r.sub?.unsubscribe(); } catch {} });
    convSubs.clear();
    try { friendSub?.unsubscribe(); } catch {}
    friendSub = null;
    friendCallbacks.clear();
    try { unreadSub?.unsubscribe(); } catch {}
    unreadSub = null;
    unreadCallbacks.clear();
    presenceState.clear();
    unreadByConversation.clear();
    totalUnread = 0;
    userCache.clear();
    userUpdateCallbacks.clear();
    if (sharedClient) {
      try { sharedClient.deactivate(); } catch {}
    }
    sharedClient = null;
    activePrincipal = null;
  } catch (e) {
    console.warn("WS teardown error:", e);
  }
}

export function useChatSocket(principalEmail: string) {
  const connectedOnceRef = useRef(false);

  useEffect(() => {
    // Logout: principalEmail empty. Tear the previous socket down so it
    // doesn't keep the old user's session attached when someone else logs
    // in on the same tab.
    if (!principalEmail) {
      if (sharedClient || activePrincipal) tearDownSocket();
      return;
    }

    // Identity swap (logout → re-login as someone else, same tab). Tear
    // down the previous user's connection before opening the new one;
    // otherwise the new user's STOMP frames go out on the old user's
    // session and the server attributes everything to the previous
    // principal.
    if (activePrincipal && activePrincipal !== principalEmail) {
      tearDownSocket();
    }

    // SockJS cannot attach Authorization headers to the HTTP handshake. To
    // avoid leaking the real access JWT in URL logs, the gateway mints a
    // short-lived WS ticket through an authenticated REST call and the
    // handshake verifies that ticket instead.
    const buildWsUrl = () => {
      const ticket = nextWsTicket;
      nextWsTicket = null;
      // Gateway URL is build-time — provided via REACT_APP_GATEWAY_BASE_URL
      // (or its synonym REACT_APP_API_BASE_URL) in `.env` of the frontend.
      // Falls back to same-origin if neither is set: that path works behind
      // a reverse proxy and via CRA's `proxy` field during dev.
      const base =
        process.env.REACT_APP_GATEWAY_BASE_URL ||
        process.env.REACT_APP_API_BASE_URL ||
        window.location.origin;
      return ticket
        ? `${base}/ws?ticket=${encodeURIComponent(ticket)}`
        : `${base}/ws`;
    };

    // Create shared client if it doesn't exist
    if (!sharedClient) {
      activePrincipal = principalEmail;
      sharedClient = new Client({
        beforeConnect: async () => {
          nextWsTicket = await fetchWsTicket();
        },
        webSocketFactory: () => new SockJS(buildWsUrl()),
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
                // Generic entity-update fan-out. Today the gateway only
                // emits USER_UPDATED; future GROUP_UPDATED / POST_UPDATED
                // can branch off entityType in their own callback sets.
                else if (event?.type === "USER_UPDATED" && event?.entity?.id != null) {
                  const u = event.entity;
                  userCache.set(Number(u.id), u);
                  userUpdateCallbacks.forEach((cb) => {
                    try { cb(u); } catch (e) { console.error("user-update callback error:", e); }
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

          // Subscribe to per-user unread updates so the Messages badge can
          // refresh from server-pushed UNREAD_COUNT_UPDATE frames.
          if (!unreadSub) {
            unreadSub = sharedClient!.subscribe("/user/queue/unread", (message: IMessage) => {
              try {
                const event = JSON.parse(message.body) as UnreadEvent;
                if (typeof event?.conversationId === "number" && event.conversationId > 0) {
                  unreadByConversation.set(event.conversationId, event.unreadCount ?? 0);
                }
                // chat-service only fills totalUnreadCount on the reader's own
                // mark-read echo. For incoming-message bumps it defaults to 0
                // (proto default), which would wipe the badge — so we always
                // recompute the total locally from the per-conversation cache
                // and let it converge on its own.
                let sum = 0;
                unreadByConversation.forEach(v => { sum += v; });
                totalUnread = sum;
                unreadCallbacks.forEach((cb) => cb({
                  conversationId: event.conversationId,
                  unreadCount: event.unreadCount,
                  totalUnreadCount: totalUnread,
                }));
              } catch (err) {
                console.error("Unread event parse error:", err);
              }
            });
          }

          // Hydrate the unread cache once on connect — UNREAD_COUNT_UPDATE
          // frames only carry deltas, so we need a baseline.
          api("/api/chat/unread-counts")
            .then(r => r.ok ? r.json() : null)
            .then((data: any) => {
              if (!data) return;
              unreadByConversation.clear();
              const per = data.perConversation || {};
              Object.keys(per).forEach((k) => {
                unreadByConversation.set(Number(k), Number(per[k]) || 0);
              });
              totalUnread = Number(data.totalCount) || 0;
              unreadCallbacks.forEach((cb) => cb({
                conversationId: 0,
                unreadCount: 0,
                totalUnreadCount: totalUnread,
              }));
            })
            .catch(() => { /* non-fatal */ });

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

  /** Resolve direct conversation with another user by numeric userId.
   *  The gateway derives `me` from the authenticated principal, so only the
   *  other party's id is needed. */
  const resolveDirectConversation = useCallback(
    async (otherUserId: number): Promise<ResolveResp> => {
      const response = await api(
        `/api/chat/conversations/direct?otherUserId=${encodeURIComponent(String(otherUserId))}`,
        { method: "POST" }
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

  /** Send a message using the legacy ChatMessage shape. The monolith used
   *  email-addressed messages; the new gateway is id-addressed, so we do not
   *  support this overload anymore. Callers should resolve the conversation
   *  once and call `sendToConversation` with the ids. */
  const sendMessage = useCallback(
    async (_message: ChatMessage) => {
      console.warn(
        "sendMessage(ChatMessage) is deprecated — use sendToConversation(conversationId, senderId, content)."
      );
    },
    []
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
        `/api/chat/conversations/${conversationId}/latest?limit=${limit}`
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
        `/api/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`
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
      const response = await api(`/api/chat/conversations/${conversationId}/read-state`);
      
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
      const response = await api(`/api/chat/conversations/${conversationId}/read`, {
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

  /** Subscribe to unread-count updates. Fires once immediately with the cached
   *  total so consumers don't have to handle a "no data yet" state. */
  const subscribeUnreadEvents = useCallback(
    (callback: (event: UnreadEvent) => void) => {
      unreadCallbacks.add(callback);
      callback({ conversationId: 0, unreadCount: 0, totalUnreadCount: totalUnread });
      return () => {
        unreadCallbacks.delete(callback);
      };
    },
    []
  );

  /** Read the cached total-unread count without subscribing. */
  const getTotalUnread = useCallback((): number => totalUnread, []);

  /** Read the cached unread count for a single conversation. */
  const getConversationUnread = useCallback(
    (conversationId: number): number => unreadByConversation.get(conversationId) || 0,
    []
  );

  /** Subscribe to USER_UPDATED frames. Callback gets the full updated user
   *  row (id, email, nickname, name, surname, profileImageUrl). Components
   *  holding cached user references should patch them on each event. */
  const subscribeUserUpdates = useCallback(
    (callback: (user: any) => void) => {
      userUpdateCallbacks.add(callback);
      return () => { userUpdateCallbacks.delete(callback); };
    },
    []
  );

  /** Get the freshest known copy of a user. Returns undefined if we've
   *  never seen them in a USER_UPDATED frame this session. */
  const getCachedUser = useCallback(
    (id: number) => userCache.get(Number(id)),
    []
  );

  /** Disconnect and cleanup all WebSocket connections.
   *  Delegates to the module-level tearDown so logout-on-principal-swap
   *  and explicit disconnect() share one code path. */
  const disconnect = useCallback(() => {
    tearDownSocket();
    console.log("WebSocket disconnected and cleaned up");
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

    // Unread badges
    subscribeUnreadEvents,
    getTotalUnread,
    getConversationUnread,

    // Generic entity updates (today: users; tomorrow: groups, posts)
    subscribeUserUpdates,
    getCachedUser,

    // Utility
    disconnect,
    
    // Connection state
    isConnected: sharedClient?.connected || false,
  };
}
