import { useState } from "react";
import FriendsList from "./FriendsList";
import FriendChat from "./FriendChat";
import { useUser } from "../../context/UserContext";
import { UserDTO } from "../../types/userDTO";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsPanel({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] =
    useState<"friends" | "suggestions">("friends");
  const [selectedFriend, setSelectedFriend] = useState<UserDTO | null>(null);
  const { user } = useUser();

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-[350px] h-full bg-gray-900 text-white z-50 shadow-xl border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Messages</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-around border-b border-gray-700">
        {["friends", "suggestions"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-2 px-4 ${
              activeTab === tab
                ? "border-b-2 border-blue-400 text-white"
                : "text-gray-400"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1">
        {activeTab === "friends" && (
          <FriendsList onSelectFriend={setSelectedFriend} />
        )}
      </div>

      {/* Chat Window */}
      {selectedFriend && user && (
        <FriendChat
          meEmail={user.email}
          meNickname={user.nickname}
          friendEmail={selectedFriend.email}
          friendNickname={selectedFriend.nickname}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
}
