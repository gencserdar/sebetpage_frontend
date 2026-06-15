import { Loader2, Plus } from "lucide-react";
import { MessagingGroupDetail } from "../../../services/chatApiService";

interface GroupSettingsHeroProps {
  detail: MessagingGroupDetail;
  initial: string;
  canEditPhoto: boolean;
  saving: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadPhoto: (file?: File) => void;
}

export default function GroupSettingsHero({
  detail,
  initial,
  canEditPhoto,
  saving,
  fileInputRef,
  onUploadPhoto,
}: GroupSettingsHeroProps) {
  return (
    <div className="relative z-0 aspect-square w-full overflow-hidden border-b border-white/10">
      {detail.imageUrl ? (
        <img
          src={detail.imageUrl}
          alt="Group"
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-indigo-900/55 text-6xl font-bold">
          {initial}
        </div>
      )}
      {canEditPhoto && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/45 hover:opacity-100 disabled:cursor-not-allowed"
          title="Upload group photo"
        >
          {saving ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : (
            <Plus className="h-10 w-10" />
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onUploadPhoto(e.target.files?.[0])}
      />
    </div>
  );
}
