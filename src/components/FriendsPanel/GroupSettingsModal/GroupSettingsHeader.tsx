import { X } from "lucide-react";

interface GroupSettingsHeaderProps {
  onClose: () => void;
}

export default function GroupSettingsHeader({ onClose }: GroupSettingsHeaderProps) {
  return (
    <div className="z-10 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 py-3">
      <h2 className="text-base font-semibold">Group settings</h2>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
        title="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
