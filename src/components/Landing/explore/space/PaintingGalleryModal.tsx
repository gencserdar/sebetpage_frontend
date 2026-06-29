import { X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import type { LandingPainting } from "./landingPaintingService";

interface PaintingGalleryModalProps {
  paintings: LandingPainting[];
  visitorId: string;
  selectedId: number | null;
  onClose: () => void;
  onSelect: (painting: LandingPainting) => void;
}

export default function PaintingGalleryModal({
  paintings,
  visitorId,
  selectedId,
  onClose,
  onSelect,
}: PaintingGalleryModalProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(
    () => [...paintings].sort((a, b) => b.createdAt - a.createdAt),
    [paintings]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const frame = window.requestAnimationFrame(() => {
      if (selectedId != null) {
        const slide = track.querySelector<HTMLElement>(
          `[data-painting-id="${selectedId}"]`
        );
        slide?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
        return;
      }
      track.scrollLeft = 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [ordered, selectedId]);

  if (ordered.length === 0) return null;

  return createPortal(
    <div className="landing-space__gallery" role="dialog" aria-modal="true">
      <button
        type="button"
        className="landing-space__gallery-backdrop"
        aria-label="Close gallery"
        onClick={onClose}
      />
      <div className="landing-space__gallery-shell">
        <div className="landing-space__gallery-top">
          <p className="landing-space__gallery-hint">
            Scroll right for older · tap to spotlight on your page
          </p>
          <button type="button" className="landing-space__gallery-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div ref={trackRef} className="landing-space__gallery-track" tabIndex={0}>
          {ordered.map((painting) => {
            const selected = painting.id === selectedId;
            const mine = painting.visitorId === visitorId;
            return (
              <button
                key={painting.id}
                type="button"
                data-painting-id={painting.id}
                className={`landing-space__gallery-slide${
                  selected ? " landing-space__gallery-slide--selected" : ""
                }${mine ? " landing-space__gallery-slide--mine" : ""}`}
                onClick={() => onSelect(painting)}
              >
                <img src={painting.imageUrl} alt="" draggable={false} />
                {mine ? <span className="landing-space__gallery-mine">Yours</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
