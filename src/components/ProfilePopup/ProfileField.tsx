import { Check, Edit3, X } from "lucide-react";
import { EditableField, UserEditableField } from "./types";

export interface ProfileFieldProps {
  label: string;
  field: EditableField;
  type?: string;
  isEditing: boolean;
  highlight: boolean;
  displayValue: string;
  canEdit: boolean;
  loading: boolean;
  error?: string | null;
  onChange: (field: UserEditableField, value: string) => void;
  onSubmit: (field: EditableField) => void;
  onStartEditing: (field: EditableField) => void;
  onCancel: (field: EditableField) => void;
}

export default function ProfileField({
  label,
  field,
  type = "text",
  isEditing,
  highlight,
  displayValue,
  canEdit,
  loading,
  error,
  onChange,
  onSubmit,
  onStartEditing,
  onCancel,
}: ProfileFieldProps) {
  return (
    <div className="group">
      <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wider">
        {label}
      </label>
      {isEditing && canEdit ? (
        <div className="flex items-center gap-3">
          <input
            type={type}
            value={displayValue}
            onChange={(e) => onChange(field as UserEditableField, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit(field);
              } else if (e.key === "Escape") {
                onCancel(field);
              }
            }}
            className={`bg-white/10 text-white rounded-lg px-4 py-3 flex-1 border transition-all duration-300 ${
              highlight
                ? "bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20"
                : "border-white/20"
            } focus:border-white/40 focus:outline-none backdrop-blur-sm`}
            disabled={loading}
            autoFocus
          />
          <button
            onClick={() => onSubmit(field)}
            className="bg-indigo-500/80 hover:bg-indigo-500 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Check size={16} />
            )}
          </button>
          <button
            onClick={() => onCancel(field)}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white transition-all duration-200 backdrop-blur-sm"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border transition-all duration-300 backdrop-blur-sm ${
            highlight
              ? "bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20"
              : "border-white/10"
          }`}
        >
          <span className="text-white">{displayValue || "Not set"}</span>
          {canEdit && (
            <button
              onClick={() => onStartEditing(field)}
              className="text-gray-300 hover:text-white p-2 transition-colors duration-200"
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>
      )}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
