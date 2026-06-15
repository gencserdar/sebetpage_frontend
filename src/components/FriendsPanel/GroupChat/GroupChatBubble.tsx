import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "../FriendChat/chatUtils";

interface GroupChatBubbleProps {
  message: WsMessageDTO;
  messages: WsMessageDTO[];
  myUserId: number;
  nickOf: (userId: number) => string;
}

export default function GroupChatBubble({
  message: m,
  messages,
  myUserId,
  nickOf,
}: GroupChatBubbleProps) {
  if (Number(m.senderId) === 0) {
    return (
      <div className="my-3 flex w-full justify-center">
        <div className="max-w-[85%] rounded-full border border-emerald-500/20 bg-emerald-950/35 px-3 py-1.5 text-center text-xs text-emerald-200/90">
          {m.content}
        </div>
      </div>
    );
  }

  const mine = m.senderId === myUserId;
  const idx = messages.findIndex((x) => x.id === m.id);
  const prev = idx > 0 ? messages[idx - 1] : null;
  const showHeader =
    !prev ||
    prev.senderId !== m.senderId ||
    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

  return (
    <div className={`mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {showHeader && (
          <div className={`mb-0.5 px-1 text-xs text-gray-400 ${mine ? "text-right" : "text-left"}`}>
            {mine ? `${fmtTime(m.createdAt)}` : `${nickOf(m.senderId)} - ${fmtTime(m.createdAt)}`}
          </div>
        )}
        <div
          title={new Date(m.createdAt).toLocaleString()}
          className={`inline-block break-words rounded-2xl px-3 py-1 shadow-lg ${
            mine
              ? `border border-indigo-400/20 bg-indigo-500/80 text-white ${showHeader ? "rounded-tr-none" : ""}`
              : `border border-white/10 bg-white/[0.08] text-gray-100 ${showHeader ? "rounded-tl-none" : ""}`
          }`}
        >
          {m.content}
        </div>
      </div>
    </div>
  );
}
