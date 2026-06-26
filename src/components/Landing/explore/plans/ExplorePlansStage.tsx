import PlansEventDemo from "./demo/PlansEventDemo";

export default function ExplorePlansStage({ subtitle }: { subtitle: string }) {
  return (
    <div className="landing-plans">
      <div className="landing-plans__story">
        <div className="landing-plans__story-copy">
          <h2 className="landing-plans__title">
            <span className="landing-plans__title-accent">Make plans</span>
            <span className="landing-plans__title-main"> happen.</span>
          </h2>
          <p className="landing-plans__text">{subtitle}</p>
        </div>
      </div>

      <div className="landing-plans__showcase" aria-label="Event planning preview">
        <div className="landing-plans__showcase-glow" aria-hidden />
        <PlansEventDemo />
      </div>
    </div>
  );
}
