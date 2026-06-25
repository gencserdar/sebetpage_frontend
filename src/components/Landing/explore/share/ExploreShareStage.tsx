import ExploreGlobe from "./globe/ExploreGlobe";

export default function ExploreShareStage({ subtitle }: { subtitle: string }) {
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
        <ExploreGlobe />
      </div>
    </div>
  );
}
