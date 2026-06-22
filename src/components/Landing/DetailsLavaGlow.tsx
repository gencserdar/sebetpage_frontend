import { useEffect, useRef, type RefObject } from "react";
import { FluidGradientEngine } from "./fluidGradientEngine";
import {
  buildFluidBaseGradient,
  pickPaintPigment,
  paletteToCssBase,
  resolveFluidPalette,
} from "./exploreFluidPalettes";

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

const CANVAS_BLUR_PX = 32;

export default function DetailsLavaGlow({
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
  const baseRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FluidGradientEngine | null>(null);
  const rafRef = useRef(0);
  const activeRef = useRef(active);
  const paletteKeyRef = useRef("");
  const sectionRef = useRef(-1);

  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.filter = `blur(${CANVAS_BLUR_PX}px) saturate(0.86) brightness(0.92)`;
    try {
      const engine = new FluidGradientEngine(canvas);
      engine.setPigmentPicker(pickPaintPigment);
      engineRef.current = engine;
    } catch {
      engineRef.current = null;
    }
    return () => {
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let lastPaletteUpdate = 0;
    let visible = document.visibilityState !== "hidden";

    const onVisibility = () => {
      visible = document.visibilityState !== "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const applyPalette = (seg: number, slideCount: number, force = false) => {
      const key = `${Math.floor(seg * 40)}:${slideCount}`;
      if (!force && key === paletteKeyRef.current) return;
      paletteKeyRef.current = key;

      const pal = resolveFluidPalette(seg, slideCount);
      engineRef.current?.setPalette(pal);
      if (baseRef.current) {
        baseRef.current.style.backgroundColor = paletteToCssBase(pal);
        baseRef.current.style.backgroundImage = buildFluidBaseGradient(pal);
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(tick);
      if (!activeRef.current || !visible) return;

      const engine = engineRef.current;
      const container = containerRef.current;
      if (!engine || !container) return;

      const paletteState = paletteRef.current;
      if (paletteState) {
        const targetSec = Math.round(paletteState.seg);
        if (sectionRef.current < 0) {
          sectionRef.current = targetSec;
        } else if (targetSec !== sectionRef.current) {
          engine.clearPaint();
          sectionRef.current = targetSec;
        }

        if (now - lastPaletteUpdate > 48) {
          lastPaletteUpdate = now;
          applyPalette(paletteState.seg, paletteState.slideCount);
        }
      }

      const pointer = pointerRef.current;
      engine.updatePointer(
        pointer?.x ?? 0.5,
        pointer?.y ?? 0.5,
        Boolean(pointer?.has),
        now
      );

      engine.tick(now);
    };

    const resize = () => {
      const container = containerRef.current;
      const engine = engineRef.current;
      if (!container || !engine) return;
      engine.resize(container.clientWidth, container.clientHeight);
    };

    const container = containerRef.current;
    if (container) {
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(container);
    }

    const ps = paletteRef.current;
    if (ps) applyPalette(ps.seg, ps.slideCount, true);

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      ro?.disconnect();
      cancelAnimationFrame(rafRef.current);
      engineRef.current?.clear();
      paletteKeyRef.current = "";
      sectionRef.current = -1;
    };
  }, [active, containerRef, paletteRef, pointerRef]);

  useEffect(() => {
    if (!active) return;
    const pointer = pointerRef.current;
    if (pointer) pointer.has = false;
    engineRef.current?.clear();
    paletteKeyRef.current = "";
    sectionRef.current = -1;
  }, [active, pointerRef]);

  return (
    <div
      className={`landing-details__fluid${active ? " is-active" : ""}`}
      aria-hidden
    >
      <div ref={baseRef} className="landing-details__fluid-base" />
      <canvas ref={canvasRef} className="landing-details__fluid-canvas" />
    </div>
  );
}
