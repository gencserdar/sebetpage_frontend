import { useState } from "react";

import ExploreGlobe from "./globe/ExploreGlobe";
import GlobePostBubble from "./GlobePostBubble";
import type { GlobePost } from "./mockGlobePosts";

export default function ExploreShareStage({ subtitle }: { subtitle: string }) {
  const [activePost, setActivePost] = useState<GlobePost | null>(null);

  return (
    <div className="landing-share">
      <div className="landing-share__story">
        <div className="landing-share__story-copy">
          <h2 className="landing-share__title">
            <span className="landing-share__title-accent">Share</span>
            <span className="landing-share__title-main"> your moment.</span>
          </h2>
          <p className="landing-share__text">{subtitle}</p>
        </div>
      </div>

      <div className="landing-share__showcase" aria-label="Global sharing preview">
        <div className="landing-share__showcase-glow" aria-hidden />
        <div className="landing-share__globe-stage">
          <ExploreGlobe onActivePostChange={setActivePost} />
          {activePost ? <GlobePostBubble post={activePost} /> : null}
        </div>
      </div>
    </div>
  );
}
