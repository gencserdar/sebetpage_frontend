import { ImagePlus, Upload, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";

import { DEMO_HOST, DEMO_INVITEES, DEMO_RECIPIENT } from "./mockDemoPeople";
import type { GalleryPhoto } from "./plansDemoTypes";

interface EventGalleryProps {
  photos: GalleryPhoto[];
  onAddPhotos: (files: File[], authorId: string, authorName: string) => void;
}

function readImageFiles(list: FileList | null): File[] {
  if (!list) return [];
  return Array.from(list).filter((file) => file.type.startsWith("image/"));
}

function formatPhotoDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventGallery({ photos, onAddPhotos }: EventGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const avatarById = useMemo(() => {
    const map = new Map<string, string>();
    map.set(DEMO_HOST.id, DEMO_HOST.avatar);
    map.set(DEMO_RECIPIENT.id, DEMO_RECIPIENT.avatar);
    DEMO_INVITEES.forEach((person) => map.set(person.id, person.avatar));
    return map;
  }, []);

  const ingest = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      onAddPhotos(files, DEMO_RECIPIENT.id, DEMO_RECIPIENT.name);
    },
    [onAddPhotos],
  );

  const onPaste = useCallback(
    (event: globalThis.ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length) {
        event.preventDefault();
        ingest(files);
      }
    },
    [ingest],
  );

  useEffect(() => {
    const handler = (event: ClipboardEvent) => onPaste(event);
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onPaste]);

  useEffect(() => {
    if (!activePhoto) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePhoto(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activePhoto]);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    ingest(readImageFiles(event.dataTransfer.files));
  };

  const activeAvatar =
    activePhoto && avatarById.get(activePhoto.authorId)
      ? avatarById.get(activePhoto.authorId)
      : DEMO_RECIPIENT.avatar;

  const lightbox =
    activePhoto && typeof document !== "undefined" ? (
      <div
        className="landing-plans-demo__gallery-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Photo preview"
        onClick={() => setActivePhoto(null)}
      >
        <article
          className="landing-plans-demo__gallery-lightbox-card"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="landing-plans-demo__gallery-lightbox-close"
            onClick={() => setActivePhoto(null)}
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
          <img
            className="landing-plans-demo__gallery-lightbox-image"
            src={activePhoto.url}
            alt=""
          />
          <div className="landing-plans-demo__gallery-lightbox-meta">
            <img src={activeAvatar} alt="" />
            <div>
              <p className="landing-plans-demo__gallery-lightbox-user">
                Uploaded by <strong>{activePhoto.authorName}</strong>
              </p>
              <time dateTime={new Date(activePhoto.createdAt).toISOString()}>
                {formatPhotoDate(activePhoto.createdAt)}
              </time>
            </div>
          </div>
        </article>
      </div>
    ) : null;

  return (
    <div className="landing-plans-demo__gallery">
      <div
        ref={zoneRef}
        tabIndex={0}
        className={`landing-plans-demo__gallery-drop${
          dragging ? " landing-plans-demo__gallery-drop--active" : ""
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={onDrop}
      >
        <ImagePlus size={14} aria-hidden />
        <p className="landing-plans-demo__gallery-drop-text">
          Drop, paste, or browse photos
        </p>
        <button
          type="button"
          className="landing-plans-demo__ghost-btn landing-plans-demo__ghost-btn--compact landing-plans-demo__gallery-browse"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={12} />
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            ingest(readImageFiles(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {photos.length ? (
        <div className="landing-plans-demo__gallery-grid indigo-scrollbar">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="landing-plans-demo__gallery-item"
              onClick={() => setActivePhoto(photo)}
              aria-label={`View photo uploaded by ${photo.authorName}`}
            >
              <img src={photo.url} alt="" />
            </button>
          ))}
        </div>
      ) : (
        <p className="landing-plans-demo__gallery-empty">No photos yet — add the first one.</p>
      )}

      {lightbox ? createPortal(lightbox, document.body) : null}
    </div>
  );
}
