import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { uploadPhoto } from "../../services/profileService";

export default function SettingsSidebarProfileCard() {
  const { user, setUser } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const response = await uploadPhoto(file);
      setUser((prev) =>
        prev ? { ...prev, profileImageUrl: response.value } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative mx-auto mb-4 block h-28 w-28 shrink-0 disabled:cursor-wait lg:h-32 lg:w-32"
        title="Change profile photo"
      >
        <img
          src={user.profileImageUrl || "https://via.placeholder.com/256"}
          alt={`${user.name} ${user.surname}`}
          className="h-full w-full rounded-full object-cover ring-2 ring-white/15 transition group-hover:ring-indigo-400/40"
        />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
          {uploading ? (
            <Loader2 size={28} className="animate-spin" />
          ) : (
            <>
              <Camera size={24} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Change</span>
            </>
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handlePhotoChange}
        disabled={uploading}
      />

      <p className="text-base font-semibold text-white lg:text-lg">
        {user.name} {user.surname}
      </p>
      <p className="mt-1 text-sm text-gray-500">@{user.nickname}</p>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
