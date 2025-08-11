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
    <div className="fixed top-0 right-0 w-[350px] h-full bg-gray-950/98 backdrop-blur-xl text-white z-50 shadow-2xl border-l border-gray-800/40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/40 bg-gray-900/80">
        <h2 className="text-lg font-semibold text-gray-100">Messages</h2>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-around border-b border-gray-800/40 bg-gray-900/50">
        {["friends", "suggestions"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-3 px-4 transition-all duration-200 text-sm font-medium ${
              activeTab === tab
                ? "border-b-2 border-indigo-400 text-white bg-gray-900/60"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/30"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1 bg-gradient-to-b from-gray-950/60 to-black/80 custom-scrollbar">
        <style dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.4);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.5);
              border-radius: 10px;
              transition: background-color 0.2s ease;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(99, 102, 241, 0.7);
            }
          `
        }} />
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