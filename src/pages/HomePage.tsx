import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Modal from "../components/Login/Modal";
import AuthPopup from "../components/Login/AuthPopup/index";
import Navbar from "../components/Navbar/Navbar";
import { useUser } from "../context/UserContext";
import { UserDTO } from "../types/userDTO";
import FriendsPanel from "../components/FriendsPanel/FriendsPanel";
import FriendChat from "../components/FriendsPanel/FriendChat/index";
import GroupChat from "../components/FriendsPanel/GroupChat/index";
import ExpandedMessagesRail from "../components/FriendsPanel/ExpandedMessagesRail";
import { useChatSocketContext } from "../context/ChatSocketContext";
import { MessagingGroup, MessagingGroupDetail } from "../services/chatApiService";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const { user, loading: userLoading } = useUser();
  const [selectedFriend, setSelectedFriend] = useState<UserDTO | null>(null);
  const [selectedGroup, setSelectedGroupState] = useState<{
    group: MessagingGroup;
    participants: { id: number; nickname: string }[];
  } | null>(null);
  const [openNextExpanded, setOpenNextExpanded] = useState(false);

  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Tap into the WS singleton so the Messages button gets a live badge whenever
  // a message arrives in any conversation, even when the panel is closed.
  const { subscribeUnreadEvents, subscribeUserUpdates } = useChatSocketContext();

  useEffect(() => {
    if (searchParams.get("login") === "1") {
      setOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUnreadEvents((evt) => {
      setUnreadTotal(evt.totalUnreadCount);
    });
    return () => unsub();
  }, [user, subscribeUnreadEvents]);

  // Real-time entity sync for the open chat partner.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserUpdates((u: Partial<UserDTO> & { id: number }) => {
      const uid = Number(u.id);
      setSelectedFriend((prev) => (prev && prev.id === uid ? { ...prev, ...u } : prev));
    });
    return () => unsub();
  }, [user, subscribeUserUpdates]);

  const handleAuth = () => {
    setOpen(false);
  };

  const handleAuthClick = () => {
    setOpen(true);
  };

  const isMobileViewport = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const selectFriend = useCallback((friend: UserDTO) => {
    setOpenNextExpanded(false);
    setSelectedGroupState(null);
    setSelectedFriend(friend);
    if (isMobileViewport()) setShowFriendsPanel(false);
  }, []);

  const selectGroup = useCallback(
    (group: MessagingGroup, participants: { id: number; nickname: string }[] = []) => {
      setOpenNextExpanded(false);
      setSelectedFriend(null);
      setSelectedGroupState({ group, participants });
      if (isMobileViewport()) setShowFriendsPanel(false);
    },
    []
  );

  const handleGroupChanged = useCallback((detail: MessagingGroupDetail) => {
    setSelectedGroupState((prev) =>
      prev && prev.group.id === detail.id
        ? { ...prev, group: { ...prev.group, ...detail } }
        : prev
    );
  }, []);

  const handleGroupDeleted = useCallback((groupId: number) => {
    setOpenNextExpanded(false);
    setSelectedGroupState((prev) => (prev?.group.id === groupId ? null : prev));
  }, []);

  const handleChatExpandedChange = useCallback((expanded: boolean) => {
    if (expanded) setShowFriendsPanel(false);
  }, []);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="transition-all duration-300">
          <Navbar onAuthClick={handleAuthClick} />
        </div>
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="flex w-full max-w-2xl flex-col items-center gap-6">
            <div className="h-12 w-3/4 max-w-lg rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-5 w-1/2 max-w-sm rounded-full bg-white/[0.04] animate-pulse" />
            <div className="mt-4 h-10 w-36 rounded-full bg-white/[0.05] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  const expandedRail = user ? (
    <ExpandedMessagesRail
      activeGroupId={selectedGroup?.group.id}
      onSelectFriend={(friend) => {
        setOpenNextExpanded(true);
        setSelectedGroupState(null);
        setSelectedFriend(friend);
      }}
      onSelectGroup={(group) => {
        setOpenNextExpanded(true);
        setSelectedFriend(null);
        setSelectedGroupState({ group, participants: [] });
      }}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <div className="transition-all duration-300">
        <Navbar
          onAuthClick={handleAuthClick}
          onMessagesClick={() => setShowFriendsPanel(true)}
          unreadCount={unreadTotal}
        />
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
            className="fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 md:flex"
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
            onClose={() => setShowFriendsPanel(false)}
            setSelectedFriend={selectFriend}
            setSelectedGroup={selectGroup}
            activeGroupId={selectedGroup?.group.id}
            onGroupChanged={handleGroupChanged}
            onGroupDeleted={handleGroupDeleted}
          />

          {user && selectedFriend && (
            <FriendChat
              meEmail={user.email}
              meNickname={user.nickname}
              friendUserId={selectedFriend.id}
              friendEmail={selectedFriend.email}
              friendNickname={selectedFriend.nickname}
              onClose={() => {
                setOpenNextExpanded(false);
                setSelectedFriend(null);
              }}
              onGroupCreated={selectGroup}
              expandedRail={expandedRail}
              initialExpanded={openNextExpanded}
              onExpandedChange={handleChatExpandedChange}
            />
          )}

          {user && selectedGroup && (
            <GroupChat
              conversationId={selectedGroup.group.id}
              title={selectedGroup.group.title}
              myUserId={user.id}
              myNickname={user.nickname}
              initialParticipants={selectedGroup.participants}
              onClose={() => {
                setOpenNextExpanded(false);
                setSelectedGroupState(null);
              }}
              onGroupChanged={handleGroupChanged}
              onGroupDeleted={handleGroupDeleted}
              expandedRail={expandedRail}
              initialExpanded={openNextExpanded}
              onExpandedChange={handleChatExpandedChange}
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
    </div>
  );
}
