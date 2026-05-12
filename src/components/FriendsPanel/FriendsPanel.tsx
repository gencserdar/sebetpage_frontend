import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Settings, X } from "lucide-react";
import FriendsList from "./FriendsList";
import GroupSettingsModal from "./GroupSettingsModal";
import { UserDTO } from "../../types/userDTO";
import { chatApiService, MessagingGroup, MessagingGroupDetail } from "../../services/chatApiService";
import { useUser } from "../../context/UserContext";
import { useChatSocket } from "../../hooks/useWebSocket";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  setSelectedFriend: (friend: UserDTO) => void;
  setSelectedGroup: (group: MessagingGroup, participants?: { id: number; nickname: string }[]) => void;
  activeGroupId?: number | null;
  onGroupChanged?: (detail: MessagingGroupDetail) => void;
  onGroupDeleted?: (groupId: number) => void;
}

export default function FriendsPanel({
  isOpen,
  onClose,
  setSelectedFriend,
  setSelectedGroup,
  activeGroupId,
  onGroupChanged,
  onGroupDeleted,
}: Props) {
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [messagingGroups, setMessagingGroups] = useState<MessagingGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [settingsGroupId, setSettingsGroupId] = useState<number | null>(null);
  const [friendUnread, setFriendUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [groupUnreadById, setGroupUnreadById] = useState<Map<number, number>>(new Map());

  const conversationsRef = useRef<any[]>([]);
  const { user } = useUser();
  const { subscribeFriendEvents, subscribeUnreadEvents, getConversationUnread } =
    useChatSocket(user?.email || "");

  const groupDisplayName = (g: MessagingGroup) =>
    g.title && g.title.trim() ? g.title.trim() : "Group Chat";

  const recomputeUnread = useCallback(
    (rows: any[] = conversationsRef.current) => {
      let directTotal = 0;
      let groupsTotal = 0;
      const groupMap = new Map<number, number>();

      rows.forEach((c) => {
        const id = Number(c?.id);
        if (!id) return;
        const count = getConversationUnread(id);
        if (c?.type === "MESSAGING_GROUP") {
          groupsTotal += count;
          if (count > 0) groupMap.set(id, count);
        } else if (c?.type === "DIRECT") {
          directTotal += count;
        }
      });

      setFriendUnread(directTotal);
      setGroupUnread(groupsTotal);
      setGroupUnreadById(groupMap);
    },
    [getConversationUnread]
  );

  const loadConversations = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const all = await chatApiService.getConversations();
      conversationsRef.current = all;
      setMessagingGroups(
        all
          .filter((c: any) => c.type === "MESSAGING_GROUP")
          .sort((a: any, b: any) => Number(b.createdAtMillis || 0) - Number(a.createdAtMillis || 0))
      );
      recomputeUnread(all);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setLoadingGroups(false);
    }
  }, [recomputeUnread]);

  useEffect(() => {
    if (isOpen) void loadConversations();
  }, [isOpen, loadConversations]);

  useEffect(() => {
    if (activeGroupId) setActiveTab("groups");
  }, [activeGroupId]);

  useEffect(() => {
    if (!user) return;
    return subscribeFriendEvents((event: any) => {
      if (typeof event?.type === "string" && event.type.startsWith("MESSAGING_GROUP_")) {
        if (event.type === "MESSAGING_GROUP_ADDED") setActiveTab("groups");
        void loadConversations();
      }
    });
  }, [user, subscribeFriendEvents, loadConversations]);

  useEffect(() => {
    if (!user) return;
    return subscribeUnreadEvents((event) => {
      if (!event.conversationId) {
        recomputeUnread();
        return;
      }
      const known = conversationsRef.current.some((c) => Number(c?.id) === Number(event.conversationId));
      if (!known) {
        void loadConversations();
        return;
      }
      recomputeUnread();
    });
  }, [user, subscribeUnreadEvents, recomputeUnread, loadConversations]);

  const handleGroupCreated = useCallback(
    (group: MessagingGroup, participants: { id: number; nickname: string }[]) => {
      setMessagingGroups((prev) =>
        prev.some((g) => g.id === group.id) ? prev : [group, ...prev]
      );
      setActiveTab("groups");
      setSelectedGroup(group, participants);
      void loadConversations();
    },
    [loadConversations, setSelectedGroup]
  );

  useEffect(() => {
    (window as any).__friendsPanelGroupCreated = handleGroupCreated;
    return () => {
      delete (window as any).__friendsPanelGroupCreated;
    };
  }, [handleGroupCreated]);

  const handleGroupChanged = useCallback((detail: MessagingGroupDetail) => {
    setMessagingGroups((prev) =>
      prev.map((g) => (g.id === detail.id ? { ...g, ...detail } : g))
    );
    onGroupChanged?.(detail);
  }, [onGroupChanged]);

  const handleGroupDeleted = useCallback((groupId: number) => {
    setMessagingGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSettingsGroupId(null);
    onGroupDeleted?.(groupId);
    void loadConversations();
  }, [loadConversations, onGroupDeleted]);

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
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
                  <Dialog.Panel className="flex h-full w-[350px] flex-col border-l border-gray-800/40 bg-gray-950/98 text-white shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-gray-800/40 bg-gray-900/80 p-4">
                      <h2 className="text-lg font-semibold text-gray-100">Messages</h2>
                      <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-500 transition-colors duration-200 hover:bg-gray-800/60 hover:text-white"
                        title="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex justify-around border-b border-gray-800/40 bg-gray-900/50">
                      <button
                        onClick={() => setActiveTab("friends")}
                        className={`flex flex-1 items-center justify-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          activeTab === "friends"
                            ? "border-b-2 border-indigo-400 bg-gray-900/60 text-white"
                            : "text-gray-500 hover:bg-gray-900/30 hover:text-gray-300"
                        }`}
                      >
                        Friends
                        <Badge count={friendUnread} />
                      </button>
                      <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex flex-1 items-center justify-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          activeTab === "groups"
                            ? "border-b-2 border-indigo-400 bg-gray-900/60 text-white"
                            : "text-gray-500 hover:bg-gray-900/30 hover:text-gray-300"
                        }`}
                      >
                        Groups
                        <Badge count={groupUnread} />
                      </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto bg-gradient-to-b from-gray-950/60 to-black/80 p-3">
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                          .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
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
                            <div className="py-4 text-center text-sm text-gray-400">Loading groups...</div>
                          ) : messagingGroups.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-500">No group chats yet.</div>
                          ) : (
                            messagingGroups.map((g) => {
                              const unread = groupUnreadById.get(g.id) || 0;
                              const name = groupDisplayName(g);
                              return (
                                <div
                                  key={g.id}
                                  className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                                    activeGroupId === g.id
                                      ? "border-indigo-500/40 bg-indigo-500/20"
                                      : "border-transparent bg-white/5 hover:bg-white/10"
                                  }`}
                                >
                                  <button
                                    onClick={() => setSelectedGroup(g, [])}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                  >
                                    {g.imageUrl ? (
                                      <img
                                        src={g.imageUrl}
                                        alt="Group"
                                        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-700/60 text-sm font-bold text-white">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium text-white">{name}</div>
                                      <div className="truncate text-xs text-gray-500">Group chat</div>
                                    </div>
                                  </button>
                                  <Badge count={unread} />
                                  <button
                                    onClick={() => setSettingsGroupId(g.id)}
                                    className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800/70 hover:text-white"
                                    title="Group settings"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })
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

      <GroupSettingsModal
        groupId={settingsGroupId}
        open={settingsGroupId !== null}
        onClose={() => setSettingsGroupId(null)}
        onChanged={handleGroupChanged}
        onDeleted={handleGroupDeleted}
      />
    </>
  );
}
