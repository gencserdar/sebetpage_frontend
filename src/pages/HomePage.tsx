import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AuthPopup from "../components/AuthPopup";
import ProfilePopup from "../components/ProfilePopup";
import { useUser } from "../context/UserContext";


interface ProfilePopupProps {
  onClose: () => void;
  user: any; // burayı UserDTO tipine çevirebilirsin
}

export default function HomePage() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });
  const { user, loading, logout } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleAuth = () => {
    setOpen(false);
  };

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 relative">
        <div className="flex items-center space-x-3">
          <img src="/img4.png" alt="SebetPage Logo" className="w-20 h-20" />
          <span className="text-3xl font-bold tracking-tight mb-2 bg-white bg-clip-text text-transparent">
            SebetPage
          </span>
        </div>

        <nav className="space-x-8 text-lg mr-auto ml-40">
          <a href="#" className="hover:text-pink-400 transition-colors">Features</a>
          <a href="#" className="hover:text-purple-400 transition-colors">Explore</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Community</a>
        </nav>

        {/* Sağ taraf */}
        {!user && !loading && (
          <button
            onClick={() => setOpen(true)}
            onMouseMove={handleMouseMove}
            style={{
              background: `radial-gradient(circle at ${hoverPos.x}% ${hoverPos.y}%, #6366f1, #8b5cf6, #ec4899)`,
              transition: "background 0.2s ease-out"
            }}
            className="px-5 py-2 rounded-full font-medium text-white"
          >
            Log in
          </button>
        )}

        {loading && (
          <div className="w-24 h-8 bg-gray-700 rounded animate-pulse"></div>
        )}

        {user && !loading && (
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
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg">
                <button
                  onClick={() => setProfileOpen(true)}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-40">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent">
          {user ? "Welcome back!" : "Create. Share. Connect."}
        </h1>
        <p className="text-gray-300 max-w-xl mb-8 text-lg">
          {user
            ? "This is your personalized dashboard."
            : "SebetPage helps you turn your creative passion into a meaningful experience."}
        </p>
        {!user && (
          <button
            onClick={() => setOpen(true)}
            className="px-8 py-3 text-lg rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-80 font-medium transition"
          >
            Get Started
          </button>
        )}
      </section>

      {/* Login Modal */}
      {!user && (
        <Modal open={open} onClose={() => setOpen(false)}>
          <AuthPopup
            initialMode="login"
            onSubmit={handleAuth}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}

      {/* Profile Modal */}
      {profileOpen && user && (
        <ProfilePopup
          onClose={() => setProfileOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}
