import { useEffect, useRef, type RefObject } from "react";

import { resolveFluidPalette } from "../exploreFluidPalettes";
import { createFluidGradient } from "./createFluidGradient";
import { applyPaletteToConfig } from "./paletteColors";
import { DEFAULT_FLUID_GRADIENT_CONFIG } from "./types";

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
  const engineRef = useRef<ReturnType<typeof createFluidGradient> | null>(null);
  const prevMouseRef = useRef({
    x: 0,
    y: 0,
    has: false,
  });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const engine = createFluidGradient(canvas, DEFAULT_FLUID_GRADIENT_CONFIG);
    engineRef.current = engine;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) engine.resize(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      const palette = paletteRef.current;
      if (palette) {
        const resolved = resolveFluidPalette(palette.seg, palette.slideCount);
        engine.setConfig(applyPaletteToConfig(DEFAULT_FLUID_GRADIENT_CONFIG, resolved));
      }

      const pointer = pointerRef.current;

      if (pointer?.has) {
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

      engine.tick();
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [active, containerRef, paletteRef, pointerRef]);

  return (
    <div
      className={`landing-details__fluid${active ? " is-active" : ""}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="landing-details__gradient-canvas" />
    </div>
  );
}
