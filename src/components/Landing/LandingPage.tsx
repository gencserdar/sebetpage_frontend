import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  HERO_DIR_LOCK_PX,
  HERO_SWIPE_THRESHOLD,
  collectRippleSeeds,
  createHeroEngine,
  hitTestTriangle,
  loadHeroImage,
  markHeroStroke,
  markHeroTile,
  paintHero,
  requestHeroPaint,
  resetHeroFlips,
  resizeHeroEngine,
  startHeroRipple,
  wrapNext,
  wrapPrev,
  type HeroEngine,
} from "./hero/triangleHeroEngine";
import ExploreFluidGradient, {
  type LavaPaletteState,
  type LavaPointerState,
} from "./explore/fluidGradient/ExploreFluidGradient";
import ExploreDiscoverStage from "./explore/discover/ExploreDiscoverStage";
import ExploreShareStage from "./explore/share/ExploreShareStage";
import ExplorePlansStage from "./explore/plans/ExplorePlansStage";
import ExploreTalkStage from "./explore/talk/ExploreTalkStage";
import ExploreSpaceStage from "./explore/space/ExploreSpaceStage";
import ExplorePrivacyStage from "./explore/privacy/ExplorePrivacyStage";
import { radialExitOffset } from "./explore/discover/exploreShowcaseRing";
import type { FluidPalette } from "./explore/exploreFluidPalettes";
import {
  EXPLORE_SECTION_PALETTES,
  lerpPalettes,
  paletteToCssBase,
} from "./explore/exploreFluidPalettes";

type TitleFrom = "left" | "right" | "top" | "bottom";
type TitleAlign = "left" | "center" | "right";
type TitleBlock = "top" | "center" | "bottom" | "between";

interface TitleLine {
  text: string;
  from: TitleFrom;
  align: TitleAlign;
  /** When set, skips automatic contrast sampling for this line. */
  color?: string;
}

