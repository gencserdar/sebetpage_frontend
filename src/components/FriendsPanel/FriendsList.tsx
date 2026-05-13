import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";
import { useChatSocket } from "../../hooks/useWebSocket";
import { useUser } from "../../context/UserContext";
import { api } from "../../services/apiService";

interface FriendsListProps {
  onSelectFriend: (friend: UserDTO) => void;
}

type PresenceEvent =
  | { type: "PRESENCE_SNAPSHOT"; users: Array<{ userId: number; online: boolean }> }
  | { type: "PRESENCE_UPDATE"; userId: number; online: boolean }
  | { type: "FRIEND_ONLINE"; userId: number }
  | { type: "FRIEND_OFFLINE"; userId: number }
  | { type: "FRIEND_ADDED" | "FRIEND_REMOVED" | "REQUEST_ACCEPTED" }
  | Record<string, any>;

export default function FriendsList({ onSelectFriend }: FriendsListProps) {
  const [friends, setFriends] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Presence: online olan arkadaş id’leri
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  // friendId -> conversationId, used to translate per-conversation unread
  // updates from the WS layer back into the friend rows we render here.
  const [convByFriend, setConvByFriend] = useState<Map<number, number>>(new Map());
  // friendId -> unread count
  const [unreadByFriend, setUnreadByFriend] = useState<Map<number, number>>(new Map());

  // Keep a ref so the unread subscription callback (which captures stale state)
  // can read the latest map without resubscribing on every change.
  const convByFriendRef = useRef(convByFriend);
  useEffect(() => { convByFriendRef.current = convByFriend; }, [convByFriend]);

  // WS principal
  const { user } = useUser();
  const { subscribeFriendEvents, subscribeUnreadEvents, getConversationUnread, subscribeUserUpdates } =
    useChatSocket(user?.email || "");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFriends();
      setFriends(data);

      // Eğer API friend.online döndürüyorsa ilk snapshot’ı oradan yakala
      const preset = new Set<number>();
      for (const f of data as any[]) {
        if (f?.online) preset.add((f as UserDTO).id);
      }
      if (preset.size) setOnlineIds(preset);
    } catch (e) {
      console.error("Failed to fetch friends:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Build the friendId -> conversationId map from the user's existing direct
  // conversations. Friends with whom there's never been a chat won't have a
  // conversation row yet, so they simply won't get badges (count is 0 anyway).
  const reloadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api("/api/chat/conversations");
      if (!res.ok) return;
      const rows: any[] = await res.json();
      const map = new Map<number, number>();
      for (const c of rows) {
        if (c?.type !== "DIRECT") continue;
        const other = c.userAId === user.id ? c.userBId : c.userAId;
        map.set(Number(other), Number(c.id));
      }
      setConvByFriend(map);

      // Seed unread counts from the WS hook's hydrated cache so badges show
      // immediately on panel open instead of waiting for the next event.
      const seed = new Map<number, number>();
      map.forEach((convId, friendId) => {
        const u = getConversationUnread(convId);
        if (u > 0) seed.set(friendId, u);
      });
      setUnreadByFriend(seed);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  }, [user, getConversationUnread]);

  // Presence uygulayıcı
  const applyPresence = useCallback((userId: number, isOnline: boolean) => {
    setOnlineIds(prev => {
      const next = new Set(prev);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  useEffect(() => {
    void reload();
    void reloadConversations();

    // live updates
    const unsub = subscribeFriendEvents((raw: PresenceEvent) => {
      const t = raw?.type;

      if (t === "FRIEND_ADDED" || t === "FRIEND_REMOVED" || t === "REQUEST_ACCEPTED") {
        void reload();
        void reloadConversations();
        return;
      }

      // Presence formatlarını destekle
      if (t === "PRESENCE_SNAPSHOT" && Array.isArray((raw as any).users)) {
        const ids = new Set<number>();
        for (const u of (raw as any).users) if (u?.online) ids.add(u.userId);
        setOnlineIds(ids);
        return;
      }
      if (t === "PRESENCE_UPDATE") {
        applyPresence((raw as any).userId, (raw as any).online);
        return;
      }
      if (t === "FRIEND_ONLINE") {
        applyPresence((raw as any).userId, true);
        return;
      }
      if (t === "FRIEND_OFFLINE") {
        applyPresence((raw as any).userId, false);
        return;
      }
    });

    return () => unsub();
  }, [reload, reloadConversations, subscribeFriendEvents, applyPresence]);

  // Real-time profile sync — when a friend renames themselves / changes
  // photo, patch the matching entry in our local list so the displayed
  // nickname / avatar / etc. don't drift.
  useEffect(() => {
    const unsub = subscribeUserUpdates((u: any) => {
      const uid = Number(u.id);
      setFriends(prev => prev.map(f => (f.id === uid ? { ...f, ...u } : f)));
    });
    return () => unsub();
  }, [subscribeUserUpdates]);

  // Per-friend unread tracking — translates conversationId → friendId via
  // the lookup map and stores a count we render alongside each row.
  useEffect(() => {
    const unsub = subscribeUnreadEvents((evt) => {
      // conversationId === 0 is the hydration ping the WS hook fires after
      // /api/chat/unread-counts populates the cache. Recompute everything.
      if (!evt.conversationId) {
        const next = new Map<number, number>();
        convByFriendRef.current.forEach((convId, friendId) => {
          const u = getConversationUnread(convId);
          if (u > 0) next.set(friendId, u);
        });
        setUnreadByFriend(next);
        return;
      }
      // Find which friend this conversation belongs to.
      let matchedFriendId: number | null = null;
      convByFriendRef.current.forEach((convId, friendId) => {
        if (convId === evt.conversationId) matchedFriendId = friendId;
      });
      if (matchedFriendId === null) {
        // We may not have heard about this conversation yet — refetch the
        // mapping in case it was just created (first message between friends).
        void reloadConversations();
        return;
      }
      setUnreadByFriend(prev => {
        const next = new Map(prev);
        if ((evt.unreadCount ?? 0) > 0) next.set(matchedFriendId!, evt.unreadCount);
        else next.delete(matchedFriendId!);
        return next;
      });
    });
    return () => unsub();
  }, [subscribeUnreadEvents, getConversationUnread, reloadConversations]);

  const onlineFriends = useMemo(
    () => friends.filter(f => onlineIds.has(f.id)),
    [friends, onlineIds]
  );
  const offlineFriends = useMemo(
    () => friends.filter(f => !onlineIds.has(f.id)),
    [friends, onlineIds]
  );

  if (loading && friends.length === 0) return <div className="py-6" />;
  if (friends.length === 0) return <div className="text-gray-400">No friends yet.</div>;

  const FriendRow = ({ f, online }: { f: UserDTO; online: boolean }) => {
    const unread = unreadByFriend.get(f.id) || 0;
    return (
      <li
        key={f.id}
        onClick={() => onSelectFriend(f)}
        className={[
          "flex items-center justify-between p-2 rounded-md transition cursor-pointer border",
          online
            ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/20"
            : "bg-white/5 hover:bg-white/10 border-transparent",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={f.profileImageUrl || "/default_pp.png"}
              alt="pfp"
              className="w-10 h-10 rounded-full object-cover"
            />
            {/* küçük status noktası */}
            <span
              className={[
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-gray-900",
                online ? "bg-emerald-400" : "bg-gray-500",
              ].join(" ")}
              title={online ? "Online" : "Offline"}
            />
          </div>
          <span className="text-white font-medium">{f.nickname}</span>
        </div>
        {unread > 0 && (
          <span
            className="ml-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
            title={`${unread} unread`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ONLINE SECTION */}
      {onlineFriends.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Online friends
          </div>
          <ul className="flex flex-col gap-3">
            {onlineFriends.map(f => (
              <FriendRow key={f.id} f={f} online />
            ))}
          </ul>
        </div>
      )}

      {/* OFFLINE SECTION */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Offline friends
        </div>
        <ul className="flex flex-col gap-3">
          {offlineFriends.map(f => (
            <FriendRow key={f.id} f={f} online={false} />
          ))}
        </ul>
      </div>
    </div>
  );
}
