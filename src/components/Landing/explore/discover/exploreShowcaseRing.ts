export type ShowcaseEntryEdge =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-right"
  | "bottom-right"
  | "bottom-left"
  | "top-left";

export type ShowcaseRingSlot = {
  top: string;
  left: string;
  rotate: number;
  drift: string;
  delay: string;
  duration: string;
  edge: ShowcaseEntryEdge;
  centerDistance: number;
  enterTop: string;
  enterLeft: string;
};

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function jitter(seed: number, min: number, max: number) {
  const t = (seed % 1000) / 1000;
  return min + (max - min) * t;
}

function angleToEdge(angle: number): ShowcaseEntryEdge {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return "right";
  if (deg < 67.5) return "bottom-right";
  if (deg < 112.5) return "bottom";
  if (deg < 157.5) return "bottom-left";
  if (deg < 202.5) return "left";
  if (deg < 247.5) return "top-left";
  if (deg < 292.5) return "top";
  return "top-right";
}

export function entryWrapPosition(
  edge: ShowcaseEntryEdge,
  finalTop: string,
  finalLeft: string
): { top: string; left: string } {
  const t = Number.parseFloat(finalTop);
  const l = Number.parseFloat(finalLeft);
  const pull = 44;

  switch (edge) {
    case "top":
      return { top: `${(t - pull).toFixed(2)}%`, left: finalLeft };
    case "bottom":
      return { top: `${(t + pull).toFixed(2)}%`, left: finalLeft };
    case "left":
      return { top: finalTop, left: `${(l - pull).toFixed(2)}%` };
    case "right":
      return { top: finalTop, left: `${(l + pull).toFixed(2)}%` };
    case "top-left":
      return {
        top: `${(t - pull * 0.82).toFixed(2)}%`,
        left: `${(l - pull * 0.82).toFixed(2)}%`,
      };
    case "top-right":
      return {
        top: `${(t - pull * 0.82).toFixed(2)}%`,
        left: `${(l + pull * 0.82).toFixed(2)}%`,
      };
    case "bottom-left":
      return {
        top: `${(t + pull * 0.82).toFixed(2)}%`,
        left: `${(l - pull * 0.82).toFixed(2)}%`,
      };
    case "bottom-right":
      return {
        top: `${(t + pull * 0.82).toFixed(2)}%`,
        left: `${(l + pull * 0.82).toFixed(2)}%`,
      };
  }
}

function ringRadiusBase(count: number, isMobile = false) {
  const n = Math.max(1, count);
  const base = 26 + (n / 15) * 22;
  return isMobile ? base * 0.68 : base;
}

export function computeRingLayout(cardCount: number, isMobile = false) {
  const radius = ringRadiusBase(cardCount, isMobile) + 5;
  return {
    orbitWidth: `${(radius * 2 * 0.96).toFixed(2)}%`,
    orbitHeight: `${(radius * 2 * 0.98).toFixed(2)}%`,
  };
}

export function radialExitOffset(
  leftPercent: number,
  topPercent: number,
  visibleMix: number
) {
  const spread = (1 - visibleMix) * 44;
  const dx = leftPercent - 50;
  const dy = topPercent - 50;
  const len = Math.hypot(dx, dy);
  if (len < 0.35) {
    return { x: 0, y: spread };
  }
  return {
    x: (dx / len) * spread,
    y: (dy / len) * spread,
  };
}
export function dissolvePullTowardCenter(slot: ShowcaseRingSlot) {
  const left = Number.parseFloat(slot.left);
  const top = Number.parseFloat(slot.top);
  return {
    x: `${((50 - left) * 0.52).toFixed(2)}%`,
    y: `${((50 - top) * 0.52).toFixed(2)}%`,
  };
}

export function computeRingSlots(
  ids: string[],
  isMobile = false
): Map<string, ShowcaseRingSlot> {
  const map = new Map<string, ShowcaseRingSlot>();
  const n = ids.length;
  if (n === 0) return map;

  const radiusBase = ringRadiusBase(n, isMobile);

  ids.forEach((id, index) => {
    const seed = hashId(id);
    // Evenly fill the ring; per-card hash only adds slight organic offset.
    const angle =
      (index / n) * Math.PI * 2 -
      Math.PI / 2 +
      jitter(seed, -0.09, 0.09);
    const radius = radiusBase + jitter(seed + 7, -1.5, 1.5);
    const x = 50 + radius * Math.cos(angle) * 0.96;
    const y = 50 + radius * Math.sin(angle) * 0.98;
    const top = `${y.toFixed(2)}%`;
    const left = `${x.toFixed(2)}%`;
    const edge = angleToEdge(angle);
    const enter = entryWrapPosition(edge, top, left);
    const rotate = jitter(seed + 13, -7, 7);
    const driftPx = jitter(seed + 19, 0, 1) > 0.5 ? "-11px" : "10px";

    map.set(id, {
      top,
      left,
      rotate,
      drift: driftPx,
      delay: `${-(jitter(seed, 0, 6)).toFixed(2)}s`,
      duration: `${(6.4 + jitter(seed + 3, 0, 2.2)).toFixed(2)}s`,
      edge,
      centerDistance: Math.hypot(x - 50, y - 50),
      enterTop: enter.top,
      enterLeft: enter.left,
    });
  });

  return map;
}

export function pickEvictionId(
  visibleIds: string[],
  slots: Map<string, ShowcaseRingSlot>,
  isProtected: (id: string) => boolean
) {
  const candidates = visibleIds.filter((id) => !isProtected(id));
  if (candidates.length === 0) return null;

  return candidates.sort(
    (a, b) =>
      (slots.get(a)?.centerDistance ?? 999) -
      (slots.get(b)?.centerDistance ?? 999)
  )[0];
}