interface HeroSlide {
  src: string;
  hue: number;
  title: string;
  subtitle: string;
  block: TitleBlock;
  lines: TitleLine[];
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=85`;

// Ordered as a narrative: discover people → plan → share → talk → personalize →
// stay private → everything together (closing summary).
const heroSlides: HeroSlide[] = [
  {
    src: img("1529156069898-49953e39b3ac"),
    hue: 250,
    title: "Find your people.",
    subtitle:
      "Build your circle around shared interests. Discover public communities for hobbies, local meetups, creative projects, and everyday conversations—or create your own when nothing quite fits. Search open spaces on the right, explore what each group is about, and step into a room that makes you feel warm.",
    block: "center",
    lines: [
      { text: "Find your", from: "left", align: "left", color: "#FFDB58" },
      { text: "people.", from: "right", align: "left", color: "#ffffff" },
    ],
  },
  {
    src: img("1492684223066-81342ee5ff30"),
    hue: 330,
    title: "Share Your moment.",
    subtitle:
      "Drop a photo from the street you are on, a clip from last night, or a quiet note about something small that mattered. Let your people know what you are up to!",
    block: "between",
    lines: [
      { text: "Share", from: "bottom", align: "center", color : "#697CF5" },
      { text: "your moment.", from: "top", align: "center" },
    ],
  },
  {
    src: img("1516450360452-9312f5e86fc7"),
    hue: 200,
    title: "Make plans happen.",
    subtitle:
      "Turn a casual idea into something real. Set the time, pick a spot, and invite the people. Keep everyone on the same page with updates, and store photos on your event page so your memories will never fade away.",
    block: "top",
    lines: [
      { text: "Make plans", from: "top", align: "left", color: "#BD69F5" },
      { text: "happen.", from: "bottom", align: "right", color: "#ffffff" },
    ],
  },
  {
    src: img("1542751371-adc38448a05e"),
    hue: 280,
    title: "Talk like you're there.",
    subtitle:
      "In communities uthorized members can create voice rooms where people drop in and hang out—game nights, study sessions, or just background chatter. When it's only your crew, start a call with your friend group and keep it between you. Same room energy, with or without the crowd.",
    block: "bottom",
    lines: [
      { text: "Talk like", from: "right", align: "right", color: "#899499" },
      { text: "you're there.", from: "right", align: "right" },
    ],
  },
  {
    src: img("1558618666-fcd25c85cd64"),
    hue: 150,
    title: "Your Space. Your Rules.",
    subtitle:
      "Your profile has a canvas — a little grid you arrange with bio blocks, links, quotes, and whatever else feels like you. We care about creativity here, so we try not to box you into a template. Move things around, leave blank space, make it loud or quiet. This corner is yours to shape.",
    block: "between",
    lines: [
      { text: "Your Space.", from: "left", align: "left", color: "#C1E34F" },
      { text: "Your Rules.", from: "right", align: "right" },
    ],
  },
  {
    src: img("1563986768609-322da13575f3"),
    hue: 215,
    title: "Privacy on your terms.",
    subtitle:
      "Communities can stay private when you want them to—hidden from search and open only to people you invite. Groups inside a community can be kept from other members who do not need to see them. Add an optional password before anyone enters a community or group. And when you need a break or want to leave for good, freeze your account or delete it whenever you are ready.",
    block: "between",
    lines: [
      { text: "Privacy", from: "left", align: "left", color: "#4F8FE3" },
      { text: "on your terms.", from: "right", align: "right", color: "#ffffff" },
    ],
  },
  {
    src: img("1522202176988-66273c2fd55f"),
    hue: 235,
    title: "Everything your circle needs.",
    subtitle:
      "Communities, chats, events, media sharing, and customization—all in one platform.",
    block: "center",
    lines: [
      { text: "Everything", from: "left", align: "center", color: "rgb(186, 96, 108)" },
      { text: "your circle needs.", from: "right", align: "center" },
    ],
  },
];

const exploreSectionCssColors = EXPLORE_SECTION_PALETTES.map(paletteToCssBase);

const count = heroSlides.length;

type TitleTone = "light" | "dark";

interface LineStyle {
  tone: TitleTone;
  color: string;
}

const PATCH_W = 48;
const PATCH_H = 28;
const tonePatchCanvas = document.createElement("canvas");
tonePatchCanvas.width = PATCH_W;
tonePatchCanvas.height = PATCH_H;
const tonePatchCtx = tonePatchCanvas.getContext("2d", {
  willReadFrequently: true,
});

interface RegionInfo {
  avgR: number;
  avgG: number;
  avgB: number;
  p10Lum: number;
  dark: { r: number; g: number; b: number };
}

interface SampleBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FALLBACK_DARK = { r: 36, g: 30, b: 48 };
const FALLBACK_REGION: RegionInfo = {
  avgR: 18,
  avgG: 18,
  avgB: 22,
  p10Lum: 18,
  dark: FALLBACK_DARK,
};

// Reads the image patch sitting directly behind one title line's real box and
// returns its average colour plus the dominant dark tone in that exact area.
function analyzeBox(
  img: HTMLImageElement,
  vw: number,
  vh: number,
  box: SampleBox
): RegionInfo {
  if (!tonePatchCtx || !img.naturalWidth || !img.naturalHeight) {
    return FALLBACK_REGION;
  }

  const scale = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const ox = (vw - dw) / 2;
  const oy = (vh - dh) / 2;

  // Read a touch beyond the glyphs so thin strokes still rest on their real bg.
  const padX = Math.max(8, box.w * 0.05);
  const padY = Math.max(6, box.h * 0.16);
  let rx = box.x - padX;
  let ry = box.y - padY;
  let rw = box.w + padX * 2;
  let rh = box.h + padY * 2;
  rx = Math.max(0, Math.min(rx, vw - 1));
  ry = Math.max(0, Math.min(ry, vh - 1));
  rw = Math.max(1, Math.min(rw, vw - rx));
  rh = Math.max(1, Math.min(rh, vh - ry));

  const ix = (rx - ox) / scale;
  const iy = (ry - oy) / scale;
  const iw = rw / scale;
  const ih = rh / scale;

  try {
    tonePatchCtx.clearRect(0, 0, PATCH_W, PATCH_H);
    tonePatchCtx.drawImage(img, ix, iy, iw, ih, 0, 0, PATCH_W, PATCH_H);
    const data = tonePatchCtx.getImageData(0, 0, PATCH_W, PATCH_H).data;

    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    const lums: number[] = [];
    const buckets = new Map<
      string,
      { count: number; r: number; g: number; b: number }
    >();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sr += r;
      sg += g;
      sb += b;
      n += 1;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lums.push(lum);
      if (lum > 150) continue;

      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;
      const key = `${qr}|${qg}|${qb}`;
      const prev = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, {
        count: prev.count + 1,
        r: prev.r + r,
        g: prev.g + g,
        b: prev.b + b,
      });
    }

    let best = { count: 0, r: 0, g: 0, b: 0 };
    buckets.forEach((bucket) => {
      if (bucket.count > best.count) best = bucket;
    });

    const dark =
      best.count > 0
        ? {
            r: Math.round(best.r / best.count),
            g: Math.round(best.g / best.count),
            b: Math.round(best.b / best.count),
          }
        : FALLBACK_DARK;

    lums.sort((a, b) => a - b);
    const p10Lum = lums.length > 0 ? lums[Math.floor(lums.length * 0.1)] : 0;

    return n > 0
      ? { avgR: sr / n, avgG: sg / n, avgB: sb / n, p10Lum, dark }
      : { ...FALLBACK_REGION, dark };
  } catch {
    return FALLBACK_REGION;
  }
}

// --- colour helpers ---------------------------------------------------------
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// WCAG relative luminance (0..1) — used only to keep the dark tone deep enough.
function lin(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function wcagLum(r: number, g: number, b: number) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// A deep but still-colourful version of the dominant tone — "dark purple", not
// flat black — kept dark enough to read on light/mid backgrounds.
function toReadableDark(c: { r: number; g: number; b: number }) {
  const { h, s } = rgbToHsl(c.r, c.g, c.b);
  const sat = Math.min(1, Math.max(0.5, s));
  let { r, g, b } = hslToRgb(h, sat, 0.16);
  let guard = 0;
  while (wcagLum(r, g, b) > 0.075 && guard < 6) {
    r = Math.round(r * 0.86);
    g = Math.round(g * 0.86);
    b = Math.round(b * 0.86);
    guard += 1;
  }
  return { r, g, b };
}

// Darkest pixels in the patch decide "near black"; average lightness picks the
// coloured tone for everything else.
const NEAR_BLACK_P10 = 52;

function pickLineStyle(region: RegionInfo, scrim: number): LineStyle {
  const k = 1 - scrim;
  const p10 = region.p10Lum * k;
  if (p10 < NEAR_BLACK_P10) {
    return { tone: "light", color: "#ffffff" };
  }
  const { l, h, s } = rgbToHsl(
    region.avgR * k,
    region.avgG * k,
    region.avgB * k
  );
  // Warm mid backgrounds → light burgundy (not flat white, not deep black).
  if (l > 0.34 && l < 0.58 && (h < 50 || h > 310) && s > 0.08) {
    const tinted = hslToRgb(h, Math.min(0.62, Math.max(0.38, s)), 0.44);
    return {
      tone: "dark",
      color: `rgb(${tinted.r}, ${tinted.g}, ${tinted.b})`,
    };
  }
  const dark = toReadableDark(region.dark);
  return { tone: "dark", color: `rgb(${dark.r}, ${dark.g}, ${dark.b})` };
}

function manualLineStyle(color: string): LineStyle {
  const c = color.trim().toLowerCase();
  const light =
    c === "#fff" ||
    c === "#ffffff" ||
    c === "white" ||
    c.startsWith("rgb(255");
  return { tone: light ? "light" : "dark", color };
}

function lineAnchor(
  slide: HeroSlide,
  lineIndex: number,
  line: TitleLine
): { nx: number; ny: number } {
  const n = slide.lines.length;
  let ny: number;

  if (slide.block === "top") ny = 0.2 + lineIndex * 0.09;
  else if (slide.block === "bottom") ny = 0.8 - (n - 1 - lineIndex) * 0.09;
  else if (slide.block === "between") ny = lineIndex === 0 ? 0.2 : 0.78;
  else ny = n === 1 ? 0.5 : 0.4 + lineIndex * 0.14;

  let nx: number;
  if (line.align === "left") nx = 0.14;
  else if (line.align === "right") nx = 0.86;
  else nx = 0.5;

  return { nx, ny };
}

// Fallback box (used until the real line elements have been measured).
function anchorBox(
  slide: HeroSlide,
  lineIndex: number,
  line: TitleLine,
  vw: number,
  vh: number
): SampleBox {
  const { nx, ny } = lineAnchor(slide, lineIndex, line);
  const w = vw * 0.32;
  const h = vh * 0.1;
  return { x: nx * vw - w / 2, y: ny * vh - h / 2, w, h };
}

// Box of `el` relative to `ancestor`, derived from offsetLeft/Top so it is
// unaffected by the lines' slide-in transform animations.
function offsetRect(el: HTMLElement, ancestor: HTMLElement): SampleBox {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  let ax = 0;
  let ay = 0;
  let anc: HTMLElement | null = ancestor;
  while (anc) {
    ax += anc.offsetLeft;
    ay += anc.offsetTop;
    anc = anc.offsetParent as HTMLElement | null;
  }
  return { x: x - ax, y: y - ay, w: el.offsetWidth, h: el.offsetHeight };
}

function scrimDarkenAt(ny: number) {
  const top = Math.max(0, 1 - ny / 0.12) * 0.35;
  const bottom = Math.max(0, 1 - (1 - ny) / 0.55) * 0.45;
  const radial =
    ny < 0.65 ? Math.max(0, (ny - 0.08) / 0.57) * 0.35 : 0.22;
  return Math.min(0.8, top + bottom + radial);
}

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Slower vertical glide for the globe (vs section text). */
function globeGlide(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (6 * x - 15) + 10);
}

const SHARE_GLOBE_TRAVEL = 14;

function shouldAllowNestedWheelScroll(
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
  deltaX = 0
): boolean {
  if (!(target instanceof HTMLElement)) return false;

  let node: HTMLElement | null = target;
  while (node && node !== boundary) {
    const { overflowX, overflowY } = window.getComputedStyle(node);
    const canScrollY =
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 1;
    const canScrollX =
      (overflowX === "auto" || overflowX === "scroll") &&
      node.scrollWidth > node.clientWidth + 1;

    if (canScrollY) {
      const atTop = node.scrollTop <= 0;
      const atBottom =
        node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
      if ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop)) {
        return true;
      }
    }

    if (canScrollX) {
      const atLeft = node.scrollLeft <= 0;
      const atRight =
        node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
      if ((deltaX > 0 && !atRight) || (deltaX < 0 && !atLeft)) {
        return true;
      }
    }

    node = node.parentElement;
  }

  return false;
}

const EXPLORE_TOUCH_SWIPE_THRESHOLD = 52;

function isExploreScrollSurfaceTarget(
  target: EventTarget | null,
  scroll: HTMLElement
) {
  if (!(target instanceof Node)) return false;
  return target === scroll || scroll.contains(target);
}

function shouldBlockExploreSectionGesture(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(".landing-share__globe-stage"));
}

function shareGlobeY(t: number, scrollDir: number) {
  if (t <= -1 || t >= 1) return 0;
  if (t <= 0) {
    const p = globeGlide(t + 1);
    return scrollDir >= 0 ? SHARE_GLOBE_TRAVEL * (1 - p) : -SHARE_GLOBE_TRAVEL * (1 - p);
  }
  const p = 1 - globeGlide(t);
  return scrollDir >= 0 ? -SHARE_GLOBE_TRAVEL * (1 - p) : SHARE_GLOBE_TRAVEL * (1 - p);
}

type SectionMotionState = {
  opacity: number;
  x: number;
  y: number;
  visible: boolean;
};

function sectionMotion(seg: number, i: number, scrollDir: number): SectionMotionState {
  const t = seg - i;

  if (t <= -1 || t >= 1) {
    return { opacity: 0, x: -9, y: 0, visible: false };
  }

  if (t <= 0) {
    const p = smoothstep(t + 1);
    return {
      opacity: p,
      x: -9 * (1 - p),
      y: shareGlobeY(t, scrollDir),
      visible: p > 0.02,
    };
  }

  const p = 1 - smoothstep(t);
  return {
    opacity: p,
    x: -9 * (1 - p),
    y: shareGlobeY(t, scrollDir),
    visible: p > 0.02,
  };
}

function sectionMotionJump(
  from: number,
  to: number,
  progress: number,
  i: number
): SectionMotionState {
  const scrollDir = to > from ? 1 : -1;

  if (from === to) {
    return i === from
      ? { opacity: 1, x: 0, y: 0, visible: true }
      : { opacity: 0, x: -9, y: 0, visible: false };
  }

  if (i !== from && i !== to) {
    return { opacity: 0, x: -9, y: 0, visible: false };
  }

  if (i === from) {
    const p = 1 - smoothstep(progress);
    const glide = 1 - globeGlide(progress);
    return {
      opacity: p,
      x: -9 * (1 - p),
      y:
        scrollDir >= 0
          ? -SHARE_GLOBE_TRAVEL * glide
          : SHARE_GLOBE_TRAVEL * glide,
      visible: p > 0.02,
    };
  }

  const p = smoothstep(progress);
  const glide = 1 - globeGlide(progress);
  return {
    opacity: p,
    x: -9 * (1 - p),
    y:
      scrollDir >= 0
        ? SHARE_GLOBE_TRAVEL * glide
        : -SHARE_GLOBE_TRAVEL * glide,
    visible: p > 0.02,
  };
}

const EXPLORE_SECTION_JUMP_MS = 640;

function computeLineStyles(
  img: HTMLImageElement,
  vw: number,
  vh: number,
  slide: HeroSlide,
  boxes: (SampleBox | null)[]
): LineStyle[] {
  return slide.lines.map((line, i) => {
    if (line.color) return manualLineStyle(line.color);
    const box = boxes[i] ?? anchorBox(slide, i, line, vw, vh);
    const region = analyzeBox(img, vw, vh, box);
    const ny = (box.y + box.h / 2) / vh;
    return pickLineStyle(region, scrimDarkenAt(ny));
  });
}

function HeroTitles({
  slide,
  index,
  lineStyles,
  registerLine,
}: {
  slide: HeroSlide;
  index: number;
  lineStyles: LineStyle[];
  registerLine: (i: number, el: HTMLSpanElement | null) => void;
}) {
  return (
    <div
      key={index}
      className={`landing-titles landing-titles--${slide.block}`}
      aria-hidden
    >
      {slide.lines.map((line, i) => (
        <span
          key={i}
          ref={(el) => registerLine(i, el)}
          className={`landing-titleline landing-titleline--${line.align} landing-titleline--from-${line.from}`}
          style={{
            animationDelay: `${i * 110}ms`,
            color: lineStyles[i]?.color ?? "#ffffff",
          }}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}

function TriangleHero({
  active,
  restoreIndex,
  onRestoreApplied,
  onIndexChange,
  onOpenDetails,
}: {
  active: boolean;
  restoreIndex?: number | null;
  onRestoreApplied?: () => void;
  onIndexChange: (i: number) => void;
  onOpenDetails: (fromIndex: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(() =>
    heroSlides[0].lines.map(() => ({ tone: "light" as TitleTone, color: "#ffffff" }))
  );
  const [stylesReady, setStylesReady] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const draggingRef = useRef(false);
  const ripplingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);
  const lockedPeekRef = useRef<number | null>(null);
  const maxDragRef = useRef(0);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const indexRef = useRef(0);
  const activeRef = useRef(active);

  indexRef.current = index;
  activeRef.current = active;

  useEffect(() => {
    onIndexChange(index);
  }, [index, onIndexChange]);

  const registerLine = useCallback(
    (i: number, el: HTMLSpanElement | null) => {
      lineRefs.current[i] = el;
    },
    []
  );

  const applyLineStyles = useCallback((slideIdx: number) => {
    const img = imagesRef.current[slideIdx];
    const viewport = viewportRef.current;
    if (!img?.complete || !viewport || viewport.clientWidth <= 0) {
      setStylesReady(false);
      return;
    }

    const slide = heroSlides[slideIdx];
    if (!slide) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    // Measure each line's real resting box so every line samples exactly the
    // pixels behind it (no overlap between lines, no whole-block averaging).
    const boxes = slide.lines.map((_, i) => {
      const el = lineRefs.current[i];
      if (!el || el.offsetWidth <= 0) return null;
      return offsetRect(el, viewport);
    });

    setLineStyles(computeLineStyles(img, vw, vh, slide, boxes));
    setStylesReady(true);
  }, []);

  useLayoutEffect(() => {
    applyLineStyles(index);
  }, [index, applyLineStyles]);

  const setEngineImages = useCallback((frontIdx: number, backIdx: number) => {
    const engine = engineRef.current;
    const imgs = imagesRef.current;
    if (!engine || !imgs[frontIdx] || !imgs[backIdx]) return;
    engine.frontImg = imgs[frontIdx];
    engine.backImg = imgs[backIdx];
    requestHeroPaint(engine);
  }, []);

  const jumpToIndex = useCallback(
    (target: number) => {
      const engine = engineRef.current;
      const imgs = imagesRef.current;
      if (!imgs[target]) return;

      if (engine) {
        resetHeroFlips(engine);
        engine.frontImg = imgs[target];
        engine.backImg = imgs[wrapNext(target, count)] ?? imgs[target];
        paintHero(engine);
      }

      setIndex(target);
      indexRef.current = target;
      lockedPeekRef.current = null;
      applyLineStyles(target);
    },
    [applyLineStyles]
  );

  useLayoutEffect(() => {
    if (restoreIndex == null || restoreIndex < 0 || restoreIndex >= count) return;
    if (restoreIndex === indexRef.current) {
      onRestoreApplied?.();
      return;
    }
    jumpToIndex(restoreIndex);
    onRestoreApplied?.();
  }, [restoreIndex, jumpToIndex, onRestoreApplied]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHeroEngine(canvas);
    engineRef.current = engine;

    const onResize = () => {
      resizeHeroEngine(engine);
      paintHero(engine);
      applyLineStyles(indexRef.current);
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    if (viewportRef.current) ro.observe(viewportRef.current);

    Promise.all(heroSlides.map((s) => loadHeroImage(s.src, s.hue)))
      .then((imgs) => {
        imagesRef.current = imgs;
        engine.frontImg = imgs[0];
        engine.backImg = imgs[wrapNext(0, count)];
        paintHero(engine);
        applyLineStyles(0);
      })
      .catch(() => undefined);

    return () => {
      ro.disconnect();
      if (engine.raf) cancelAnimationFrame(engine.raf);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockPeekDirection = useCallback(
    (dx: number, dy: number) => {
      if (lockedPeekRef.current !== null) return;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < HERO_DIR_LOCK_PX && absY < HERO_DIR_LOCK_PX) return;

      const axis: "x" | "y" =
        absX >= HERO_DIR_LOCK_PX && absY >= HERO_DIR_LOCK_PX
          ? absX > absY
            ? "x"
            : "y"
          : absX >= HERO_DIR_LOCK_PX
            ? "x"
            : "y";

      const target =
        axis === "x"
          ? dx > 0
            ? wrapNext(indexRef.current, count)
            : wrapPrev(indexRef.current, count)
          : dy < 0
            ? wrapNext(indexRef.current, count)
            : wrapPrev(indexRef.current, count);

      lockedPeekRef.current = target;
      setEngineImages(indexRef.current, target);
    },
    [setEngineImages]
  );

  const runRipple = useCallback((targetIndex: number) => {
    const engine = engineRef.current;
    if (!engine || ripplingRef.current) return;

    ripplingRef.current = true;
    setTransitioning(true);
    engine.backImg = imagesRef.current[targetIndex] ?? engine.backImg;

    const seeds = collectRippleSeeds(engine);
    startHeroRipple(engine, seeds, () => {
      resetHeroFlips(engine);
      setIndex(targetIndex);
      indexRef.current = targetIndex;
      lockedPeekRef.current = null;
      engine.frontImg = imagesRef.current[targetIndex] ?? engine.frontImg;
      engine.backImg =
        imagesRef.current[wrapNext(targetIndex, count)] ?? engine.backImg;
      paintHero(engine);
      ripplingRef.current = false;
      draggingRef.current = false;
      setDragging(false);
      setTransitioning(false);
      dragXRef.current = 0;
      dragYRef.current = 0;
      lastPtRef.current = null;
    });
  }, []);

  const brushAt = useCallback((clientX: number, clientY: number) => {
    const el = viewportRef.current;
    const engine = engineRef.current;
    if (!el || !engine) return;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (lastPtRef.current) {
      markHeroStroke(engine, lastPtRef.current.x, lastPtRef.current.y, x, y);
    } else {
      const idx = hitTestTriangle(engine, x, y);
      if (idx >= 0) markHeroTile(engine, idx);
    }

    lastPtRef.current = { x, y };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeRef.current || ripplingRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;

    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dragXRef.current = 0;
    dragYRef.current = 0;
    maxDragRef.current = 0;
    lockedPeekRef.current = null;
    lastPtRef.current = null;
    resetHeroFlips(engine);
    engine.backImg =
      imagesRef.current[wrapNext(indexRef.current, count)] ?? engine.backImg;
    paintHero(engine);
    e.currentTarget.setPointerCapture(e.pointerId);
    brushAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || ripplingRef.current) return;

    dragXRef.current = e.clientX - startXRef.current;
    dragYRef.current = e.clientY - startYRef.current;
    maxDragRef.current = Math.max(
      maxDragRef.current,
      Math.hypot(dragXRef.current, dragYRef.current)
    );
    lockPeekDirection(dragXRef.current, dragYRef.current);
    brushAt(e.clientX, e.clientY);
  };

  const onPointerUp = () => {
    if (!draggingRef.current || ripplingRef.current) return;
    draggingRef.current = false;
    lastPtRef.current = null;

    const peek = lockedPeekRef.current;
    const cur = indexRef.current;
    const engine = engineRef.current;
    const maxDrag = maxDragRef.current;
    const seeds = engine ? collectRippleSeeds(engine) : [];
    const shouldCommit =
      peek !== null &&
      (maxDrag >= HERO_SWIPE_THRESHOLD ||
        (maxDrag >= HERO_DIR_LOCK_PX && seeds.length > 0));

    if (shouldCommit) {
      maxDragRef.current = 0;
      runRipple(peek);
      return;
    }

    if (engine) {
      resetHeroFlips(engine);
      setEngineImages(cur, wrapNext(cur, count));
    }
    lockedPeekRef.current = null;
    maxDragRef.current = 0;
    setDragging(false);
    dragXRef.current = 0;
    dragYRef.current = 0;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current || ripplingRef.current) return;
      if (e.key === "ArrowRight") runRipple(wrapNext(indexRef.current, count));
      if (e.key === "ArrowLeft") runRipple(wrapPrev(indexRef.current, count));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runRipple]);

  const slide = heroSlides[index];

  return (
    <div
      ref={viewportRef}
      className={`landing-hero__viewport${dragging ? " landing-hero__viewport--dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas ref={canvasRef} className="landing-tri-canvas" aria-hidden />
      <div className="landing-hero__scrim" />

      <div
        className={`landing-titles-wrap${!stylesReady || dragging || transitioning ? " is-hidden" : ""}`}
      >
        <HeroTitles
          slide={slide}
          index={index}
          lineStyles={lineStyles}
          registerLine={registerLine}
        />
      </div>

      <button
        type="button"
        className={`landing-cta-arrow${!stylesReady || dragging || transitioning ? " is-hidden" : ""}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onOpenDetails(indexRef.current)}
        aria-label="Explore details"
      >
        <span className="landing-cta-arrow__label">Explore</span>
        <ArrowRight size={22} />
      </button>
    </div>
  );
}

export default function LandingPage({
  onLoginClick,
  onDetailsOpenChange,
}: {
  onLoginClick: () => void;
  onDetailsOpenChange?: (open: boolean) => void;
}) {
  const [view, setView] = useState<"hero" | "details">("hero");
  const [switchKey, setSwitchKey] = useState(0);
  const [restoreHeroIndex, setRestoreHeroIndex] = useState<number | null>(null);
  const sectionColors = exploreSectionCssColors;
  const currentIndexRef = useRef(0);
  const detailsSectionRef = useRef(0);
  const openIndexRef = useRef(0);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const detailsPaneRef = useRef<HTMLDivElement | null>(null);
  const lavaPaletteRef = useRef<LavaPaletteState>({
    sectionColors: exploreSectionCssColors,
    seg: 0,
    slideCount: count,
    paletteJump: null,
  });
  const lavaPointerRef = useRef<LavaPointerState>({
    x: 0.5,
    y: 0.5,
    smoothX: 0.5,
    smoothY: 0.5,
    has: false,
  });
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const sectionJumpRef = useRef<{
    from: number;
    to: number;
    paletteFrom: number;
    paletteTo: number;
    fromPaletteSnapshot: FluidPalette | null;
    startedAt: number;
    duration: number;
  } | null>(null);
  const jumpRafRef = useRef(0);
  const lastScrollSegRef = useRef(0);
  const scrollDirRef = useRef(1);

  const applySectionMotion = useCallback(
    (
      inner: HTMLDivElement,
      motion: { opacity: number; x: number; y: number; visible: boolean }
    ) => {
      if (inner.classList.contains("landing-section__inner--share")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const globeY = motion.y.toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";
        const globeScale = (0.92 + opacity * 0.08).toFixed(3);

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-share__story-copy"
        );
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-share__showcase"
        );
        const globeStage = inner.querySelector<HTMLElement>(
          ".landing-share__globe-stage"
        );

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = opacityStr;
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";
        }
        if (globeStage) {
          globeStage.style.opacity = opacityStr;
          globeStage.style.visibility = visibility;
          globeStage.style.transform = `translate3d(0, ${globeY}vh, 0) scale(${globeScale})`;
        }
        return;
      }

      if (inner.classList.contains("landing-section__inner--discover")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const searchLift = ((1 - opacity) * 40).toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-discover__story-copy"
        );
        const search = inner.querySelector<HTMLElement>(
          ".landing-discover__search"
        );
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-discover__showcase"
        );

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (search) {
          search.style.opacity = opacityStr;
          search.style.visibility = visibility;
          search.style.transform = `translate3d(0, ${searchLift}px, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = "1";
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";

          const aura = showcase.querySelector<HTMLElement>(
            ".landing-discover__showcase-aura"
          );
          if (aura) aura.style.opacity = opacityStr;

          const cardWraps = showcase.querySelectorAll<HTMLElement>(
            ".landing-discover-card-wrap"
          );
          cardWraps.forEach((wrap) => {
            const left = Number.parseFloat(wrap.style.left);
            const top = Number.parseFloat(wrap.style.top);
            if (!Number.isFinite(left) || !Number.isFinite(top)) return;

            const radial = radialExitOffset(left, top, opacity);
            wrap.style.opacity = opacityStr;
            wrap.style.visibility = visibility;
            wrap.style.transform = `translate(calc(-50% + ${radial.x.toFixed(2)}%), calc(-50% + ${radial.y.toFixed(2)}%))`;
          });
        }
        return;
      }

      if (inner.classList.contains("landing-section__inner--plans")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-plans__story-copy"
        );
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-plans__showcase"
        );
        const demo = inner.querySelector<HTMLElement>(".landing-plans-demo");

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = opacityStr;
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";
        }
        if (demo) {
          const armed = demo.dataset.stageIntroArmed === "1";
          if (motion.visible && opacity > 0.72) {
            if (!armed) {
              demo.classList.remove("is-stage-intro");
              void demo.offsetWidth;
              demo.classList.add("is-stage-intro");
              demo.dataset.stageIntroArmed = "1";
            }
          } else if (opacity < 0.2) {
            demo.classList.remove("is-stage-intro");
            delete demo.dataset.stageIntroArmed;
          }
        }
        return;
      }

      if (inner.classList.contains("landing-section__inner--talk")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-talk__story-copy"
        );
        const picker = inner.querySelector<HTMLElement>(".landing-talk__picker");
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-talk__showcase"
        );
        const talk = inner.querySelector<HTMLElement>(".landing-talk");

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (picker) {
          picker.style.opacity = opacityStr;
          picker.style.visibility = visibility;
          picker.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = opacityStr;
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";
        }
        if (talk) {
          const armed = talk.dataset.stageIntroArmed === "1";
          if (motion.visible && opacity > 0.55) {
            if (!armed) {
              talk.classList.remove("is-stage-intro");
              void talk.offsetWidth;
              talk.classList.add("is-stage-intro");
              talk.dataset.stageIntroArmed = "1";
            }
          } else if (opacity < 0.15) {
            talk.classList.remove("is-stage-intro");
            delete talk.dataset.stageIntroArmed;
          }
        }
        return;
      }

      if (inner.classList.contains("landing-section__inner--space")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-space__story-copy"
        );
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-space__showcase"
        );

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = opacityStr;
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";
        }
        return;
      }

      if (inner.classList.contains("landing-section__inner--privacy")) {
        inner.style.opacity = "1";
        inner.style.visibility = motion.visible ? "visible" : "hidden";
        inner.style.transform = "none";

        const opacity = motion.opacity;
        const opacityStr = opacity.toFixed(3);
        const textX = motion.x.toFixed(2);
        const visibility = motion.visible ? "visible" : "hidden";

        const storyCopy = inner.querySelector<HTMLElement>(
          ".landing-privacy__story-copy"
        );
        const showcase = inner.querySelector<HTMLElement>(
          ".landing-privacy__showcase"
        );

        if (storyCopy) {
          storyCopy.style.opacity = opacityStr;
          storyCopy.style.visibility = visibility;
          storyCopy.style.transform = `translate3d(${textX}%, 0, 0)`;
        }
        if (showcase) {
          showcase.style.opacity = opacityStr;
          showcase.style.visibility = visibility;
          showcase.style.transform = "none";
        }
        return;
      }

      inner.style.opacity = motion.opacity.toFixed(3);
      inner.style.visibility = motion.visible ? "visible" : "hidden";
      inner.style.transform = `translate3d(${motion.x.toFixed(2)}%, 0, 0)`;
    },
    []
  );

  const updateScrollFx = useCallback(() => {
    const pane = detailsRef.current;
    if (!pane) return;
    const vh = pane.clientHeight;
    if (vh <= 0) return;

    const seg = pane.scrollTop / vh;
    if (seg > lastScrollSegRef.current + 0.001) {
      scrollDirRef.current = 1;
    } else if (seg < lastScrollSegRef.current - 0.001) {
      scrollDirRef.current = -1;
    }
    lastScrollSegRef.current = seg;

    const jump = sectionJumpRef.current;
    const jumpProgress = jump
      ? Math.min(1, (performance.now() - jump.startedAt) / jump.duration)
      : null;
    const idx = jump ? jump.to : Math.round(seg);
    if (!jump) {
      detailsSectionRef.current = Math.max(0, Math.min(count - 1, idx));
    }

    const lava = lavaPaletteRef.current;
    lava.sectionColors = sectionColors;
    lava.slideCount = count;

    if (jump && jumpProgress !== null) {
      lava.seg = jump.paletteTo;
      lava.paletteJump = {
        from: jump.paletteFrom,
        to: jump.paletteTo,
        fromPalette: jump.fromPaletteSnapshot,
        progress: jumpProgress,
      };
    } else {
      lava.seg = seg;
      lava.paletteJump = null;
    }

    for (let i = 0; i < innerRefs.current.length; i++) {
      const inner = innerRefs.current[i];
      if (!inner) continue;
      const motion =
        jump && jumpProgress !== null
          ? sectionMotionJump(jump.from, jump.to, jumpProgress, i)
          : sectionMotion(seg, i, scrollDirRef.current);
      applySectionMotion(inner, motion);
    }

    const indicator = indicatorRef.current;
    if (indicator) {
      const indicatorSeg = jump ? jump.to : seg;
      const ticks = indicator.querySelectorAll<HTMLButtonElement>(
        ".landing-details__tick"
      );
      ticks.forEach((tick, i) => {
        const dist = Math.abs(indicatorSeg - i);
        const isActive = dist < 0.42;
        tick.classList.toggle("is-active", isActive);
        tick.setAttribute("aria-current", isActive ? "true" : "false");
      });
    }
  }, [sectionColors, applySectionMotion]);

  const navigateToExploreSection = useCallback(
    (index: number) => {
      const scroll = detailsRef.current;
      if (!scroll) return;

      const vh = scroll.clientHeight;
      if (vh <= 0) return;

      const clamped = Math.max(0, Math.min(count - 1, index));
      const active = sectionJumpRef.current;
      const contentFrom = active?.to ?? detailsSectionRef.current;

      if (!active && contentFrom === clamped) return;

      let paletteFrom = detailsSectionRef.current;
      let paletteTo = clamped;
      let fromPaletteSnapshot: FluidPalette | null = null;

      if (active) {
        const progress = Math.min(
          1,
          (performance.now() - active.startedAt) / active.duration
        );
        const palettes = EXPLORE_SECTION_PALETTES;
        const fromPalette =
          palettes[Math.min(active.paletteFrom, palettes.length - 1)];
        const toPalette =
          palettes[Math.min(active.paletteTo, palettes.length - 1)];
        fromPaletteSnapshot = lerpPalettes(
          fromPalette,
          toPalette,
          smoothstep(progress)
        );
        paletteFrom = active.paletteFrom;
      }

      if (jumpRafRef.current) {
        cancelAnimationFrame(jumpRafRef.current);
        jumpRafRef.current = 0;
      }

      scroll.classList.add("is-instant");
      scroll.scrollTop = clamped * vh;
      requestAnimationFrame(() => {
        scroll.classList.remove("is-instant");
      });

      lavaPaletteRef.current.slideCount = count;

      sectionJumpRef.current = {
        from: contentFrom,
        to: clamped,
        paletteFrom,
        paletteTo,
        fromPaletteSnapshot,
        startedAt: performance.now(),
        duration: EXPLORE_SECTION_JUMP_MS,
      };
      wheelLockRef.current = true;

      const tick = (now: number) => {
        const jump = sectionJumpRef.current;
        if (!jump) return;

        updateScrollFx();

        const progress = Math.min(1, (now - jump.startedAt) / jump.duration);
        if (progress < 1) {
          jumpRafRef.current = requestAnimationFrame(tick);
          return;
        }

        detailsSectionRef.current = jump.to;
        sectionJumpRef.current = null;
        jumpRafRef.current = 0;
        wheelLockRef.current = false;

        const lava = lavaPaletteRef.current;
        lava.seg = jump.paletteTo;
        lava.paletteJump = null;

        updateScrollFx();
      };

      jumpRafRef.current = requestAnimationFrame(tick);
      updateScrollFx();
    },
    [updateScrollFx]
  );

  const jumpToExploreSection = useCallback(
    (index: number) => {
      const scroll = detailsRef.current;
      if (!scroll) return;

      const clamped = Math.max(0, Math.min(count - 1, index));

      const apply = () => {
        const vh = scroll.clientHeight;
        if (vh <= 0) return false;

        scroll.classList.add("is-instant");
        scroll.scrollTop = clamped * vh;
        requestAnimationFrame(() => {
          scroll.classList.remove("is-instant");
        });

        detailsSectionRef.current = clamped;
        const lava = lavaPaletteRef.current;
        lava.seg = clamped;
        lava.slideCount = count;
        lava.paletteJump = null;
        sectionJumpRef.current = null;
        updateScrollFx();
        return true;
      };

      if (!apply()) {
        requestAnimationFrame(() => {
          if (!apply()) requestAnimationFrame(apply);
        });
      }
    },
    [updateScrollFx]
  );

  const openDetails = useCallback(
    (fromIndex?: number) => {
      const idx = Math.max(
        0,
        Math.min(count - 1, fromIndex ?? currentIndexRef.current)
      );
      currentIndexRef.current = idx;
      openIndexRef.current = idx;
      detailsSectionRef.current = idx;
      lavaPaletteRef.current.seg = idx;
      lavaPaletteRef.current.slideCount = count;
      setView("details");
      setSwitchKey((k) => k + 1);
      onDetailsOpenChange?.(true);
    },
    [onDetailsOpenChange]
  );

  const closeDetails = useCallback(() => {
    setRestoreHeroIndex(detailsSectionRef.current);
    setView("hero");
    setSwitchKey((k) => k + 1);
    onDetailsOpenChange?.(false);
  }, [onDetailsOpenChange]);

  const handleRestoreApplied = useCallback(() => {
    setRestoreHeroIndex(null);
  }, []);

  const handleIndexChange = useCallback((i: number) => {
    currentIndexRef.current = i;
  }, []);

  useLayoutEffect(() => {
    if (view !== "details") return;
    jumpToExploreSection(openIndexRef.current);
  }, [view, jumpToExploreSection]);

  useEffect(() => {
    if (view !== "details") return;
    jumpToExploreSection(openIndexRef.current);
  }, [view, jumpToExploreSection]);

  useEffect(() => {
    if (view !== "details") return;
    updateScrollFx();
  }, [view, sectionColors, updateScrollFx]);

  useEffect(() => {
    if (view !== "details") return;
    const pane = detailsPaneRef.current;
    if (!pane) return;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = pane.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      const pointer = lavaPointerRef.current;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
        pointer.has = false;
        return;
      }
      pointer.x = nx;
      pointer.y = ny;
      pointer.has = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (e.relatedTarget && pane.contains(e.relatedTarget as Node)) return;
      lavaPointerRef.current.has = false;
    };

    pane.addEventListener("pointermove", onPointerMove, {
      capture: true,
      passive: true,
    });
    pane.addEventListener("pointerleave", onPointerLeave);
    pane.addEventListener("mousemove", onMouseMove, {
      capture: true,
      passive: true,
    });

    return () => {
      pane.removeEventListener("pointermove", onPointerMove, { capture: true });
      pane.removeEventListener("pointerleave", onPointerLeave);
      pane.removeEventListener("mousemove", onMouseMove, { capture: true });
      lavaPointerRef.current.has = false;
    };
  }, [view]);

  useEffect(() => {
    if (view !== "details") return;
    const scroll = detailsRef.current;
    const pane = detailsPaneRef.current;
    if (!scroll || !pane) return;

    let raf = 0;
    const onScroll = () => {
      if (sectionJumpRef.current) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateScrollFx();
      });
    };

    const snapTo = (target: number) => {
      const vh = scroll.clientHeight;
      wheelLockRef.current = true;
      scroll.scrollTo({ top: target * vh, behavior: "smooth" });
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 560);
    };

    const onWheel = (e: WheelEvent) => {
      if (shouldAllowNestedWheelScroll(e.target, pane, e.deltaY)) {
        return;
      }

      if (shouldBlockExploreSectionGesture(e.target)) {
        return;
      }

      e.preventDefault();
      if (wheelLockRef.current) return;
      const vh = scroll.clientHeight;
      if (vh <= 0) return;
      const current = Math.round(scroll.scrollTop / vh);
      if (e.deltaY > 8 && current < count - 1) snapTo(current + 1);
      else if (e.deltaY < -8 && current > 0) snapTo(current - 1);
    };

    const onScrollEnd = () => {
      if (sectionJumpRef.current) return;
      wheelLockRef.current = false;
      updateScrollFx();
    };

    let touchStart: { x: number; y: number } | null = null;
    let touchAxis: "x" | "y" | null = null;
    let touchClaimed = false;
    let touchOnScrollSurface = false;

    const resetTouch = () => {
      touchStart = null;
      touchAxis = null;
      touchClaimed = false;
      touchOnScrollSurface = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        resetTouch();
        return;
      }

      touchStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchAxis = null;
      touchClaimed = shouldBlockExploreSectionGesture(e.target);
      touchOnScrollSurface = isExploreScrollSurfaceTarget(e.target, scroll);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart || touchOnScrollSurface || e.touches.length !== 1) return;

      const dy = e.touches[0].clientY - touchStart.y;
      const dx = e.touches[0].clientX - touchStart.x;

      if (!touchAxis) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        touchAxis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      }

      if (touchClaimed) return;

      if (touchAxis === "x") {
        if (shouldAllowNestedWheelScroll(e.target, pane, 0, -dx)) {
          touchClaimed = true;
        }
        return;
      }

      if (shouldAllowNestedWheelScroll(e.target, pane, -dy)) {
        touchClaimed = true;
        return;
      }

      if (shouldBlockExploreSectionGesture(e.target)) {
        touchClaimed = true;
        return;
      }

      if (Math.abs(dy) > 12) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart || touchOnScrollSurface || touchClaimed || touchAxis !== "y") {
        resetTouch();
        return;
      }

      const touch = e.changedTouches[0];
      const dy = touch.clientY - touchStart.y;
      resetTouch();

      if (Math.abs(dy) < EXPLORE_TOUCH_SWIPE_THRESHOLD) return;
      if (wheelLockRef.current) return;

      const vh = scroll.clientHeight;
      if (vh <= 0) return;
      const current = Math.round(scroll.scrollTop / vh);
      if (dy < 0 && current < count - 1) snapTo(current + 1);
      else if (dy > 0 && current > 0) snapTo(current - 1);
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    scroll.addEventListener("scrollend", onScrollEnd);
    pane.addEventListener("wheel", onWheel, { passive: false, capture: true });
    pane.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    pane.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    pane.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    pane.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
      capture: true,
    });
    const ro = new ResizeObserver(() => updateScrollFx());
    ro.observe(scroll);
    updateScrollFx();
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      scroll.removeEventListener("scrollend", onScrollEnd);
      pane.removeEventListener("wheel", onWheel, { capture: true });
      pane.removeEventListener("touchstart", onTouchStart, { capture: true });
      pane.removeEventListener("touchmove", onTouchMove, { capture: true });
      pane.removeEventListener("touchend", onTouchEnd, { capture: true });
      pane.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (jumpRafRef.current) cancelAnimationFrame(jumpRafRef.current);
      sectionJumpRef.current = null;
      lavaPaletteRef.current.paletteJump = null;
      wheelLockRef.current = false;
    };
  }, [view, updateScrollFx]);

  useEffect(() => {
    if (view !== "details") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, closeDetails]);

  return (
    <div className="landing-shell">
      <div className={`landing-track${view === "details" ? " is-details" : ""}`}>
        <div className="landing-pane">
          <TriangleHero
            active={view === "hero"}
            restoreIndex={restoreHeroIndex}
            onRestoreApplied={handleRestoreApplied}
            onIndexChange={handleIndexChange}
            onOpenDetails={openDetails}
          />
        </div>

        <div ref={detailsPaneRef} className="landing-pane landing-details">
          <button
            type="button"
            className="landing-back"
            onClick={closeDetails}
            aria-label="Back to start"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <nav
            ref={indicatorRef}
            className="landing-details__indicator"
            aria-label="Explore sections"
          >
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                className="landing-details__tick"
                aria-label={`Section ${i + 1}`}
                aria-current="false"
                onClick={() => navigateToExploreSection(i)}
              />
            ))}
          </nav>

          <div className="landing-details__stage">
            <ExploreFluidGradient
              active={view === "details"}
              containerRef={detailsPaneRef}
              paletteRef={lavaPaletteRef}
              pointerRef={lavaPointerRef}
            />
            {heroSlides.map((s, i) => (
              <div
                key={i}
                className={`landing-section__inner${
                  i === 0
                    ? " landing-section__inner--discover"
                    : i === 1
                      ? " landing-section__inner--share"
                      : i === 2
                        ? " landing-section__inner--plans"
                        : i === 3
                          ? " landing-section__inner--talk"
                          : i === 4
                            ? " landing-section__inner--space"
                            : i === 5
                              ? " landing-section__inner--privacy"
                              : ""
                }`}
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
              >
                {i === 0 ? (
                  <ExploreDiscoverStage subtitle={s.subtitle} />
                ) : i === 1 ? (
                  <ExploreShareStage subtitle={s.subtitle} />
                ) : i === 2 ? (
                  <ExplorePlansStage subtitle={s.subtitle} />
                ) : i === 3 ? (
                  <ExploreTalkStage subtitle={s.subtitle} />
                ) : i === 4 ? (
                  <ExploreSpaceStage subtitle={s.subtitle} />
                ) : i === 5 ? (
                  <ExplorePrivacyStage subtitle={s.subtitle} />
                ) : (
                  <>
                    <h2 className="landing-section__title">{s.title}</h2>
                    <p className="landing-section__text">{s.subtitle}</p>
                  </>
                )}

                {i === count - 1 && (
                  <div className="landing-section__actions">
                    <Link to="/register" className="landing-btn landing-btn--primary">
                      Create your account
                      <ArrowRight size={18} className="ml-2" />
                    </Link>
                    <button
                      type="button"
                      onClick={onLoginClick}
                      className="landing-btn landing-btn--ghost"
                    >
                      Log in
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="landing-details__scroll" ref={detailsRef}>
            {heroSlides.map((_, i) => (
              <div key={i} className="landing-details__sentinel" aria-hidden />
            ))}
          </div>
        </div>
      </div>

      {switchKey > 0 && (
        <div key={switchKey} className="landing-switch-veil" aria-hidden />
      )}
    </div>
  );
}
