import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "./chatUtils";

interface ChatBubbleProps {
  message: WsMessageDTO;
  messages: WsMessageDTO[];
  myUserId: number | null;
  seenMyMessageId: number | null;
}

export default function ChatBubble({
  message: m,
  messages,
  myUserId,
  seenMyMessageId,
}: ChatBubbleProps) {
  const mine = m.senderId === myUserId;
  const bubbleCls = mine
    ? "bg-indigo-500/80 text-white border border-indigo-400/20"
    : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

  const idx = messages.findIndex((msg) => msg.id === m.id);
  let showDetail = true;
  if (idx > 0) {
    const prev = messages[idx - 1];
    const currTime = new Date(m.createdAt).getTime();
    const prevTime = new Date(prev.createdAt).getTime();
    if (prev.senderId === m.senderId && currTime - prevTime < 5 * 60 * 1000) {
      showDetail = false;
    }
  }

  return (
    <div className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`w-full flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {showDetail && (
          <div className="w-full text-xs text-gray-500 px-1 text-center mb-2">
            <span>{fmtTime(m.createdAt)}</span>
          </div>
        )}
        <div
          title={new Date(m.createdAt).toLocaleString()}
          className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg backdrop-blur-sm ${bubbleCls} ${
            showDetail ? (mine ? "rounded-tr-none" : "rounded-tl-none") : ""
          }`}
          style={{ maxWidth: "90%" }}
        >
          {m.content}
        </div>
        {mine && seenMyMessageId === m.id && (
          <div className="mt-1 text-[11px] text-indigo-300/80 text-right">Seen</div>
        )}
      </div>
    </div>
  );
}
