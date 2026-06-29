import type { LandingPainting } from "./landingPaintingService";

interface PaintingStackProps {
  paintings: LandingPainting[];
  spotlightPainting: LandingPainting | null;
  visitorId: string;
  onOpenGallery: () => void;
}

export default function PaintingStack({
  paintings,
  spotlightPainting,
  visitorId,
  onOpenGallery,
}: PaintingStackProps) {
  const visible = paintings.slice(0, 4);

  if (visible.length === 0) {
    return (
      <div className="landing-space__stack landing-space__stack--empty">
        <p className="landing-space__stack-label">Paintings by you</p>
        <p className="landing-space__stack-empty">Be the first brushstroke</p>
      </div>
    );
  }

  if (spotlightPainting) {
    const mine = spotlightPainting.visitorId === visitorId;
    return (
      <div className="landing-space__stack">
        <p className="landing-space__stack-label">Paintings by you</p>
        <button
          type="button"
          className="landing-space__stack-pile landing-space__stack-pile--spotlight"
          onClick={onOpenGallery}
          aria-label="Browse paintings"
        >
          <span
            className={`landing-space__stack-card landing-space__stack-card--spotlight${
              mine ? " landing-space__stack-card--mine" : ""
            }`}
          >
            <img src={spotlightPainting.imageUrl} alt="" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="landing-space__stack">
      <p className="landing-space__stack-label">Paintings by you</p>
      <button
        type="button"
        className="landing-space__stack-pile"
        onClick={onOpenGallery}
        aria-label={`View ${paintings.length} paintings`}
      >
        {visible.map((painting, index) => (
          <span
            key={painting.id}
            className={`landing-space__stack-card${
              painting.visitorId === visitorId ? " landing-space__stack-card--mine" : ""
            }`}
            style={{ "--stack-i": index } as React.CSSProperties}
          >
            <img src={painting.imageUrl} alt="" />
          </span>
        ))}
      </button>
    </div>
  );
}
