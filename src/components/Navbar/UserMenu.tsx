import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import BlockedUsersPopup from "../BlockedUsersPopup";

interface UserMenuProps {
  onAuthClick: () => void;
}

export default function UserMenu({ onAuthClick }: UserMenuProps) {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x, y });
  };

  // Navigate to user's own profile
  const handleProfileClick = () => {
    if (user?.nickname) {
      navigate(`/profile/${user.nickname}`);
    }
    setDropdownOpen(false);
  };

  // Show blocked users popup
  const handleBlockedUsersClick = () => {
    setShowBlockedUsers(true);
    setDropdownOpen(false);
  };

  // Show login button if not authenticated
  if (!user && !loading) {
    return (
      <button
        onClick={onAuthClick}
        onMouseMove={handleMouseMove}
        style={{
          background: `radial-gradient(circle at ${hoverPos.x}% ${hoverPos.y}%, #6366f1, #8b5cf6, #ec4899)`,
          transition: "background 0.2s ease-out"
        }}
        className="px-5 py-2 rounded-full font-medium text-white"
      >
        Log in
      </button>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-24 h-8 bg-gray-700 rounded animate-pulse"></div>
    );
  }

  // Show user menu if authenticated
  if (user) {
    return (
      <>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <span>{user.name} {user.surname}</span>
            <svg
              className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg z-50 border border-gray-700">
              <button
                onClick={handleProfileClick}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={handleBlockedUsersClick}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors"
              >
                Blocked Users
              </button>
              <hr className="border-gray-700" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-red-400"
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {/* Blocked Users Popup */}
        {showBlockedUsers && (
          <BlockedUsersPopup onClose={() => setShowBlockedUsers(false)} />
        )}
      </>
    );
  }

  return null;
}