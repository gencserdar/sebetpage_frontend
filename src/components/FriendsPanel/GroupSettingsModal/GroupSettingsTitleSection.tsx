import { Check, Edit3, X } from "lucide-react";

interface GroupSettingsTitleSectionProps {
  displayName: string;
  editingTitle: boolean;
  titleDraft: string;
  canEditName: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTitleDraftChange: (value: string) => void;
  onSave: () => void;
}

export default function GroupSettingsTitleSection({
  displayName,
  editingTitle,
  titleDraft,
  canEditName,
  saving,
  onStartEdit,
  onCancelEdit,
  onTitleDraftChange,
  onSave,
}: GroupSettingsTitleSectionProps) {
  return (
    <div className="border-b border-white/10 px-4 py-4">
      <div className="flex items-center justify-center gap-2">
        {editingTitle ? (
          <>
            <input
              value={titleDraft}
              onChange={(e) => onTitleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-indigo-400"
              autoFocus
            />
            <button
              onClick={onSave}
              disabled={!canEditName || saving}
              className="rounded-lg bg-indigo-500 px-3 py-3 text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-lg bg-white/10 px-3 py-3 text-white transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div
              onDoubleClick={() => canEditName && onStartEdit()}
              className="min-w-0 truncate text-lg font-semibold"
            >
              {displayName}
            </div>
            {canEditName && (
              <button
                onClick={onStartEdit}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                title="Change name"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
