import { useEffect, useState, useCallback, useMemo } from "react";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";
import { useChatSocket } from "../../hooks/useWebSocket";
import { useUser } from "../../context/UserContext";

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

  // WS principal
  const { user } = useUser();
  const { subscribeFriendEvents } = useChatSocket(user?.email || "");

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

    // live updates
    const unsub = subscribeFriendEvents((raw: PresenceEvent) => {
      const t = raw?.type;

      if (t === "FRIEND_ADDED" || t === "FRIEND_REMOVED" || t === "REQUEST_ACCEPTED") {
        void reload();
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
  }, [reload, subscribeFriendEvents, applyPresence]);

  const onlineFriends = useMemo(
    () => friends.filter(f => onlineIds.has(f.id)),
    [friends, onlineIds]
  );
  const offlineFriends = useMemo(
    () => friends.filter(f => !onlineIds.has(f.id)),
    [friends, onlineIds]
  );

  if (loading) return <div className="text-gray-400">Loading friends...</div>;
  if (friends.length === 0) return <div className="text-gray-400">No friends yet.</div>;

  const FriendRow = ({ f, online }: { f: UserDTO; online: boolean }) => (
    <li
      key={f.id}
      onClick={() => onSelectFriend(f)}
      className={[
        "flex items-center justify-start p-2 rounded-md transition cursor-pointer border",
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
    </li>
  );

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