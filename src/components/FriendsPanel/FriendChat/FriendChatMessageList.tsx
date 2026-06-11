import ChatBubble from "./ChatBubble";
import DaySeparator from "./DaySeparator";
import { RenderItem } from "./types";
interface FriendChatMessageListProps {
  listRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  loading: boolean;
  loadingOlder: boolean;
  renderItems: RenderItem[];
  myUserId: number | null;
  seenMyMessageId: number | null;
}

export default function FriendChatMessageList({
  listRef,
  expanded,
  loading,
  loadingOlder,
  renderItems,
  myUserId,
  seenMyMessageId,
}: FriendChatMessageListProps) {
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
      className={`overflow-y-auto mb-3 bg-gradient-to-b from-gray-900/60 to-black/80 p-3 rounded-xl ${
        expanded ? "min-h-0 flex-1" : "h-80"
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
