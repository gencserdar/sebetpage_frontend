import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  getPlatformDef,
  SOCIAL_PLATFORMS,
  SocialPlatform,
  validateSocialUrl,
} from "./socialPlatforms";
import SocialPlatformIcon, { getSocialIconShell } from "./SocialPlatformIcon";
import { SocialLink } from "./types";

interface SocialLinksEditorProps {
  socialLinks: SocialLink[];
  onAdd: (platform: SocialPlatform, url: string) => void;
  onUpdate: (id: string, url: string) => void;
  onRemove: (id: string) => void;
}

type FormMode = { kind: "add" } | { kind: "edit"; linkId: string };

export default function SocialLinksEditor({
  socialLinks,
  onAdd,
  onUpdate,
  onRemove,
}: SocialLinksEditorProps) {
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const usedPlatforms = useMemo(
    () => new Set(socialLinks.map((link) => link.platform)),
    [socialLinks]
  );

  const unusedPlatforms = useMemo(
    () => SOCIAL_PLATFORMS.filter((item) => !usedPlatforms.has(item.id)),
    [usedPlatforms]
  );

  const canAddMore = unusedPlatforms.length > 0;
  const editingLink =
    formMode?.kind === "edit"
      ? socialLinks.find((link) => link.id === formMode.linkId) ?? null
      : null;

  const selectedPlatform =
    formMode?.kind === "edit"
      ? editingLink?.platform ?? null
      : platform ?? unusedPlatforms[0]?.id ?? null;

  const selectedDef = selectedPlatform ? getPlatformDef(selectedPlatform) : null;

  useEffect(() => {
    if (formMode?.kind !== "add") return;
    if (selectedPlatform && usedPlatforms.has(selectedPlatform)) {
      setPlatform(unusedPlatforms[0]?.id ?? null);
    }
  }, [formMode, selectedPlatform, usedPlatforms, unusedPlatforms]);

  const resetForm = () => {
    setFormMode(null);
    setUrl("");
    setError(null);
    setDropdownOpen(false);
    setPlatform(null);
  };

  const startAdding = () => {
    if (!canAddMore) return;
    setFormMode({ kind: "add" });
    setPlatform(unusedPlatforms[0].id);
    setUrl("");
    setError(null);
  };

  const startEditing = (link: SocialLink) => {
    setFormMode({ kind: "edit", linkId: link.id });
    setPlatform(link.platform);
    setUrl(link.url);
    setError(null);
    setDropdownOpen(false);
  };

  const handleSave = () => {
    if (!selectedPlatform) return;

    const result = validateSocialUrl(selectedPlatform, url);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (formMode?.kind === "edit") {
      onUpdate(formMode.linkId, result.url);
    } else {
      if (usedPlatforms.has(selectedPlatform)) {
        setError("You already added a link for this platform.");
        return;
      }
      onAdd(selectedPlatform, result.url);
    }

    resetForm();
  };

  const handleRemoveLink = (id: string) => {
    if (formMode?.kind === "edit" && formMode.linkId === id) {
      resetForm();
    }
    onRemove(id);
  };

  const selectedShell =
    selectedPlatform && selectedDef
      ? getSocialIconShell(selectedDef.brandColor, 15)
      : null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-white">Other account links</h3>
        {!formMode && canAddMore && (
          <button
            type="button"
            onClick={startAdding}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-200 transition hover:bg-indigo-500/20"
          >
            <Plus size={16} />
            Add link
          </button>
        )}
      </div>

      {socialLinks.length > 0 && (
        <ul className="indigo-scrollbar mb-4 max-h-[14.5rem] space-y-2 overflow-y-auto pr-1">
          {socialLinks.map((link) => {
            const def = getPlatformDef(link.platform);
            const shell = getSocialIconShell(def.brandColor, 17);
            const isEditing = formMode?.kind === "edit" && formMode.linkId === link.id;

            return (
              <li
                key={link.id}
                className={`flex items-center gap-1 rounded-xl border pr-1 transition ${
                  isEditing
                    ? "border-indigo-400/40 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => startEditing(link)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] rounded-l-xl"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={shell.wrapperStyle}
                  >
                    <SocialPlatformIcon platform={link.platform} size={shell.iconSize} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{def.label}</p>
                    <p className="truncate text-xs text-gray-500">{link.url}</p>
                  </div>
                  <Pencil size={14} className="shrink-0 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.id)}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/15 hover:text-red-300"
                  aria-label={`Remove ${def.label}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {socialLinks.length === 0 && !formMode && (
        <p className="text-sm text-gray-600">No linked accounts yet.</p>
      )}

      {!canAddMore && socialLinks.length > 0 && !formMode && (
        <p className="text-xs text-gray-600">One link per platform — remove one to add another.</p>
      )}

      {formMode && selectedPlatform && selectedDef && selectedShell && (
        <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {formMode.kind === "edit" ? "Edit link" : "New link"}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-gray-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative mb-3">
            <label className="mb-1.5 block text-xs text-gray-500">Platform</label>
            {formMode.kind === "edit" ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={selectedShell.wrapperStyle}
                >
                  <SocialPlatformIcon platform={selectedPlatform} size={selectedShell.iconSize} />
                </span>
                {selectedDef.label}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-left text-sm text-white"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={selectedShell.wrapperStyle}
                    >
                      <SocialPlatformIcon platform={selectedPlatform} size={selectedShell.iconSize} />
                    </span>
                    {selectedDef.label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="indigo-scrollbar absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#121218] py-1 shadow-xl">
                    {unusedPlatforms.map((item) => {
                      const itemShell = getSocialIconShell(item.brandColor, 15);

                      return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPlatform(item.id);
                          setDropdownOpen(false);
                          setError(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/[0.06]"
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md"
                          style={itemShell.wrapperStyle}
                        >
                          <SocialPlatformIcon platform={item.id} size={itemShell.iconSize} />
                        </span>
                        {item.label}
                      </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="social-link-url" className="mb-1.5 block text-xs text-gray-500">
              Profile URL
            </label>
            <input
              id="social-link-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder={selectedDef.placeholder}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-400/40"
            />
          </div>

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              Save link
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
