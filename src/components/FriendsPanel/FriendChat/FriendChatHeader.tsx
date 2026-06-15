import { chatApiService } from "../../../services/chatApiService";
import { UserDTO } from "../../../types/userDTO";
import { MessagingGroup } from "../../../services/chatApiService";
import { CollapseIcon, ExpandIcon, PlusIcon, SearchIcon } from "./icons";

interface FriendChatHeaderProps {
  friendNickname: string;
  friendUserId: number;
  unreadCount: number;
  isRemoved: boolean;
  isExpanded: boolean;
  showAddPanel: boolean;
  addSearch: string;
  filteredFriends: UserDTO[];
  loadingFriends: boolean;
  creatingGroup: boolean;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
  addPanelRef: React.RefObject<HTMLDivElement | null>;
  onOpenProfile: () => void;
  onToggleAdd: () => void;
  onToggleExpanded: () => void;
  onClose: () => void;
  onAddSearchChange: (value: string) => void;
  onGroupCreated?: (
    group: MessagingGroup,
    participants: { id: number; nickname: string }[]
  ) => void;
  setShowAddPanel: (open: boolean) => void;
  setAddSearch: (value: string) => void;
  setCreatingGroup: (creating: boolean) => void;
}

const UnreadDot = ({ show }: { show: boolean }) =>
  !show ? null : (
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2 align-middle" />
  );

export default function FriendChatHeader({
  friendNickname,
  friendUserId,
  unreadCount,
  isRemoved,
  isExpanded,
  showAddPanel,
  addSearch,
  filteredFriends,
  loadingFriends,
  creatingGroup,
  addBtnRef,
  addPanelRef,
  onOpenProfile,
  onToggleAdd,
  onToggleExpanded,
  onClose,
  onAddSearchChange,
  onGroupCreated,
  setShowAddPanel,
  setAddSearch,
  setCreatingGroup,
}: FriendChatHeaderProps) {
  return (
    <div className="relative flex justify-between items-center mb-3 border-b border-white/10 pb-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenProfile}
          onKeyDown={(e) => e.key === "Enter" && onOpenProfile()}
          className="tracking-wide text-gray-100 font-semibold hover:text-indigo-300 transition-colors focus:outline-none rounded-md px-1 cursor-pointer truncate"
          title="Open profile"
          aria-label={`Open ${friendNickname}'s profile`}
        >
          {friendNickname}
        </button>
        <UnreadDot show={unreadCount > 0} />
        {isRemoved && (
          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30 whitespace-nowrap">
            Removed
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          ref={addBtnRef}
          onClick={onToggleAdd}
          className={`p-1.5 rounded-lg transition-colors duration-200 ${
            showAddPanel
              ? "bg-indigo-500/30 text-indigo-300"
              : "text-gray-500 hover:text-white hover:bg-white/[0.08]"
          }`}
          title="Add people to group"
        >
          <PlusIcon />
        </button>

        <button
          onClick={onToggleExpanded}
          className="hidden rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white md:block"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </button>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-white/[0.08] rounded-lg p-1.5"
          title="Close"
        >
          ✕
        </button>
      </div>

      {showAddPanel && (
        <div
          ref={addPanelRef}
          className="absolute top-full right-0 z-30 mt-2 w-72 rounded-xl border border-white/10 bg-app-surface p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide flex items-center gap-2">
            Add friends to group
            {creatingGroup && (
              <span className="inline-block w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
            )}
          </p>
          <div className="relative mb-2">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search friends…"
              value={addSearch}
              onChange={(e) => onAddSearchChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-8 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500/60"
              autoFocus
            />
          </div>
          <div
            className="max-h-48 overflow-y-auto flex flex-col gap-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.4) transparent" }}
          >
            {loadingFriends ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading…</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {addSearch ? "No matches" : "No other friends"}
              </div>
            ) : (
              filteredFriends.map((f) => (
                <button
                  key={f.id}
                  disabled={creatingGroup}
                  onClick={async () => {
                    if (creatingGroup) return;
                    setCreatingGroup(true);
                    try {
                      const group = await chatApiService.createMessagingGroup(
                        [friendUserId, f.id],
                        `${friendNickname}, ${f.nickname}`
                      );
                      setShowAddPanel(false);
                      setAddSearch("");
                      const participants = [
                        { id: friendUserId, nickname: friendNickname },
                        { id: f.id, nickname: f.nickname },
                      ];
                      if (onGroupCreated) {
                        onGroupCreated(group, participants);
                      } else if ((window as any).__friendsPanelGroupCreated) {
                        (window as any).__friendsPanelGroupCreated(group, participants);
                      }
                    } catch (err) {
                      console.error("Failed to create group:", err);
                    } finally {
                      setCreatingGroup(false);
                    }
                  }}
                  className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors text-left ${
                    creatingGroup ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-500/20"
                  }`}
                >
                  <img
                    src={f.profileImageUrl || "/default_pp.png"}
                    alt="pfp"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <span className="text-sm text-gray-200">{f.nickname}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
