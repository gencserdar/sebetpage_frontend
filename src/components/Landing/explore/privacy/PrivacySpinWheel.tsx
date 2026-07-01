import { useCallback, useState } from "react";

import {
  PRIVACY_WHEEL_GREEN_INDEX,
  PRIVACY_WHEEL_SEGMENTS,
  pickWheelOutcome,
} from "./privacyWheelUtils";

interface PrivacySpinWheelProps {
  onWin: () => void;
  onLose: () => void;
  tryAgain: boolean;
  visible: boolean;
}

export default function PrivacySpinWheel({
  onWin,
  onLose,
  tryAgain,
  visible,
}: PrivacySpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);

    const win = pickWheelOutcome();
    const targetIndex = win
      ? PRIVACY_WHEEL_GREEN_INDEX
      : 1 + Math.floor(Math.random() * (PRIVACY_WHEEL_SEGMENTS - 1));

    setRotation((prev) => {
      const segmentAngle = 360 / PRIVACY_WHEEL_SEGMENTS;
      const segmentCenter = targetIndex * segmentAngle + segmentAngle / 2;
      const landing = 360 - segmentCenter;
      const currentMod = ((prev % 360) + 360) % 360;
      let adjust = landing - currentMod;
      if (adjust <= 0) adjust += 360;
      const spins = 4 + Math.floor(Math.random() * 3);
      return prev + spins * 360 + adjust;
    });

    window.setTimeout(() => {
      setSpinning(false);
      if (win) onWin();
      else onLose();
    }, 4200);
  }, [onLose, onWin, spinning]);

  const segmentAngle = 360 / PRIVACY_WHEEL_SEGMENTS;
  const radius = 88;
  const cx = 100;
  const cy = 100;

  const slices = Array.from({ length: PRIVACY_WHEEL_SEGMENTS }, (_, i) => {
    const start = (i * segmentAngle - 90) * (Math.PI / 180);
    const end = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const isGreen = i === PRIVACY_WHEEL_GREEN_INDEX;
    return (
      <path
        key={`slice-${i}`}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
        className={
          isGreen
            ? "landing-privacy__wheel-slice landing-privacy__wheel-slice--green"
            : "landing-privacy__wheel-slice landing-privacy__wheel-slice--red"
        }
      />
    );
  });

  const spokes = Array.from({ length: PRIVACY_WHEEL_SEGMENTS }, (_, i) => {
    const angle = (i * segmentAngle - 90) * (Math.PI / 180);
    const x2 = cx + Math.cos(angle) * radius;
    const y2 = cy + Math.sin(angle) * radius;
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        className="landing-privacy__wheel-spoke"
      />
    );
  });

  const buttonLabel = spinning
    ? "Spinning…"
    : tryAgain
      ? "Try again"
      : "Spin";

  return (
    <div
      className={`landing-privacy__wheel-wrap${
        visible ? " landing-privacy__wheel-wrap--visible" : ""
      }`}
    >
      <div className="landing-privacy__wheel-pointer" aria-hidden />
      <svg
        viewBox="0 0 200 200"
        className="landing-privacy__wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 4.1s cubic-bezier(0.12, 0.75, 0.1, 1)"
            : "none",
        }}
        aria-hidden
      >
        <g className="landing-privacy__wheel-body">{slices}</g>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          className="landing-privacy__wheel-ring"
          fill="none"
        />
        <g>{spokes}</g>
        <circle
          cx={cx}
          cy={cy}
          r={7}
          className="landing-privacy__wheel-hub"
          fill="none"
        />
      </svg>
      <button
        type="button"
        className={`landing-privacy__wheel-btn${
          tryAgain && !spinning ? " landing-privacy__wheel-btn--retry" : ""
        }`}
        onClick={spin}
        disabled={spinning || !visible}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
