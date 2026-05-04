import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react"; // en üstte ekle
import Modal from "../components/Login/Modal";
import AuthPopup from "../components/Login/AuthPopup";
import ProfilePopup from "../components/ProfilePopup";
import Navbar from "../components/Navbar/Navbar";
import { useUser } from "../context/UserContext";
import { getUserByNickname, getUserById } from "../services/userService";
import { UserDTO } from "../types/userDTO";
import FriendsPanel from "../components/FriendsPanel/FriendsPanel";
import FriendChat from "../components/FriendsPanel/FriendChat";
import { useChatSocket } from "../hooks/useWebSocket";

export default function HomePage() {
  const navigate = useNavigate();
  const { nickname } = useParams<{ nickname: string }>();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const [selectedFriend, setSelectedFriend] = useState<UserDTO | null>(null);

  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserDTO | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Tap into the WS singleton so the Messages button gets a live badge whenever
  // a message arrives in any conversation, even when the panel is closed.
  const { subscribeUnreadEvents, subscribeUserUpdates } = useChatSocket(user?.email || "");

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUnreadEvents((evt) => {
      setUnreadTotal(evt.totalUnreadCount);
    });
    return () => unsub();
  }, [user, subscribeUnreadEvents]);

  // Real-time entity sync — when someone we care about (open profile,
  // selected chat partner, or ourselves on another tab) updates their
  // profile fields, patch the local state without re-fetching.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserUpdates((u: any) => {
      const uid = Number(u.id);
      // Patch the friend currently in the chat tab so the header / nickname
      // never go stale.
      setSelectedFriend(prev => (prev && prev.id === uid ? { ...prev, ...u } : prev));
      // Patch the open profile popup. Also keep the URL in sync if the
      // nickname is the one we're routed to — saves the user from a 404 on
      // refresh after someone else's rename.
      setProfileUser(prev => {
        if (!prev || prev.id !== uid) return prev;
        const next = { ...prev, ...u };
        if (nickname && prev.nickname === nickname && u.nickname && u.nickname !== nickname) {
          navigate(`/profile/${u.nickname}`, { replace: true });
        }
        return next;
      });
    });
    return () => unsub();
  }, [user, subscribeUserUpdates, nickname, navigate]);

  useEffect(() => {
    if (nickname && location.pathname.startsWith("/profile/")) {
      openProfilePopup(nickname);
    } else {
      setProfilePopupOpen(false);
      setProfileUser(null);
    }
  }, [nickname, location.pathname]);

  const openProfilePopup = async (userNickname: string) => {
    setProfileLoading(true);
    try {
      const userData = await getUserByNickname(userNickname);
      setProfileUser(userData);
      setProfilePopupOpen(true);
    } catch (error) {
      // Stale-nickname fallback: a list could've been rendered before the
      // owner renamed themselves, so the click points at a name that no
      // longer exists. Callers can pass `state.fallbackId` along with the
      // navigate, and we re-resolve by id and bounce the URL to the right
      // nickname.
      const fallbackId: number | undefined = (location.state as any)?.fallbackId;
      if (fallbackId) {
        try {
          const fresh = await getUserById(fallbackId);
          setProfileUser(fresh);
          setProfilePopupOpen(true);
          if (fresh.nickname && fresh.nickname !== userNickname) {
            navigate(`/profile/${fresh.nickname}`, { replace: true });
          }
          return;
        } catch (e2) {
          console.error("Profile fallback by id failed:", e2);
        }
      }
      console.error("Failed to fetch user profile:", error);
      navigate("/");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfilePopup = () => {
    setProfilePopupOpen(false);
    setProfileUser(null);
    navigate("/");
  };

  const handleAuth = () => {
    setOpen(false);
  };

  const handleAuthClick = () => {
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <div className="transition-all duration-300">
        <Navbar onAuthClick={handleAuthClick} shiftRight={showFriendsPanel} />
      </div>

      {/* Main content */}
      <div className="flex-1 transition-all duration-300">
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
              onClick={handleAuthClick}
              className="px-8 py-3 text-lg rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-80 font-medium transition"
            >
              Get Started
            </button>
          )}
        </section>
      </div>

      {/* Friends button */}
      {user && (
        <>
          <button
            onClick={() => setShowFriendsPanel(true)}
            title="Friends"
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
          >
            <MessageSquare size={20} />
            <span className="font-medium">Messages</span>
            {unreadTotal > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>

          <FriendsPanel
            isOpen={showFriendsPanel}
            onClose={() => {
              console.log("closing panel");
              setShowFriendsPanel(false);
            }}
            setSelectedFriend={setSelectedFriend}
          />

          {user && selectedFriend && (
            <FriendChat
              meEmail={user.email}
              meNickname={user.nickname}
              friendUserId={selectedFriend.id}
              friendEmail={selectedFriend.email}
              friendNickname={selectedFriend.nickname}
              onClose={() => setSelectedFriend(null)}
            />
          )}
        </>
      )}

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

      {/* Profile Popup */}
      {profilePopupOpen && profileUser && (
        <ProfilePopup user={profileUser} onClose={closeProfilePopup} />
      )}

      {/* Profile Loading State */}
      {profileLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="flex items-center gap-3 text-white">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Loading profile...</span>
          </div>
        </div>
      )}
    </div>
  );
}
