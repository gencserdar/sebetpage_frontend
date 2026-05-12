import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import FriendsList from "./FriendsList";
import { UserDTO } from "../../types/userDTO";
import { chatApiService, MessagingGroup } from "../../services/chatApiService";
import { useUser } from "../../context/UserContext";
import { useChatSocket } from "../../hooks/useWebSocket";

interface Props {
  activeGroupId?: number | null;
  onSelectFriend: (friend: UserDTO) => void;
  onSelectGroup: (group: MessagingGroup) => void;
}

export default function ExpandedMessagesRail({
  activeGroupId,
  onSelectFriend,
  onSelectGroup,
}: Props) {
  const [tab, setTab] = useState<"friends" | "groups">("friends");
  const [groups, setGroups] = useState<MessagingGroup[]>([]);
  const [groupUnreadById, setGroupUnreadById] = useState<Map<number, number>>(new Map());
  const conversationsRef = useRef<any[]>([]);
  const { user } = useUser();
  const { subscribeFriendEvents, subscribeUnreadEvents, getConversationUnread } =
    useChatSocket(user?.email || "");

  const recomputeGroupUnread = useCallback(
    (rows: any[] = conversationsRef.current) => {
      const next = new Map<number, number>();
      rows.forEach((c) => {
        if (c?.type !== "MESSAGING_GROUP") return;
        const count = getConversationUnread(Number(c.id));
        if (count > 0) next.set(Number(c.id), count);
      });
      setGroupUnreadById(next);
    },
    [getConversationUnread]
  );

  const load = useCallback(async () => {
    try {
      const all = await chatApiService.getConversations();
      conversationsRef.current = all;
      setGroups(
        all
          .filter((c: any) => c.type === "MESSAGING_GROUP")
          .sort((a: any, b: any) => Number(b.createdAtMillis || 0) - Number(a.createdAtMillis || 0))
      );
      recomputeGroupUnread(all);
    } catch (e) {
      console.error("Failed to load expanded rail conversations:", e);
    }
  }, [recomputeGroupUnread]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    return subscribeFriendEvents((event: any) => {
      if (typeof event?.type === "string" && event.type.startsWith("MESSAGING_GROUP_")) {
        void load();
      }
    });
  }, [user, subscribeFriendEvents, load]);

  useEffect(() => {
    if (!user) return;
    return subscribeUnreadEvents((event) => {
      if (!event.conversationId) {
        recomputeGroupUnread();
        return;
      }
      const known = conversationsRef.current.some((c) => Number(c?.id) === Number(event.conversationId));
      if (known) recomputeGroupUnread();
      else void load();
    });
  }, [user, subscribeUnreadEvents, recomputeGroupUnread, load]);

  const displayName = (group: MessagingGroup) =>
    group.title?.trim() || "Group Chat";

  return (
    <div className="group fixed left-0 top-0 z-[60] h-screen w-14 overflow-hidden border-r border-gray-800/60 bg-gray-950/95 text-white shadow-2xl transition-[width] duration-200 hover:w-80">
      <div className="flex h-full w-80">
        <div className="flex w-14 flex-shrink-0 flex-col items-center border-r border-gray-800/60 bg-gray-950 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div
            className="mt-5 flex-1 select-none whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-500"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Messages
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <div className="flex border-b border-gray-800/60">
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 px-3 py-3 text-sm font-medium ${
                tab === "friends" ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 px-3 py-3 text-sm font-medium ${
                tab === "groups" ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Groups
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "friends" ? (
              <FriendsList onSelectFriend={onSelectFriend} />
            ) : (
              <div className="flex flex-col gap-2">
                {groups.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">No groups yet.</div>
                ) : (
                  groups.map((g) => {
                    const unread = groupUnreadById.get(g.id) || 0;
                    const name = displayName(g);
                    return (
                      <button
                        key={g.id}
                        onClick={() => onSelectGroup(g)}
                        className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${
                          activeGroupId === g.id
                            ? "border-indigo-500/40 bg-indigo-500/20"
                            : "border-transparent bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {g.imageUrl ? (
                          <img
                            src={g.imageUrl}
                            alt="Group"
                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-700/60 text-sm font-bold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{name}</div>
                          <div className="truncate text-xs text-gray-500">Group chat</div>
                        </div>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
