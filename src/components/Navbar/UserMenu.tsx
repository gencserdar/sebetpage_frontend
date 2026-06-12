import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useProfileNavigation } from "../../hooks/useProfileNavigation";

interface UserMenuProps {
  onAuthClick: () => void;
  inline?: boolean;
  onNavigate?: () => void;
}

const rowClass =
  "flex min-h-[3.25rem] w-full items-center border-b border-white/[0.06] px-5 text-left text-base transition last:border-b-0 active:bg-white/10";

export default function UserMenu({ onAuthClick, inline = false, onNavigate }: UserMenuProps) {
  const navigate = useNavigate();
  const { openProfile } = useProfileNavigation();
  const { user, loading, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });

  const close = () => {
    setDropdownOpen(false);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
    close();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x, y });
  };

  const handleProfileClick = () => {
    if (user?.nickname) {
      openProfile(user.nickname, user.id);
    }
    close();
  };

  const handleSettingsClick = () => {
    navigate("/settings");
    close();
  };

  if (!user && !loading) {
    return (
      <button
        type="button"
        onClick={onAuthClick}
        onMouseMove={handleMouseMove}
        style={{
          background: `radial-gradient(circle at ${hoverPos.x}% ${hoverPos.y}%, #6366f1, #8b5cf6, #ec4899)`,
          transition: "background 0.2s ease-out",
        }}
        className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-white sm:px-5 sm:py-2"
      >
        Log in
      </button>
    );
  }

  if (loading) {
    return (
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-700 md:w-24" />
    );
  }

  if (!user) return null;

  const initials =
    `${user.name?.[0] ?? ""}${user.surname?.[0] ?? ""}`.toUpperCase() || "?";

  if (inline) {
    return (
      <section>
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/25 text-sm font-semibold text-indigo-100">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-white">
              {user.name} {user.surname}
            </p>
            <p className="truncate text-sm text-gray-500">@{user.nickname}</p>
          </div>
        </div>
        <button type="button" onClick={handleProfileClick} className={`${rowClass} text-gray-100`}>
          Profile
        </button>
        <button type="button" onClick={handleSettingsClick} className={`${rowClass} text-gray-100`}>
          Settings
        </button>
        <button type="button" onClick={() => void handleLogout()} className={`${rowClass} text-red-400`}>
          Log out
        </button>
      </section>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex max-w-[10rem] items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 transition hover:bg-white/20 sm:max-w-none sm:gap-2 sm:px-3 sm:py-2"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/25 text-xs font-semibold text-indigo-100 md:hidden">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden truncate text-sm md:inline">
          {user.name} {user.surname}
        </span>
        <svg
          className={`hidden h-4 w-4 shrink-0 transition-transform md:block ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-gray-700 bg-gray-800 shadow-lg sm:w-48">
          <button type="button" onClick={handleProfileClick} className="block w-full px-4 py-2 text-left transition-colors hover:bg-gray-700">
            Profile
          </button>
          <button type="button" onClick={handleSettingsClick} className="block w-full px-4 py-2 text-left transition-colors hover:bg-gray-700">
            Settings
          </button>
          <hr className="border-gray-700" />
          <button type="button" onClick={() => void handleLogout()} className="block w-full px-4 py-2 text-left text-red-400 transition-colors hover:bg-gray-700">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
