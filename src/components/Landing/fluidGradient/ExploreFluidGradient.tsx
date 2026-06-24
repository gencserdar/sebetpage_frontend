import { useEffect, useMemo, useRef, type RefObject } from "react";

import {
  buildFluidBaseGradient,
  paletteToCssBase,
  resolveFluidPalette,
} from "../exploreFluidPalettes";
import { createFluidGradient } from "./createFluidGradient";
import { detectGpuProfile } from "./gpuProfile";
import {
  adaptiveColorBlend,
  applyPaletteToConfig,
  lerpFluidConfigColors,
  maxFluidConfigColorDistance,
} from "./paletteColors";
import { DEFAULT_FLUID_GRADIENT_CONFIG } from "./types";
import type { FluidGradientConfig } from "./types";

const SEG_FOLLOW = 0.055;
const SEG_FOLLOW_SETTLED = 0.082;
const SETTLED_SEG = 0.03;

export interface LavaPaletteState {
  sectionColors: string[];
  seg: number;
  slideCount: number;
}

export interface LavaPointerState {
  x: number;
  y: number;
  smoothX: number;
  smoothY: number;
  has: boolean;
}

function applyCssPalette(
  el: HTMLDivElement,
  palette: ReturnType<typeof resolveFluidPalette>
) {
  el.style.backgroundColor = paletteToCssBase(palette);
  el.style.backgroundImage = buildFluidBaseGradient(palette);
}

export default function ExploreFluidGradient({
  active,
  containerRef,
  paletteRef,
  pointerRef,
}: {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  paletteRef: RefObject<LavaPaletteState>;
  pointerRef: RefObject<LavaPointerState>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createFluidGradient> | null>(null);
  const activeRef = useRef(active);
  const displaySegRef = useRef(0);
  const colorConfigRef = useRef<FluidGradientConfig>({
    ...DEFAULT_FLUID_GRADIENT_CONFIG,
  });
  const prevMouseRef = useRef({
    x: 0,
    y: 0,
    has: false,
  });
  const rafRef = useRef(0);
  const gpuProfile = useMemo(() => detectGpuProfile(), []);
  const useCssFallback = gpuProfile === "css-only";

  activeRef.current = active;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = paletteRef.current;
    const initialSeg = palette?.seg ?? 0;
    displaySegRef.current = initialSeg;

    const syncPalette = () => {
      const paletteState = paletteRef.current;
      if (!paletteState) return;

      const targetSeg = paletteState.seg;
      const settled =
        Math.abs(targetSeg - Math.round(targetSeg)) < SETTLED_SEG;
      const aimSeg = settled ? Math.round(targetSeg) : targetSeg;

      let displaySeg = displaySegRef.current;
      const segFollow = settled ? SEG_FOLLOW_SETTLED : SEG_FOLLOW;
      displaySeg += (aimSeg - displaySeg) * segFollow;
      displaySegRef.current = displaySeg;

      const resolved = resolveFluidPalette(
        displaySegRef.current,
        paletteState.slideCount
      );

      if (useCssFallback) {
        const el = fallbackRef.current;
        if (el) applyCssPalette(el, resolved);
        return;
      }

      const target = applyPaletteToConfig(
        DEFAULT_FLUID_GRADIENT_CONFIG,
        resolved
      );

      const maxDist = maxFluidConfigColorDistance(
        colorConfigRef.current,
        target
      );
      const blend = adaptiveColorBlend(maxDist, settled);
      colorConfigRef.current = lerpFluidConfigColors(
        colorConfigRef.current,
        target,
        blend
      );

      engineRef.current?.setConfig(colorConfigRef.current);
    };

    if (palette) {
      colorConfigRef.current = applyPaletteToConfig(
        DEFAULT_FLUID_GRADIENT_CONFIG,
        resolveFluidPalette(initialSeg, palette.slideCount)
      );
      if (useCssFallback) {
        const el = fallbackRef.current;
        if (el) {
          applyCssPalette(
            el,
            resolveFluidPalette(initialSeg, palette.slideCount)
          );
        }
      }
    } else {
      colorConfigRef.current = { ...DEFAULT_FLUID_GRADIENT_CONFIG };
    }

    let engine: ReturnType<typeof createFluidGradient> | null = null;
    const canvas = canvasRef.current;

    if (!useCssFallback && canvas) {
      engine = createFluidGradient(
        canvas,
        colorConfigRef.current,
        gpuProfile
      );
      engineRef.current = engine;
    }

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) engine?.resize(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      syncPalette();

      if (!engine) return;

      const pointer = pointerRef.current;

      if (activeRef.current && pointer?.has) {
        const w = container.clientWidth;
        const h = container.clientHeight;

        const mx = pointer.x * w;
        const my = (1 - pointer.y) * h;

        const prev = prevMouseRef.current;

        if (!prev.has) {
          prev.x = mx;
          prev.y = my;
          prev.has = true;
        }

        engine.setMouse(mx, my, prev.x, prev.y);

        prev.x = mx;
        prev.y = my;
      } else {
        engine.clearMouse();

        prevMouseRef.current.x = 0;
        prevMouseRef.current.y = 0;
        prevMouseRef.current.has = false;
      }

      engine.setIdlePrefetch(!activeRef.current);
      engine.tick();
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      engine?.dispose();
      engineRef.current = null;
    };
  }, [containerRef, gpuProfile, paletteRef, pointerRef, useCssFallback]);

  return (
    <div
      className={`landing-details__fluid${active ? " is-active" : ""}`}
      aria-hidden
    >
      {useCssFallback ? (
        <div
          ref={fallbackRef}
          className="landing-details__gradient-fallback"
        />
      ) : (
        <canvas ref={canvasRef} className="landing-details__gradient-canvas" />
      )}
    </div>
  );
}
