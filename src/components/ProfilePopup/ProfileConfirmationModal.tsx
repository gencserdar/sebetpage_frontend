import { ConfirmationModalState } from "./types";

export interface ProfileConfirmationModalProps {
  modal: NonNullable<ConfirmationModalState>;
  onClose: () => void;
}

export default function ProfileConfirmationModal({
  modal,
  onClose,
}: ProfileConfirmationModalProps) {
  const { type, message, onConfirm } = modal;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-white/15 bg-app-surface/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
        <p className="text-gray-200 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded-lg bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onConfirm();
            }}
            className={`rounded-lg px-6 py-3 font-semibold shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
              type === "block"
                ? "bg-orange-600/80 hover:bg-orange-600 text-white"
                : type === "unblock"
                  ? "bg-gray-600/80 hover:bg-gray-600 text-white"
                  : "bg-red-600/80 hover:bg-red-600 text-white"
            }`}
          >
            {type === "removeFriend"
              ? "Remove"
              : type === "block"
                ? "Block"
                : type === "unblock"
                  ? "Unblock"
                  : "Cancel Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
