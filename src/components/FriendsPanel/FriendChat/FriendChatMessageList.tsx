import { useState } from "react";
import ChatBubble from "./ChatBubble";
import DaySeparator from "./DaySeparator";
import { RenderItem } from "./types";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
interface FriendChatMessageListProps {
  listRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  loading: boolean;
  loadingOlder: boolean;
  renderItems: RenderItem[];
  myUserId: number | null;
  seenMyMessageId: number | null;
  editingMessageId?: number | null;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: (message: WsMessageDTO) => void;
  onDelete?: (message: WsMessageDTO) => void;
  actionPending?: boolean;
}

export default function FriendChatMessageList({
  listRef,
  expanded,
  loading,
  loadingOlder,
  renderItems,
  myUserId,
  seenMyMessageId,
  editingMessageId,
  editDraft,
  onEditDraftChange,
  onEditSave,
  onEditCancel,
  onStartEdit,
  onDelete,
  actionPending,
}: FriendChatMessageListProps) {
  const [timeVisibleMessageId, setTimeVisibleMessageId] = useState<number | null>(null);

  const toggleTimeFor = (messageId: number) => {
    setTimeVisibleMessageId((prev) => (prev === messageId ? null : messageId));
  };

  const groups: React.ReactElement[] = [];
  let currentDayLabel: string | null = null;
  let currentMessages: React.ReactElement[] = [];

  for (const it of renderItems) {
    if (it.type === "sep") {
      if (currentDayLabel) {
        groups.push(
          <div key={currentDayLabel} className="flex flex-col relative">
            <DaySeparator label={currentDayLabel} listRef={listRef} />
            {currentMessages}
          </div>
        );
      }
      currentDayLabel = it.label;
      currentMessages = [];
    } else {
      currentMessages.push(
        <ChatBubble
          key={it.key}
          message={it.data}
          myUserId={myUserId}
          seenMyMessageId={seenMyMessageId}
          showTime={timeVisibleMessageId === it.data.id}
          onToggleTime={() => toggleTimeFor(it.data.id)}
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

  if (currentDayLabel) {
    groups.push(
      <div key={currentDayLabel} className="flex flex-col relative">
        <DaySeparator label={currentDayLabel} listRef={listRef} />
        {currentMessages}
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
        <div className="flex justify-center mb-2">
          <div
            style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }}
            className="w-8 h-8 border-4 rounded-full animate-spin"
          />
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div
            style={{ borderColor: "#4F52C1", borderTopColor: "transparent" }}
            className="w-8 h-8 border-4 rounded-full animate-spin"
          />
        </div>
      ) : renderItems.length === 0 ? (
        <div className="text-gray-500">No messages yet.</div>
      ) : (
        groups
      )}
    </div>
  );
}
