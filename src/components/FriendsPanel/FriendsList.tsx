import { useEffect, useState } from "react";
import { getFriends } from "../../services/friendService";
import { UserDTO } from "../../types/userDTO";

export default function FriendsList() {
  const [friends, setFriends] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFriends() {
      try {
        const data = await getFriends();
        setFriends(data);
      } catch (e) {
        console.error("Failed to fetch friends:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchFriends();
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading friends...</div>;
  }

  if (friends.length === 0) {
    return <div className="text-gray-400">No friends yet.</div>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {friends.map((friend) => (
        <li
          key={friend.id}
          className="flex items-center justify-start p-2 rounded-md bg-white/5 hover:bg-white/10 transition"
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
