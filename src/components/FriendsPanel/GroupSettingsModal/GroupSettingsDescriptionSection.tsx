import { Check, Edit3, X } from "lucide-react";

interface GroupSettingsDescriptionSectionProps {
  description: string;
  editingDescription: boolean;
  descriptionDraft: string;
  canEditDescription: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDescriptionDraftChange: (value: string) => void;
  onSave: () => void;
}

export default function GroupSettingsDescriptionSection({
  description,
  editingDescription,
  descriptionDraft,
  canEditDescription,
  saving,
  onStartEdit,
  onCancelEdit,
  onDescriptionDraftChange,
  onSave,
}: GroupSettingsDescriptionSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</span>
        {canEditDescription && !editingDescription && (
          <button
            onClick={onStartEdit}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
            title="Edit description"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>
      {editingDescription ? (
        <div className="flex items-start gap-2">
          <textarea
            value={descriptionDraft}
            onChange={(e) => onDescriptionDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelEdit();
            }}
            rows={3}
            className="min-w-0 flex-1 resize-none rounded-lg border border-gray-700 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            autoFocus
          />
          <button
            onClick={onSave}
            disabled={saving}
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
        </div>
      ) : (
        <p
          onDoubleClick={() => canEditDescription && onStartEdit()}
          className="min-h-[28px] rounded-lg px-1 py-1 text-sm leading-relaxed text-gray-300 transition hover:text-gray-100"
        >
          {description?.trim() || "No description yet."}
        </p>
      )}
    </div>
  );
}
