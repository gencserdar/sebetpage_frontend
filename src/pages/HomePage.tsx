import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import AuthPopup from "../components/AuthPopup";
import { isLoggedIn, logout } from "../services/authService";
import { api } from "../services/apiService";

export default function HomePage() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 }); // yüzdelik olarak

  useEffect(() => {
    if (isLoggedIn()) {
      api("/api/user/me")
        .then((res) => {
          if (res.status === 403 || res.status === 401) {
            logout();
            setLoggedIn(false);
          } else {
            setLoggedIn(true);
          }
        })
        .catch(() => {
          logout();
          setLoggedIn(false);
        });
    }
  }, []);

  const handleAuth = () => {
    setLoggedIn(true);
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <img src="/img4.png" alt="SebetPage Logo" className="w-20 h-20" />
          <span className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-400 bg-clip-text text-transparent">
            SebetPage
          </span>
        </div>

        <nav className="space-x-8 text-lg mr-auto ml-40">
          <a href="#" className="hover:text-pink-400 transition-colors">Features</a>
          <a href="#" className="hover:text-purple-400 transition-colors">Explore</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Community</a>
        </nav>

        {loggedIn ? (
          <button
            onClick={handleLogout}
            onMouseMove={handleMouseMove}
            style={{
              background: `radial-gradient(circle at ${hoverPos.x}% ${hoverPos.y}%, #ec4899, #8b5cf6, #f97316)`,
              transition: "background 0.2s ease-out"
            }}
            className="px-5 py-2 rounded-full font-medium text-white"
          >
            Log out
          </button>
        ) : (
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
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-40">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent">
          {loggedIn ? "Welcome back!" : "Create. Share. Connect."}
        </h1>
        <p className="text-gray-300 max-w-xl mb-8 text-lg">
          {loggedIn
            ? "This is your personalized dashboard."
            : "SebetPage helps you turn your creative passion into a meaningful experience."}
        </p>
        {!loggedIn && (
          <button
            onClick={() => setOpen(true)}
            className="px-8 py-3 text-lg rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-80 font-medium transition"
          >
            Get Started
          </button>
        )}
      </section>

      {/* Modal */}
      {!loggedIn && (
        <Modal open={open} onClose={() => setOpen(false)}>
          <AuthPopup
            initialMode="login"
            onSubmit={handleAuth}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
