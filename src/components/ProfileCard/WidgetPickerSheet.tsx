import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { WIDGET_CATALOG, WIDGET_ICONS } from "./constants";
import { ProfileWidget } from "./types";

interface WidgetPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProfileWidget["type"]) => void;
}

export default function WidgetPickerSheet({ open, onClose, onSelect }: WidgetPickerSheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close block picker"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121218] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Add a block</h3>
            <p className="text-sm text-gray-500">Choose something to put on your canvas.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="indigo-scrollbar max-h-[min(420px,60vh)] space-y-2 overflow-y-auto pr-1">
          {WIDGET_CATALOG.map((item) => {
            const Icon = WIDGET_ICONS[item.type];
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  onSelect(item.type);
                  onClose();
                }}
                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-indigo-400/30 hover:bg-indigo-500/10"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-white">{item.label}</span>
                  <span className="block text-sm text-gray-500">{item.description}</span>
                </span>
                <Plus size={18} className="ml-auto shrink-0 text-gray-500" />
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
