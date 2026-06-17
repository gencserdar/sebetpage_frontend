import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WsMessageDTO } from "../../../types/WSMessageDTO";
import { fmtTime } from "../FriendChat/chatUtils";

interface GroupChatBubbleProps {
  message: WsMessageDTO;
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

export default function GroupChatBubble({
  message: m,
  messages,
  myUserId,
  nickOf,
  editingMessageId,
  editDraft = "",
  onEditDraftChange,
  onEditSave,
  onEditCancel,
  onStartEdit,
  onDelete,
  actionPending = false,
}: GroupChatBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

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
    if (editingMessageId === m.id) setMenuOpen(false);
  }, [editingMessageId, m.id]);

  if (Number(m.senderId) === 0) {
    return (
      <div className="my-3 flex w-full justify-center">
        <div className="max-w-[85%] rounded-full border border-emerald-500/20 bg-emerald-950/35 px-3 py-1.5 text-center text-xs text-emerald-200/90">
          {m.content}
        </div>
      </div>
    );
  }

  if (m.deleted) {
    const mine = m.senderId === myUserId;
    return (
      <div className={`mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-1 text-sm italic text-gray-500">
          Message deleted
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
  const isEditing = editingMessageId === m.id;
  const showActions = mine && onStartEdit && onDelete;

  return (
    <div className={`group relative mb-1 flex w-full ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`relative flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {showHeader && !isEditing && (
          <div className={`mb-0.5 px-1 text-xs text-gray-400 ${mine ? "text-right" : "text-left"}`}>
            {mine ? `${fmtTime(m.createdAt)}` : `${nickOf(m.senderId)} - ${fmtTime(m.createdAt)}`}
            {m.editedAt ? " · edited" : ""}
          </div>
        )}

        {isEditing ? (
          <div className="w-full space-y-2">
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
              <button type="button" onClick={onEditCancel} className="rounded-lg px-3 py-1 text-xs text-gray-400 hover:text-white">
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
          <div ref={showActions ? actionsRef : undefined} className="relative">
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
      </div>
    </div>
  );
}
