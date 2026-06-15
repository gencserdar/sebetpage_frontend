import { Check, LogOut, Trash2 } from "lucide-react";
import { MessagingGroupDetail } from "../../../services/chatApiService";

interface GroupSettingsActionsSectionProps {
  detail: MessagingGroupDetail;
  saving: boolean;
  meIsAdmin: boolean;
  error: string | null;
  onToggleMute: () => void;
  onExitGroup: () => void;
  onOpenDeleteConfirm: () => void;
}

export default function GroupSettingsActionsSection({
  detail,
  saving,
  meIsAdmin,
  error,
  onToggleMute,
  onExitGroup,
  onOpenDeleteConfirm,
}: GroupSettingsActionsSectionProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleMute}
        disabled={saving}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${
          detail.me.muted
            ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
            : "border-white/10 bg-white/[0.03] text-gray-200 hover:border-emerald-700/60 hover:bg-emerald-950/45"
        }`}
      >
        <span>Mute notifications</span>
        {detail.me.muted && <Check className="h-4 w-4 text-emerald-300" />}
      </button>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
        <button
          onClick={onExitGroup}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Exit group
        </button>
        {meIsAdmin && (
          <button
            onClick={onOpenDeleteConfirm}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete group
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
    </>
  );
}
