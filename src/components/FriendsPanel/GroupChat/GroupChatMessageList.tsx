import GroupChatBubble from "./GroupChatBubble";
import { GroupRenderItem } from "./types";
import { WsMessageDTO } from "../../../types/WSMessageDTO";

interface GroupChatMessageListProps {
  listRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  loading: boolean;
  loadingOlder: boolean;
  renderItems: GroupRenderItem[];
  messages: WsMessageDTO[];
  myUserId: number;
  nickOf: (userId: number) => string;
  editingMessageId?: number | null;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: (message: WsMessageDTO) => void;
  onDelete?: (message: WsMessageDTO) => void;
  actionPending?: boolean;
}

export default function GroupChatMessageList({
  listRef,
  expanded,
  loading,
  loadingOlder,
  renderItems,
  messages,
  myUserId,
  nickOf,
  editingMessageId,
  editDraft,
  onEditDraftChange,
  onEditSave,
  onEditCancel,
  onStartEdit,
  onDelete,
  actionPending,
}: GroupChatMessageListProps) {
  const groups: React.ReactElement[] = [];
  let curLabel: string | null = null;
  let curMsgs: React.ReactElement[] = [];

  for (const it of renderItems) {
    if (it.type === "sep") {
      if (curLabel) {
        groups.push(
          <div key={curLabel} className="relative flex flex-col">
            {curMsgs}
          </div>
        );
      }
      curLabel = it.label;
      curMsgs = [
        <div key={`sep-${it.label}`} className="sticky top-0 z-10 flex w-full justify-center py-1">
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-400">
            {it.label}
          </span>
        </div>,
      ];
    } else {
      curMsgs.push(
        <GroupChatBubble
          key={it.key}
          message={it.data}
          messages={messages}
          myUserId={myUserId}
          nickOf={nickOf}
          editingMessageId={editingMessageId}
          editDraft={editDraft}
          onEditDraftChange={onEditDraftChange}
          onEditSave={onEditSave}
          onEditCancel={onEditCancel}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          actionPending={actionPending}
        />
      );
    }
  }

  if (curLabel) {
    groups.push(
      <div key={curLabel} className="relative flex flex-col">
        {curMsgs}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={`mb-3 overflow-y-auto rounded-xl bg-gradient-to-b from-app-surface/40 to-app-bg/80 p-3 ${
        expanded ? "min-h-0 flex-1" : "h-80 max-md:min-h-0 max-md:flex-1"
      }`}
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,.5) rgba(0,0,0,.4)" }}
    >
      {loadingOlder && (
        <div className="mb-2 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : renderItems.length === 0 ? (
        <div className="text-sm text-gray-500">No messages yet. Say hello!</div>
      ) : (
        groups
      )}
    </div>
  );
}
