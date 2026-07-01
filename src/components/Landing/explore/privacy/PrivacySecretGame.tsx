import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";

import PrivacyConfetti from "./PrivacyConfetti";
import PrivacySeaSprite from "./PrivacySeaSprite";
import PrivacySpinWheel from "./PrivacySpinWheel";
import { generateWheelUnlockCode } from "./privacyWheelUtils";

const SECRET_LINES = [
  "Everybody have secrets.",
  "Even us.",
  "Do you want to know what Sebet means?",
  "Spin the wheel to learn if you are worthy!",
] as const;

const FLEE_MS = 720;
const SETTLE_MS = 480;

export default function PrivacySecretGame() {
  const [linesShown, setLinesShown] = useState(0);
  const [spriteSlot, setSpriteSlot] = useState(0);
  const [fleeing, setFleeing] = useState(false);
  const [fleeExit, setFleeExit] = useState(false);
  const [settling, setSettling] = useState(false);
  const [spriteHidden, setSpriteHidden] = useState(false);
  const [wheelVisible, setWheelVisible] = useState(false);
  const [tryAgain, setTryAgain] = useState(false);
  const [won, setWon] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (linesShown < SECRET_LINES.length) return;
    const timer = window.setTimeout(() => setWheelVisible(true), 520);
    return () => window.clearTimeout(timer);
  }, [linesShown]);

  const revealLine = useCallback(
    (index: number) => {
      if (index !== linesShown || fleeing || settling || spriteHidden) return;

      const isLast = index === SECRET_LINES.length - 1;
      setFleeing(true);
      setFleeExit(isLast);
      setLinesShown(index + 1);

      window.setTimeout(() => {
        setFleeing(false);
        setFleeExit(false);
        if (isLast) {
          setSpriteHidden(true);
          return;
        }
        setSpriteSlot(index + 1);
        setSettling(true);
        window.setTimeout(() => setSettling(false), SETTLE_MS);
      }, FLEE_MS);
    },
    [fleeing, linesShown, settling, spriteHidden]
  );

  const onWin = useCallback(() => {
    setTryAgain(false);
    setWon(true);
    setUnlockCode(generateWheelUnlockCode());
    setConfetti(true);
  }, []);

  const onLose = useCallback(() => {
    setTryAgain(true);
  }, []);

  const closeWin = useCallback(() => {
    setWon(false);
    setTryAgain(false);
    setCodeCopied(false);
  }, []);

  const copyCode = useCallback(async () => {
    if (!unlockCode) return;
    try {
      await navigator.clipboard.writeText(unlockCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [unlockCode]);

  return (
    <div className="landing-privacy__showcase" aria-label="Secret wheel game">
      <div className="landing-privacy__secret-copy">
        <PrivacySeaSprite
          slotIndex={spriteSlot}
          fleeing={fleeing}
          fleeExit={fleeExit}
          settling={settling}
          hidden={spriteHidden}
        />

        {SECRET_LINES.map((line, index) => {
          const revealed = index < linesShown;
          const isActive = index === linesShown && !spriteHidden;
          const isLocked = index > linesShown;

          return (
            <div
              key={line}
              className={`landing-privacy__secret-slot${
                isActive ? " landing-privacy__secret-slot--active" : ""
              }${isLocked ? " landing-privacy__secret-slot--locked" : ""}${
                revealed ? " landing-privacy__secret-slot--revealed" : ""
              }`}
              onPointerEnter={() => revealLine(index)}
              onFocus={() => revealLine(index)}
              tabIndex={isActive ? 0 : -1}
              role={isActive ? "button" : undefined}
              aria-label={isActive ? `Reveal: ${line}` : undefined}
              aria-disabled={isLocked}
            >
              {revealed ? (
                <p className="landing-privacy__secret-line landing-privacy__secret-line--in">
                  {line}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <PrivacySpinWheel
        visible={wheelVisible}
        tryAgain={tryAgain}
        onWin={onWin}
        onLose={onLose}
      />

      {confetti ? createPortal(<PrivacyConfetti active />, document.body) : null}

      {won
        ? createPortal(
            <div className="landing-privacy__win" role="dialog" aria-modal="true">
              <div className="landing-privacy__win-card">
                <h3 className="landing-privacy__win-title">Congrats!!</h3>
                <p className="landing-privacy__win-text">
                  You made it — or the wheel finally wore down. Either way, you get
                  the point: we would rather bend the rules on a tiny game than spell
                  out what Sebet means. Secrets matter to us. We guard our own the
                  same way we mean to guard yours.
                </p>
                <p className="landing-privacy__win-text">
                  As a thank-you for playing along, here is a code to unlock the
                  Wheel block on your profile canvas:
                </p>
                <div className="landing-privacy__win-code-row">
                  <p className="landing-privacy__win-code" aria-label="Unlock code">
                    {unlockCode}
                  </p>
                  <button
                    type="button"
                    className="landing-privacy__win-copy"
                    onClick={() => void copyCode()}
                    aria-label={codeCopied ? "Code copied" : "Copy code"}
                  >
                    {codeCopied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                  </button>
                </div>
                <p className="landing-privacy__win-foot">
                  Go to <strong>Settings → Use code</strong> to activate the Wheel
                  block.
                </p>
                <button
                  type="button"
                  className="landing-privacy__win-close"
                  onClick={closeWin}
                >
                  Close
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
