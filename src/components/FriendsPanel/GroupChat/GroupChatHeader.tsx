import {
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { UserDTO } from "../../../types/userDTO";
import { GroupParticipant } from "./types";
import { MessagingGroupDetail } from "../../../services/chatApiService";

interface GroupChatHeaderProps {
  displayName: string;
  detail: MessagingGroupDetail | null;
  initialParticipants: GroupParticipant[];
  typingLabel?: string | null;
  canAddMembers: boolean;
  showAddPanel: boolean;
  addSearch: string;
  loadingFriends: boolean;
  filteredFriends: UserDTO[];
  addingMemberId: number | null;
  isExpanded: boolean;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
  addPanelRef: React.RefObject<HTMLDivElement | null>;
  onOpenSettings: () => void;
  onToggleAdd: () => void;
  onToggleExpanded: () => void;
  onClose: () => void;
  onAddSearchChange: (value: string) => void;
  onAddMember: (friend: UserDTO) => void;
}

export default function GroupChatHeader({
  displayName,
  detail,
  initialParticipants,
  typingLabel,
  canAddMembers,
  showAddPanel,
  addSearch,
  loadingFriends,
  filteredFriends,
  addingMemberId,
  isExpanded,
  addBtnRef,
  addPanelRef,
  onOpenSettings,
  onToggleAdd,
  onToggleExpanded,
  onClose,
  onAddSearchChange,
  onAddMember,
}: GroupChatHeaderProps) {
  return (
    <div className="relative mb-3 flex items-center justify-between border-b border-white/10 pb-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="block max-w-full truncate border-0 bg-transparent p-0 text-left font-semibold text-gray-100 transition-colors hover:text-indigo-300 focus:outline-none"
          title="Group settings"
        >
          {displayName}
        </button>
        <div className="truncate text-xs text-gray-500">
          {typingLabel ||
            (detail?.participants?.length
              ? `${detail.participants.length} members`
              : initialParticipants.length > 0
                ? initialParticipants.map((p) => p.nickname).join(", ")
                : "Group chat")}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 pl-2">
        {canAddMembers && (
          <button
            ref={addBtnRef}
            onClick={onToggleAdd}
            className={`rounded-lg p-1.5 transition-colors ${
              showAddPanel
                ? "bg-indigo-500/30 text-indigo-300"
                : "text-gray-500 hover:bg-white/[0.08] hover:text-white"
            }`}
            title="Add people"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          className="hidden rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-white md:block"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onOpenSettings}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-white"
          title="Group settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-white"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showAddPanel && (
        <div
          ref={addPanelRef}
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-app-surface p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Add friends</p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search friends..."
              value={addSearch}
              onChange={(e) => onAddSearchChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-8 pr-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/60"
              autoFocus
            />
          </div>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {loadingFriends ? (
              <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {addSearch ? "No matches" : "No friends to add"}
              </div>
            ) : (
              filteredFriends.map((f) => (
                <button
                  key={f.id}
                  disabled={!!addingMemberId}
                  onClick={() => onAddMember(f)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <img
                    src={f.profileImageUrl || "/default_pp.png"}
                    alt="pfp"
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-200">{f.nickname}</span>
                  {addingMemberId === f.id && (
                    <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
