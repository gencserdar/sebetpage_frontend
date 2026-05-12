import { Fragment, useCallback, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import FriendsList from "./FriendsList";
import GroupChat from "./GroupChat";
import { UserDTO } from "../../types/userDTO";
import { chatApiService, MessagingGroup } from "../../services/chatApiService";
import { useUser } from "../../context/UserContext";
import { useChatSocket } from "../../hooks/useWebSocket";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  setSelectedFriend: (friend: UserDTO) => void;
}

interface OpenGroup {
  group: MessagingGroup;
  participants: { id: number; nickname: string }[];
}

export default function FriendsPanel({
  isOpen,
  onClose,
  setSelectedFriend,
}: Props) {
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const { user } = useUser();
  const { subscribeFriendEvents } = useChatSocket(user?.email || "");

  // Messaging groups list
  const [messagingGroups, setMessagingGroups] = useState<MessagingGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Currently open group chat window
  const [openGroup, setOpenGroup] = useState<OpenGroup | null>(null);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const all = await chatApiService.getConversations();
      setMessagingGroups(
        all
          .filter((c: any) => c.type === "MESSAGING_GROUP")
          .sort((a: any, b: any) => Number(b.createdAtMillis || 0) - Number(a.createdAtMillis || 0))
      );
    } catch (e) {
      console.error("Failed to load messaging groups:", e);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Reload groups when the tab becomes active or panel opens
  useEffect(() => {
    if (isOpen && activeTab === "groups") {
      void loadGroups();
    }
  }, [isOpen, activeTab, loadGroups]);

  useEffect(() => {
    if (!user) return;
    return subscribeFriendEvents((event: any) => {
      if (event?.type === "MESSAGING_GROUP_ADDED") {
        void loadGroups();
      }
    });
  }, [user, subscribeFriendEvents, loadGroups]);

  /** Called by FriendChat when the user creates a group via the + button. */
  const handleGroupCreated = useCallback(
    (group: MessagingGroup, participants: { id: number; nickname: string }[]) => {
      // Add to the list without a full reload
      setMessagingGroups((prev) =>
        prev.some((g) => g.id === group.id) ? prev : [group, ...prev]
      );
      // Switch to groups tab and open the new chat
      setActiveTab("groups");
      setOpenGroup({ group, participants });
    },
    []
  );

  // Expose handleGroupCreated so FriendChat can call it via the prop.
  // The parent component (wherever FriendsPanel is rendered) passes
  // setSelectedFriend; we inject onGroupCreated into the FriendChat via
  // the FriendsList → FriendsPanel pipeline. Since FriendChat is rendered
  // by the parent (not here), we export handleGroupCreated and let the
  // parent wire it. For now we store it on the window as a lightweight
  // bridge (no context needed for a single panel instance).
  useEffect(() => {
    (window as any).__friendsPanelGroupCreated = handleGroupCreated;
    return () => { delete (window as any).__friendsPanelGroupCreated; };
  }, [handleGroupCreated]);

  const groupDisplayName = (g: MessagingGroup) =>
    g.title && g.title.trim() ? g.title.trim() : "Group Chat";

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              {/* Overlay */}
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute inset-0 bg-black/40 transition-opacity" />
              </Transition.Child>

              {/* Drawer */}
              <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="w-[350px] h-full bg-gray-950/98 backdrop-blur-xl text-white shadow-2xl border-l border-gray-800/40 flex flex-col">
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
                      {["friends", "groups"].map((tab) => (
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
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                          .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                          .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,.4); border-radius: 10px; }
                          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,.5); border-radius: 10px; }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.7); }
                        `,
                        }}
                      />

                      {activeTab === "friends" && (
                        <FriendsList onSelectFriend={setSelectedFriend} />
                      )}

                      {activeTab === "groups" && (
                        <div className="flex flex-col gap-2">
                          {loadingGroups ? (
                            <div className="text-gray-400 text-sm py-4 text-center">
                              Loading groups…
                            </div>
                          ) : messagingGroups.length === 0 ? (
                            <div className="text-gray-500 text-sm py-6 text-center">
                              <p>No group chats yet.</p>
                            </div>
                          ) : (
                            messagingGroups.map((g) => (
                              <button
                                key={g.id}
                                onClick={() =>
                                  setOpenGroup({ group: g, participants: [] })
                                }
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                                  openGroup?.group.id === g.id
                                    ? "bg-indigo-500/20 border-indigo-500/40"
                                    : "bg-white/5 hover:bg-white/10 border-transparent"
                                }`}
                              >
                                {/* Avatar placeholder */}
                                <div className="w-10 h-10 rounded-full bg-indigo-700/60 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                                  {groupDisplayName(g).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium truncate">
                                    {groupDisplayName(g)}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    Group chat
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Group chat window — rendered outside the drawer so it floats freely */}
      {openGroup && user && (
        <GroupChat
          conversationId={openGroup.group.id}
          title={groupDisplayName(openGroup.group)}
          myUserId={user.id}
          myNickname={user.nickname}
          initialParticipants={openGroup.participants}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </>
  );
}
