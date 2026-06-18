import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "./chatUtils";

interface ChatBubbleProps {
  message: WsMessageDTO;
  myUserId: number | null;
  seenMyMessageId: string | null;
  showTime: boolean;
  onToggleTime: () => void;
  editingMessageId?: string | null;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: (message: WsMessageDTO) => void;
  onDelete?: (message: WsMessageDTO) => void;
  actionPending?: boolean;
}

export default function ChatBubble({
  message: m,
  myUserId,
  seenMyMessageId,
  showTime,
  onToggleTime,
  editingMessageId,
  editDraft = "",
  onEditDraftChange,
  onEditSave,
  onEditCancel,
  onStartEdit,
  onDelete,
  actionPending = false,
}: ChatBubbleProps) {
  const mine = m.senderId === myUserId;
  const isEditing = editingMessageId === m.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const bubbleCls = mine
    ? "bg-indigo-500/80 text-white border border-indigo-400/20"
    : "border border-white/10 bg-white/[0.08] text-gray-100";

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  useEffect(() => {
    if (isEditing) setMenuOpen(false);
  }, [isEditing]);

  const showActions = mine && !m.deleted && onStartEdit && onDelete;

  if (m.deleted) {
    return (
      <div className={`mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[90%] rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-1 text-sm italic text-gray-500">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`relative flex w-full flex-col ${mine ? "items-end" : "items-start"}`}>
        {isEditing ? (
          <div className="w-full max-w-[90%] space-y-2">
            <input
              value={editDraft}
              onChange={(e) => onEditDraftChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onEditSave?.();
                }
                if (e.key === "Escape") onEditCancel?.();
              }}
              className="w-full rounded-xl border border-indigo-400/30 bg-white/[0.08] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onEditCancel}
                className="rounded-lg px-3 py-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionPending || !editDraft.trim()}
                onClick={onEditSave}
                className="rounded-lg bg-indigo-500/80 px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div ref={showActions ? actionsRef : undefined} className="relative max-w-[90%]">
            {showActions && menuOpen && (
              <div
                className={`absolute z-20 mb-1 flex gap-1 rounded-lg border border-white/10 bg-app-surface p-1 shadow-xl ${
                  mine ? "bottom-full right-0" : "bottom-full left-0"
                }`}
              >
                <button
                  type="button"
                  disabled={actionPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onStartEdit(m);
                  }}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-50"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={actionPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(m);
                  }}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleTime}
              className={`inline-block break-words rounded-2xl px-3 py-1 text-left shadow-lg backdrop-blur-sm ${bubbleCls}`}
            >
              {m.content}
            </button>
            {showActions && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className={`absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white ${
                  mine ? "-left-8" : "-right-8"
                }`}
                aria-label="Message actions"
                aria-expanded={menuOpen}
              >
                ⋯
              </button>
            )}
          </div>
        )}

        {!isEditing && (m.editedAt || showTime) && (
          <div
            className={`mt-0.5 max-w-[90%] text-[11px] text-gray-500 ${
              mine ? "text-right" : "text-left"
            }`}
          >
            {m.editedAt && <span className="italic">(edited)</span>}
            {m.editedAt && showTime && <span aria-hidden="true"> · </span>}
            {showTime && <span>{fmtTime(m.createdAt)}</span>}
          </div>
        )}
        {mine && seenMyMessageId === m.id && !isEditing && (
          <div className="mt-1 text-right text-[11px] text-indigo-300/80">Seen</div>
        )}
      </div>
    </div>
  );
}
