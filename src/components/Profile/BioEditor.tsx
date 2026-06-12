import { MAX_BIO_LENGTH, sanitizeBio } from "./types";

interface BioEditorProps {
  bio: string;
  onBioChange: (bio: string) => void;
}

export default function BioEditor({ bio, onBioChange }: BioEditorProps) {
  return (
    <section className="mb-6 min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:p-6">
      <label htmlFor="profile-bio" className="mb-3 block text-sm font-semibold text-white">
        Bio
      </label>
      <textarea
        id="profile-bio"
        value={bio}
        rows={4}
        wrap="soft"
        onChange={(e) => onBioChange(sanitizeBio(e.target.value))}
        placeholder="Tell people a little about yourself..."
        className="bio-textarea indigo-scrollbar box-border block w-full max-w-full resize-y overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder-gray-600 outline-none transition focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20"
        style={{ minHeight: "6rem", maxHeight: "12rem" }}
      />
      <p className="mt-2 text-right text-xs text-gray-600">
        {bio.length}/{MAX_BIO_LENGTH}
      </p>
    </section>
  );
}
