import { Search, UserPlus } from "lucide-react";
import { UserDTO } from "../../../types/userDTO";

interface GroupSettingsAddMembersSectionProps {
  canAddMembers: boolean;
  showPanel: boolean;
  addSearch: string;
  loadingFriends: boolean;
  filteredFriends: UserDTO[];
  addingMemberId: number | null;
  saving: boolean;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
  addPanelRef: React.RefObject<HTMLDivElement | null>;
  onTogglePanel: () => void;
  onAddSearchChange: (value: string) => void;
  onAddMember: (friend: UserDTO) => void;
}

export default function GroupSettingsAddMembersSection({
  canAddMembers,
  showPanel,
  addSearch,
  loadingFriends,
  filteredFriends,
  addingMemberId,
  saving,
  addBtnRef,
  addPanelRef,
  onTogglePanel,
  onAddSearchChange,
  onAddMember,
}: GroupSettingsAddMembersSectionProps) {
  return (
    <div className="relative">
      <button
        ref={addBtnRef}
        type="button"
        disabled={!canAddMembers || saving}
        onClick={() => {
          if (canAddMembers && !saving) onTogglePanel();
        }}
        title={canAddMembers ? "Add members" : "You don't have permission to add members"}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          canAddMembers
            ? "border-indigo-400/35 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25"
            : "cursor-not-allowed border-gray-800 bg-white/[0.02] text-gray-600 opacity-60"
        } disabled:cursor-not-allowed`}
      >
        <UserPlus className="h-4 w-4" />
        Add members
      </button>

      {showPanel && canAddMembers && (
        <div
          ref={addPanelRef}
          className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-700/50 bg-gray-900 p-3 shadow-2xl"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Add friends
          </p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search friends..."
              value={addSearch}
              onChange={(e) => onAddSearchChange(e.target.value)}
              className="w-full rounded-lg bg-gray-800 py-2 pl-8 pr-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/60"
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
                  type="button"
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
