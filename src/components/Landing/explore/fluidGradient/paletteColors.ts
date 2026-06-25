import type { FluidPalette } from "../exploreFluidPalettes";
import { hexColorDistance, lerpHex, rgbToHex } from "./hexToRgb";
import type { FluidGradientConfig } from "./types";

export function paletteToFluidColors(p: FluidPalette): [string, string, string, string] {
  const light = p.trail[0] ?? p.scroll;
  const dark = p.base;
  const mid =
    p.ambient[Math.floor(p.ambient.length / 2)] ?? p.trail[1] ?? p.scroll;
  const accent = p.blobs[0] ?? p.trail[p.trail.length - 1] ?? mid;
  return [rgbToHex(light), rgbToHex(dark), rgbToHex(mid), rgbToHex(accent)];
}

export function applyPaletteToConfig(
  config: FluidGradientConfig,
  palette: FluidPalette
): FluidGradientConfig {
  const [c1, c2, c3, c4] = paletteToFluidColors(palette);
  return { ...config, color1: c1, color2: c2, color3: c3, color4: c4 };
}

export function lerpFluidConfigColors(
  current: FluidGradientConfig,
  target: FluidGradientConfig,
  t: number
): FluidGradientConfig {
  return {
    ...target,
    color1: lerpHex(current.color1, target.color1, t),
    color2: lerpHex(current.color2, target.color2, t),
    color3: lerpHex(current.color3, target.color3, t),
    color4: lerpHex(current.color4, target.color4, t),
  };
}

const COLOR_KEYS = ["color1", "color2", "color3", "color4"] as const;

export function maxFluidConfigColorDistance(
  current: FluidGradientConfig,
  target: FluidGradientConfig
): number {
  return Math.max(
    ...COLOR_KEYS.map((key) => hexColorDistance(current[key], target[key]))
  );
}

/** Smooth follow — faster near target, never instant snap. */
export function adaptiveColorBlend(
  maxDist: number,
  settled: boolean,
  base = 0.038
): number {
  const closeness = 1 - Math.min(1, maxDist / 0.11);
  const closeBoost = closeness * closeness * 0.09;
  const settledBoost = settled ? 0.035 : 0;
  const tailBoost = maxDist < 0.006 ? 0.055 : 0;
  return Math.min(0.13, base + closeBoost + settledBoost + tailBoost);
}
