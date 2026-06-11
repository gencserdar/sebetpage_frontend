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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
        <p className="text-gray-200 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 backdrop-blur-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm ${
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
