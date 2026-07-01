import PrivacySecretGame from "./PrivacySecretGame";

interface ExplorePrivacyStageProps {
  subtitle: string;
}

export default function ExplorePrivacyStage({ subtitle }: ExplorePrivacyStageProps) {
  return (
    <div className="landing-privacy">
      <div className="landing-privacy__story">
        <div className="landing-privacy__story-copy">
          <h2 className="landing-privacy__title">
            <span className="landing-privacy__title-accent">Privacy</span>
            <span className="landing-privacy__title-main"> on your terms.</span>
          </h2>
          <p className="landing-privacy__text">{subtitle}</p>
        </div>
      </div>

      <PrivacySecretGame />
    </div>
  );
}
