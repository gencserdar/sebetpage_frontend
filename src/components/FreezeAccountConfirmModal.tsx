import { useState } from "react";

export const FREEZE_CONFIRM_PHRASE = "I confirm freezing my account.";

export interface FreezeAccountConfirmModalProps {
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function FreezeAccountConfirmModal({
  loading,
  onClose,
  onConfirm,
}: FreezeAccountConfirmModalProps) {
  const [phrase, setPhrase] = useState("");
  const matches = phrase === FREEZE_CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="text-xl font-bold text-white mb-4">Freeze account</h3>
        <p className="text-gray-300 text-sm mb-4">
          Type the following to confirm:
        </p>
        <p className="text-white text-sm font-mono mb-3 bg-black/30 rounded-lg px-3 py-2 border border-white/10">
          {FREEZE_CONFIRM_PHRASE}
        </p>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40 mb-6"
          placeholder={FREEZE_CONFIRM_PHRASE}
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
            className="rounded-lg bg-amber-600/80 px-6 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Freezing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
