import { useEffect, useState } from "react";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useUser } from "../../context/UserContext";

interface FriendsListProps {
  onSelectFriend: (friend: UserDTO) => void;
}

export default function FriendsList({ onSelectFriend }: FriendsListProps) {
  const [friends, setFriends] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // use current user's email for WS principal
  const { user } = useUser();
  const { subscribeFriendEvents } = useChatSocket(user?.email || "");

  const reload = async () => {
    try {
      setLoading(true);
      const data = await getFriends();
      setFriends(data);
    } catch (e) {
      console.error("Failed to fetch friends:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();

    // live updates: friend add/remove or request-accepted → refresh list
    const unsub = subscribeFriendEvents((ev: any) => {
      const t = ev?.type;
      if (t === "FRIEND_ADDED" || t === "FRIEND_REMOVED" || t === "REQUEST_ACCEPTED") {
        reload();
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="text-gray-400">Loading friends...</div>;
  if (friends.length === 0) return <div className="text-gray-400">No friends yet.</div>;

  return (
    <ul className="flex flex-col gap-3">
      {friends.map((friend) => (
        <li
          key={friend.id}
          onClick={() => onSelectFriend(friend)}
          className="flex items-center justify-start p-2 rounded-md bg-white/5 hover:bg-white/10 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={friend.profileImageUrl || "/default_pp.png"}
              alt="pfp"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="text-white font-medium">{friend.nickname}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
