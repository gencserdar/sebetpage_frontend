import { useState } from "react";
import FriendsList from "./FriendsList";

export default function FriendsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"friends" | "suggestions">("friends");

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-[350px] h-full bg-gray-900 text-white z-50 shadow-xl border-l border-gray-700 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Messages</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="flex justify-around border-b border-gray-700">
        {["friends", "Suggestions"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-2 px-4 ${
              activeTab === tab ? "border-b-2 border-blue-400 text-white" : "text-gray-400"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-3 overflow-y-auto flex-1">
        {activeTab === "friends" && <FriendsList />}
      </div>
    </div>
  );
}
