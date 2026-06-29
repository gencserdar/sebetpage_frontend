import { Palette } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import PaintingCanvas from "./PaintingCanvas";
import PaintingGalleryModal from "./PaintingGalleryModal";
import PaintingStack from "./PaintingStack";
import {
  getMyLandingPainting,
  listLandingPaintings,
  uploadLandingPainting,
  type LandingPainting,
} from "./landingPaintingService";
import {
  clearSpotlightPaintingId,
  getSpotlightPaintingId,
  getVisitorId,
  setSpotlightPaintingId,
} from "./visitorId";

interface ExploreSpaceStageProps {
  subtitle: string;
}

export default function ExploreSpaceStage({ subtitle }: ExploreSpaceStageProps) {
  const visitorId = getVisitorId();
  const [paintings, setPaintings] = useState<LandingPainting[]>([]);
  const [myPainting, setMyPainting] = useState<LandingPainting | null>(null);
  const [spotlightId, setSpotlightId] = useState<number | null>(() =>
    getSpotlightPaintingId()
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);

  const spotlightPainting = useMemo(
    () => paintings.find((p) => p.id === spotlightId) ?? null,
    [paintings, spotlightId]
  );

  const refresh = useCallback(async () => {
    const [list, mine] = await Promise.all([
      listLandingPaintings(24),
      getMyLandingPainting(),
    ]);
    setPaintings(list);
    setMyPainting(mine);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (spotlightId === null) return;
    if (!paintings.some((p) => p.id === spotlightId)) {
      clearSpotlightPaintingId();
      setSpotlightId(null);
    }
  }, [paintings, spotlightId]);

  const handleSend = async (blob: Blob) => {
    setSending(true);
    try {
      const saved = await uploadLandingPainting(blob);
      setMyPainting(saved);
      setEditImageUrl(null);
      setEditorOpen(false);
      await refresh();
    } finally {
      setSending(false);
    }
  };

  const openEditor = (imageUrl?: string | null) => {
    setEditImageUrl(imageUrl ?? null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditImageUrl(null);
  };

  const handleGallerySelect = (painting: LandingPainting) => {
    setSpotlightPaintingId(painting.id);
    setSpotlightId(painting.id);
    setGalleryOpen(false);
  };

  return (
    <div className="landing-space">
      <div className="landing-space__story">
        <div className="landing-space__story-copy">
          <h2 className="landing-space__title">
            <span className="landing-space__title-accent">Your Space.</span>
            <span className="landing-space__title-main"> Your Rules.</span>
          </h2>
          <p className="landing-space__text">{subtitle}</p>
          <button
            type="button"
            className="landing-space__story-btn"
            onClick={() => openEditor(myPainting?.imageUrl)}
          >
            <Palette size={17} aria-hidden />
            Send us a painting
          </button>
        </div>
      </div>

      <div className="landing-space__showcase" aria-label="Paintings by you">
        <div className="landing-space__showcase-glow" aria-hidden />
        <PaintingStack
          paintings={paintings}
          spotlightPainting={spotlightPainting}
          visitorId={visitorId}
          onOpenGallery={() => setGalleryOpen(true)}
        />
      </div>

      {editorOpen ? (
        <PaintingCanvas
          onCollapse={closeEditor}
          initialImageUrl={editImageUrl}
          onSend={handleSend}
          sending={sending}
        />
      ) : null}

      {galleryOpen ? (
        <PaintingGalleryModal
          paintings={paintings}
          visitorId={visitorId}
          selectedId={spotlightId}
          onClose={() => setGalleryOpen(false)}
          onSelect={handleGallerySelect}
        />
      ) : null}
    </div>
  );
}
