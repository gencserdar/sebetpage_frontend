interface ChatDeleteConfirmProps {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ChatDeleteConfirm({
  pending,
  onCancel,
  onConfirm,
}: ChatDeleteConfirmProps) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-xl bg-black/60 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-delete-title"
        className="w-full max-w-xs rounded-2xl border border-white/10 bg-app-surface p-4 text-white shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
      >
        <h3 id="chat-delete-title" className="text-sm font-semibold text-white">
          Delete message?
        </h3>
        <p className="mt-2 text-xs text-gray-400">
          This message will be removed for everyone in the chat.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
