import { useState } from "react";

export const DELETE_CONFIRM_PHRASE = "I understand, delete my account.";

export interface DeleteAccountConfirmModalProps {
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountConfirmModal({
  loading,
  onClose,
  onConfirm,
}: DeleteAccountConfirmModalProps) {
  const [phrase, setPhrase] = useState("");
  const matches = phrase === DELETE_CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950/95 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-3">Delete account permanently</h3>
        <p className="text-sm leading-relaxed text-gray-300 mb-4">
          This permanently deletes your account data and signs you out. Groups
          and communities with other members stay open and admin ownership is
          transferred.
        </p>
        <p className="text-gray-300 text-sm mb-3">Type the following to confirm:</p>
        <p className="text-white text-sm font-mono mb-3 bg-black/40 rounded-lg px-3 py-2 border border-white/10">
          {DELETE_CONFIRM_PHRASE}
        </p>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400/60 mb-6"
          placeholder={DELETE_CONFIRM_PHRASE}
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || loading}
            className="rounded-lg bg-red-600/85 px-6 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
