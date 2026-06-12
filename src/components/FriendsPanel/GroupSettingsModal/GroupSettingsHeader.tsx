import { X } from "lucide-react";

interface GroupSettingsHeaderProps {
  onClose: () => void;
}

export default function GroupSettingsHeader({ onClose }: GroupSettingsHeaderProps) {
  return (
    <div className="relative z-30 flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950 px-4 py-3">
      <h2 className="text-base font-semibold">Group settings</h2>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        className="relative z-30 flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-gray-400 transition active:bg-gray-800 active:text-white"
        title="Close"
        aria-label="Close group settings"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
