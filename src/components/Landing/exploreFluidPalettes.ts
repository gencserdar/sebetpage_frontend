/**
 * Explore section palettes — hue-locked per slide.
 * Index 0 = section 1 … 6 = section 7.
 */

import type { FluidPalette, Rgb255 } from "./fluidGradientEngine";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb255, b: Rgb255, t: number): Rgb255 {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function luminance([r, g, b]: Rgb255) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rgbCss(c: Rgb255, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function shiftLuminance(c: Rgb255, delta: number): Rgb255 {
  const f = 1 + delta;
  return [
    Math.max(0, Math.min(255, Math.round(c[0] * f))),
    Math.max(0, Math.min(255, Math.round(c[1] * f))),
    Math.max(0, Math.min(255, Math.round(c[2] * f))),
  ];
}

export function softenRgb(c: Rgb255, strength = 0.22): Rgb255 {
  const scale = 1 - strength * 0.5;
  const g = luminance(c) * 255;
  const mix = strength * 0.28;
  return [
    Math.round(lerp(c[0] * scale, g, mix)),
    Math.round(lerp(c[1] * scale, g, mix)),
    Math.round(lerp(c[2] * scale, g, mix)),
  ];
}

type PaletteCore = Omit<FluidPalette, "blobs">;

function makeBlobs(scroll: Rgb255, base: Rgb255, ambient: Rgb255[], trail: Rgb255[]): Rgb255[] {
  const light = trail[0] ?? scroll;
  const mid = trail[Math.floor(trail.length / 2)] ?? scroll;
  const dark = trail[trail.length - 1] ?? base;
  const ambLo = ambient[ambient.length - 1] ?? base;
  const ambHi = ambient[0] ?? scroll;
  return [
    softenRgb(shiftLuminance(light, 0.12)),
    softenRgb(shiftLuminance(ambHi, 0.08)),
    softenRgb(shiftLuminance(scroll, 0.04)),
    softenRgb(shiftLuminance(mid, -0.06)),
    softenRgb(shiftLuminance(ambLo, -0.1)),
    softenRgb(shiftLuminance(dark, -0.14)),
  ];
}

function withBlobs(p: PaletteCore): FluidPalette {
  return { ...p, blobs: makeBlobs(p.scroll, p.base, p.ambient, p.trail) };
}

/** 1 sarı-hardal · 2 lacivert · 3 mor-pembe · 4 gri · 5 zeytin · 6 mavi · 7 kırmızı-pembe */
const RAW_PALETTES: PaletteCore[] = [
  {
    scroll: [198, 178, 108],
    base: [62, 54, 34],
    ambient: [
      [168, 148, 88],
      [142, 124, 72],
      [185, 162, 98],
      [118, 102, 62],
      [155, 136, 82],
    ],
    trail: [
      [215, 192, 118],
      [128, 112, 68],
      [198, 175, 105],
      [148, 130, 78],
    ],
  },
  {
    scroll: [38, 52, 98],
    base: [16, 24, 48],
    ambient: [
      [48, 68, 118],
      [32, 48, 88],
      [58, 78, 128],
      [26, 38, 72],
      [52, 72, 112],
    ],
    trail: [
      [62, 82, 138],
      [28, 42, 78],
      [54, 74, 122],
      [38, 56, 98],
    ],
  },
  {
    scroll: [148, 88, 158],
    base: [48, 30, 56],
    ambient: [
      [128, 78, 138],
      [108, 62, 118],
      [148, 92, 158],
      [92, 54, 102],
      [138, 84, 148],
    ],
    trail: [
      [168, 102, 178],
      [98, 58, 112],
      [155, 94, 168],
      [118, 70, 128],
    ],
  },
  {
    scroll: [118, 122, 130],
    base: [42, 44, 48],
    ambient: [
      [98, 102, 110],
      [82, 86, 94],
      [112, 116, 124],
      [72, 76, 84],
      [92, 96, 104],
    ],
    trail: [
      [138, 142, 150],
      [78, 82, 90],
      [128, 132, 140],
      [98, 102, 110],
    ],
  },
  {
    scroll: [118, 132, 72],
    base: [44, 52, 30],
    ambient: [
      [98, 112, 62],
      [82, 94, 52],
      [112, 128, 68],
      [68, 78, 42],
      [105, 118, 64],
    ],
    trail: [
      [138, 152, 82],
      [72, 84, 46],
      [125, 138, 72],
      [92, 104, 56],
    ],
  },
  {
    scroll: [92, 152, 198],
    base: [36, 62, 92],
    ambient: [
      [118, 168, 208],
      [88, 138, 182],
      [138, 182, 218],
      [72, 118, 162],
      [128, 172, 208],
    ],
    trail: [
      [158, 198, 228],
      [82, 128, 172],
      [142, 188, 222],
      [102, 148, 192],
    ],
  },
  {
    scroll: [198, 118, 128],
    base: [58, 32, 40],
    ambient: [
      [168, 98, 108],
      [142, 82, 92],
      [185, 108, 118],
      [118, 68, 78],
      [158, 92, 102],
    ],
    trail: [
      [218, 132, 142],
      [128, 74, 84],
      [198, 115, 125],
      [152, 88, 98],
    ],
  },
];

export const EXPLORE_SECTION_PALETTES: FluidPalette[] = RAW_PALETTES.map(withBlobs);

export function lerpPalettes(a: FluidPalette, b: FluidPalette, t: number): FluidPalette {
  const n = Math.max(a.ambient.length, b.ambient.length);
  const bn = Math.max(a.blobs.length, b.blobs.length);
  const ambient: Rgb255[] = [];
  const trail: Rgb255[] = [];
  const blobs: Rgb255[] = [];
  for (let i = 0; i < n; i++) {
    ambient.push(
      lerpRgb(a.ambient[i % a.ambient.length], b.ambient[i % b.ambient.length], t)
    );
    trail.push(
      lerpRgb(a.trail[i % a.trail.length], b.trail[i % b.trail.length], t)
    );
  }
  for (let i = 0; i < bn; i++) {
    blobs.push(
      lerpRgb(a.blobs[i % a.blobs.length], b.blobs[i % b.blobs.length], t)
    );
  }
  return {
    base: lerpRgb(a.base, b.base, t),
    scroll: lerpRgb(a.scroll, b.scroll, t),
    ambient,
    trail,
    blobs,
  };
}

export function resolveFluidPalette(seg: number, slideCount: number): FluidPalette {
  const palettes = EXPLORE_SECTION_PALETTES;
  const i0 = Math.max(0, Math.min(slideCount - 1, Math.floor(seg)));
  const i1 = Math.min(slideCount - 1, palettes.length - 1, i0 + 1);
  const frac = seg - i0;
  const p0 = palettes[Math.min(i0, palettes.length - 1)];
  const p1 = palettes[Math.min(i1, palettes.length - 1)];
  return i0 === i1 || frac <= 0 ? p0 : lerpPalettes(p0, p1, frac);
}

/**
 * Local tone under (nx, ny) — mirrors Patreon-style CSS layers in buildFluidBaseGradient.
 */
function layerOpacity(
  nx: number,
  ny: number,
  cx: number,
  cy: number,
  ew: number,
  eh: number
): number {
  const dx = (nx - cx) / (ew * 0.5);
  const dy = (ny - cy) / (eh * 0.5);
  const d2 = dx * dx + dy * dy;
  if (d2 >= 1) return 0;
  return (1 - Math.sqrt(d2)) ** 1.35;
}

export function sampleLocalVisual(p: FluidPalette, nx: number, ny: number): Rgb255 {
  const light = p.trail[0] ?? shiftLuminance(p.scroll, 0.16);
  const dark = p.base;
  const mid =
    p.ambient[Math.floor(p.ambient.length / 2)] ??
    p.trail[Math.floor(p.trail.length / 2)] ??
    p.scroll;
  const accent = p.blobs[1] ?? p.trail[p.trail.length - 1] ?? mid;

  let c: Rgb255 = [...p.scroll];

  const washes: [Rgb255, number, number, number, number, number][] = [
    [light, 0.66, 0.24, 1.22, 0.94, 0.3],
    [dark, 0.33, -0.2, 0.41, 1.13, 0.72],
    [mid, -0.56, 2.24, 1.88, 1.88, 0.68],
    [accent, 1.07, 0.39, 0.61, 0.52, 0.48],
    [accent, 1.08, 0.82, 0.42, 0.28, 0.42],
  ];

  for (const [col, cx, cy, ew, eh, peak] of washes) {
    const op = layerOpacity(nx, ny, cx, cy, ew, eh) * peak;
    if (op > 0.002) c = lerpRgb(c, col, Math.min(0.96, op));
  }

  const lin = Math.max(0, Math.min(1, (nx * 0.5 + ny * 0.92 - 0.38) / 0.72));
  c = lerpRgb(c, light, lin * 0.52);

  return c;
}

/**
 * Deposit tone from local visual — darker on light bg, lighter on dark bg.
 */
export function pickPaintPigment(
  _palette: FluidPalette,
  background: Rgb255,
  _paint: Rgb255 | null,
  _paintAlpha: number,
  _nx: number,
  _ny: number,
  _trailSorted?: {
    lightest: Rgb255;
    darkest: Rgb255;
    mid: Rgb255;
  } | null
): Rgb255 {
  const lum = luminance(background);
  const shift = lum > 0.52 ? -0.1 : lum < 0.48 ? 0.1 : (0.5 - lum) * 0.24;
  return softenRgb(shiftLuminance(background, shift), 0.04);
}

/** Patreon-style layered wash — positions fixed, hues from section palette. */
export function buildFluidBaseGradient(p: FluidPalette): string {
  const light = p.trail[0] ?? shiftLuminance(p.scroll, 0.16);
  const dark = p.base;
  const mid =
    p.ambient[Math.floor(p.ambient.length / 2)] ??
    p.trail[Math.floor(p.trail.length / 2)] ??
    p.scroll;
  const accent = p.blobs[1] ?? p.trail[p.trail.length - 1] ?? mid;

  return [
    `radial-gradient(122% 94% at 66% 24%, ${rgbCss(light, 0.3)} -10%, ${rgbCss(light, 0.1)} 40%, ${rgbCss(light, 0)} 60%)`,
    `radial-gradient(41% 113% at 33% -20%, ${rgbCss(dark, 0.8)} 0%, ${rgbCss(dark, 0)} 80%)`,
    `radial-gradient(188% 188% at -56% 224%, ${rgbCss(mid, 1)} 0%, ${rgbCss(mid, 1)} 70%, ${rgbCss(mid, 0)} 95%)`,
    `linear-gradient(215deg, ${rgbCss(light, 0)} 0%, ${rgbCss(light, 0)} 70%, ${rgbCss(light, 0.6)} 110%)`,
    `radial-gradient(61% 52% at 107% 39%, ${rgbCss(accent, 1)} 0%, ${rgbCss(accent, 0)} 100%)`,
    `radial-gradient(42% 28% at 108% 82%, ${rgbCss(accent, 1)} 0%, ${rgbCss(accent, 0)} 90%)`,
  ].join(",");
}

export function paletteToCssBase(p: FluidPalette) {
  return `rgb(${p.scroll[0]},${p.scroll[1]},${p.scroll[2]})`;
}
