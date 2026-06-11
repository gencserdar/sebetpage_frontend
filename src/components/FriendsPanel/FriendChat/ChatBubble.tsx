import { useState } from "react";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "./chatUtils";

interface ChatBubbleProps {
  message: WsMessageDTO;
  myUserId: number | null;
  seenMyMessageId: number | null;
}

export default function ChatBubble({
  message: m,
  myUserId,
  seenMyMessageId,
}: ChatBubbleProps) {
  const [showTime, setShowTime] = useState(false);
  const mine = m.senderId === myUserId;
  const bubbleCls = mine
    ? "bg-indigo-500/80 text-white border border-indigo-400/20"
    : "bg-gray-800/80 text-gray-100 border border-gray-700/40";

  return (
    <div className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`w-full flex flex-col ${mine ? "items-end" : "items-start"}`}>
        <button
          type="button"
          onClick={() => setShowTime((prev) => !prev)}
          className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg backdrop-blur-sm text-left cursor-pointer ${bubbleCls}`}
          style={{ maxWidth: "90%" }}
        >
          {m.content}
        </button>
        {showTime && (
          <div className={`mt-1 text-[11px] text-gray-500 ${mine ? "text-right" : "text-left"}`}>
            {fmtTime(m.createdAt)}
          </div>
        )}
        {mine && seenMyMessageId === m.id && (
          <div className="mt-1 text-[11px] text-indigo-300/80 text-right">Seen</div>
        )}
      </div>
    </div>
  );
}
