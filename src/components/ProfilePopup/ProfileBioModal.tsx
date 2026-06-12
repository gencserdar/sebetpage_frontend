import { useEffect } from "react";
import { X } from "lucide-react";

interface ProfileBioModalProps {
  bio: string;
  nickname: string;
  onClose: () => void;
}

export default function ProfileBioModal({ bio, nickname, onClose }: ProfileBioModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/20 bg-gray-950/95 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-bio-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 id="profile-bio-modal-title" className="pr-8 text-sm font-semibold text-white">
          @{nickname}
        </h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300 [overflow-wrap:anywhere]">
          {bio}
        </p>
      </div>
    </div>
  );
}
