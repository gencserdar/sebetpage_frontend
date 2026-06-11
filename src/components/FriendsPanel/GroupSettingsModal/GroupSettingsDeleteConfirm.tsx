interface GroupSettingsDeleteConfirmProps {
  deleteText: string;
  saving: boolean;
  onDeleteTextChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function GroupSettingsDeleteConfirm({
  deleteText,
  saving,
  onDeleteTextChange,
  onCancel,
  onConfirm,
}: GroupSettingsDeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-gray-950 p-4 text-white shadow-2xl">
        <h3 className="text-base font-semibold text-red-200">Delete group</h3>
        <p className="mt-2 text-sm text-gray-400">
          Type <span className="font-mono text-gray-200">I confirm deletion.</span> to permanently delete this group.
        </p>
        <input
          value={deleteText}
          onChange={(e) => onDeleteTextChange(e.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleteText !== "I confirm deletion." || saving}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete group
          </button>
        </div>
      </div>
    </div>
  );
}
