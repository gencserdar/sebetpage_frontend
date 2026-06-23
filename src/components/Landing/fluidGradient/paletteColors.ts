import type { FluidPalette } from "../exploreFluidPalettes";
import { rgbToHex } from "./hexToRgb";
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
