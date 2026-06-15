import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "./chatUtils";

interface ChatBubbleProps {
  message: WsMessageDTO;
  myUserId: number | null;
  seenMyMessageId: number | null;
  showTime: boolean;
  onToggleTime: () => void;
}

export default function ChatBubble({
  message: m,
  myUserId,
  seenMyMessageId,
  showTime,
  onToggleTime,
}: ChatBubbleProps) {
  const mine = m.senderId === myUserId;
  const bubbleCls = mine
    ? "bg-indigo-500/80 text-white border border-indigo-400/20"
    : "border border-white/10 bg-white/[0.08] text-gray-100";

  return (
    <div className={`w-full flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`w-full flex flex-col ${mine ? "items-end" : "items-start"}`}>
        <button
          type="button"
          onClick={onToggleTime}
          className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg backdrop-blur-sm text-left cursor-pointer ${bubbleCls}`}
          style={{ maxWidth: "90%" }}
        >
          {m.content}
        </button>
        <div
          className={`grid w-full transition-[grid-template-rows] duration-200 ease-out ${
            showTime ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          } ${mine ? "justify-items-end" : "justify-items-start"}`}
          style={{ maxWidth: "90%" }}
        >
          <div className="overflow-hidden">
            <div
              className={`pt-1 text-[11px] text-gray-500 transition-opacity duration-200 ease-out ${
                showTime ? "opacity-100" : "opacity-0"
              } ${mine ? "text-right" : "text-left"}`}
            >
              {fmtTime(m.createdAt)}
            </div>
          </div>
        </div>
        {mine && seenMyMessageId === m.id && (
          <div className="mt-1 text-[11px] text-indigo-300/80 text-right">Seen</div>
        )}
      </div>
    </div>
  );
}
