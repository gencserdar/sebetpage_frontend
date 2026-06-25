import * as THREE from "three";

import type { GpuProfile } from "./gpuProfile";
import { hexToRgb } from "./hexToRgb";
import { displayShader, fluidShader, vertexShader } from "./shaders";
import type { FluidGradientConfig } from "./types";

export interface FluidGradientHandle {
  resize(width: number, height: number): void;
  setConfig(config: FluidGradientConfig): void;
  setMouse(x: number, y: number, prevX: number, prevY: number): void;
  clearMouse(): void;
  setIdlePrefetch(enabled: boolean): void;
  tick(): void;
  dispose(): void;
}

const WARMUP_SECONDS = 20;
const WARMUP_FPS = 60;
const WARMUP_TOTAL_FRAMES = WARMUP_SECONDS * WARMUP_FPS;

const PROFILE_TUNING: Record<
  Exclude<GpuProfile, "css-only">,
  {
    simMaxEdge: number;
    pixelRatioCap: number;
    skipWarmup: boolean;
    warmupBatch: number;
    warmupBatchIdle: number;
    frameBudgetMs: number;
    totalBudgetMs: number;
  }
> = {
  full: {
    simMaxEdge: 512,
    pixelRatioCap: 2,
    skipWarmup: false,
    warmupBatch: 200,
    warmupBatchIdle: 400,
    frameBudgetMs: 10,
    totalBudgetMs: 320,
  },
  reduced: {
    simMaxEdge: 256,
    pixelRatioCap: 1,
    skipWarmup: true,
    warmupBatch: 60,
    warmupBatchIdle: 120,
    frameBudgetMs: 5,
    totalBudgetMs: 120,
  },
};

function resolveSimSize(width: number, height: number, simMaxEdge: number) {
  const maxEdge = Math.max(width, height);
  if (maxEdge <= simMaxEdge) {
    return { simWidth: width, simHeight: height };
  }

  const scale = simMaxEdge / maxEdge;
  return {
    simWidth: Math.max(2, Math.floor(width * scale)),
    simHeight: Math.max(2, Math.floor(height * scale)),
  };
}

export function createFluidGradient(
  canvas: HTMLCanvasElement,
  config: FluidGradientConfig,
  profile: Exclude<GpuProfile, "css-only"> = "full"
): FluidGradientHandle {
  const tuning = PROFILE_TUNING[profile];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, tuning.pixelRatioCap)
  );

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const fluidTarget1 = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });
  const fluidTarget2 = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });

  let currentFluidTarget = fluidTarget1;
  let previousFluidTarget = fluidTarget2;
  let frameCount = 0;
  let displayWidth = 1;
  let displayHeight = 1;
  let simWidth = 1;
  let simHeight = 1;
  let lastTickAt = 0;
  let mouseBlend = 0;
  let mouseTarget = 0;
  let lastMouse = { x: 0, y: 0, px: 0, py: 0, valid: false };
  let warmedUp = false;
  let warmupFrame = 0;
  let warmupBudgetMs = 0;
  let sessionStart = 0;
  let idlePrefetch = true;

  const MOUSE_FADE_IN = 14;
  const MOUSE_FADE_OUT = 1.65;

  function swapFluidTargets() {
    const temp = currentFluidTarget;
    currentFluidTarget = previousFluidTarget;
    previousFluidTarget = temp;
  }

  function stepFluid(simTime: number) {
    fluidMaterial.uniforms.iTime.value = simTime;
    fluidMaterial.uniforms.iFrame.value = frameCount;
    fluidMaterial.uniforms.iPreviousFrame.value = previousFluidTarget.texture;

    renderer.setRenderTarget(currentFluidTarget);
    renderer.render(fluidPlane, camera);
    frameCount += 1;
  }

  function finishWarmup() {
    warmedUp = true;
    warmupFrame = WARMUP_TOTAL_FRAMES;
    if (!sessionStart) {
      sessionStart = performance.now() * 0.001;
    }
  }

  function advanceWarmup(batch: number) {
    if (warmedUp || simWidth < 2 || simHeight < 2) return;

    if (tuning.skipWarmup) {
      finishWarmup();
      return;
    }

    const frameStart = performance.now();
    const end = Math.min(warmupFrame + batch, WARMUP_TOTAL_FRAMES);

    for (let i = warmupFrame; i < end; i += 1) {
      if (performance.now() - frameStart > tuning.frameBudgetMs) break;
      if (warmupBudgetMs >= tuning.totalBudgetMs) {
        finishWarmup();
        return;
      }

      const stepStart = performance.now();
      stepFluid(i / WARMUP_FPS);
      swapFluidTargets();
      warmupBudgetMs += performance.now() - stepStart;
      warmupFrame = i + 1;
    }

    if (warmupFrame >= WARMUP_TOTAL_FRAMES) {
      finishWarmup();
    }
  }

  const fluidResolution = new THREE.Vector2(1, 1);
  const fluidMouse = new THREE.Vector4(0, 0, 0, 0);
  const displayResolution = new THREE.Vector2(1, 1);
  const color1 = new THREE.Vector3(...hexToRgb(config.color1));
  const color2 = new THREE.Vector3(...hexToRgb(config.color2));
  const color3 = new THREE.Vector3(...hexToRgb(config.color3));
  const color4 = new THREE.Vector3(...hexToRgb(config.color4));

  const fluidMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: fluidResolution },
      iMouse: { value: fluidMouse },
      iFrame: { value: 0 },
      iPreviousFrame: { value: null as THREE.Texture | null },

      uBrushSize: { value: config.brushSize },
      uBrushStrength: { value: config.brushStrength },
      uFluidDecay: { value: config.fluidDecay },
      uTrailLength: { value: config.trailLength },
      uStopDecay: { value: config.stopDecay },

      uSwirlStrength: { value: config.swirlStrength },
      uFoldPersistence: { value: config.foldPersistence },
      uAdvectionStrength: { value: config.advectionStrength },
      uMouseBlend: { value: 0 },
    },
    vertexShader,
    fragmentShader: fluidShader,
  });

  const displayMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: displayResolution },
      iFluid: { value: null as THREE.Texture | null },

      uDistortionAmount: { value: config.distortionAmount },

      uPermanentWarp: { value: config.permanentWarp },
      uFoldMotion: { value: config.foldMotion },
      uFoldSharpness: { value: config.foldSharpness },

      uColor1: { value: color1 },
      uColor2: { value: color2 },
      uColor3: { value: color3 },
      uColor4: { value: color4 },
      uColorIntensity: { value: config.colorIntensity },
      uSoftness: { value: config.softness },
      uBlur: { value: config.blur },
    },
    vertexShader,
    fragmentShader: displayShader,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const fluidPlane = new THREE.Mesh(geometry, fluidMaterial);
  const displayPlane = new THREE.Mesh(geometry, displayMaterial);

  function applyConfig(next: FluidGradientConfig) {
    fluidMaterial.uniforms.uBrushSize.value = next.brushSize;
    fluidMaterial.uniforms.uBrushStrength.value = next.brushStrength;
    fluidMaterial.uniforms.uFluidDecay.value = next.fluidDecay;
    fluidMaterial.uniforms.uTrailLength.value = next.trailLength;
    fluidMaterial.uniforms.uStopDecay.value = next.stopDecay;

    fluidMaterial.uniforms.uSwirlStrength.value = next.swirlStrength;
    fluidMaterial.uniforms.uFoldPersistence.value = next.foldPersistence;
    fluidMaterial.uniforms.uAdvectionStrength.value = next.advectionStrength;

    displayMaterial.uniforms.uDistortionAmount.value = next.distortionAmount;

    displayMaterial.uniforms.uPermanentWarp.value = next.permanentWarp;
    displayMaterial.uniforms.uFoldMotion.value = next.foldMotion;
    displayMaterial.uniforms.uFoldSharpness.value = next.foldSharpness;

    displayMaterial.uniforms.uColorIntensity.value = next.colorIntensity;
    displayMaterial.uniforms.uSoftness.value = next.softness;
    displayMaterial.uniforms.uBlur.value = next.blur;

    color1.set(...hexToRgb(next.color1));
    color2.set(...hexToRgb(next.color2));
    color3.set(...hexToRgb(next.color3));
    color4.set(...hexToRgb(next.color4));
  }

  applyConfig(config);

  return {
    resize(w: number, h: number) {
      const nextDisplayWidth = Math.max(1, Math.floor(w));
      const nextDisplayHeight = Math.max(1, Math.floor(h));
      const nextSim = resolveSimSize(
        nextDisplayWidth,
        nextDisplayHeight,
        tuning.simMaxEdge
      );

      if (
        nextDisplayWidth === displayWidth &&
        nextDisplayHeight === displayHeight &&
        nextSim.simWidth === simWidth &&
        nextSim.simHeight === simHeight
      ) {
        return;
      }

      displayWidth = nextDisplayWidth;
      displayHeight = nextDisplayHeight;
      simWidth = nextSim.simWidth;
      simHeight = nextSim.simHeight;

      renderer.setSize(displayWidth, displayHeight, false);
      fluidResolution.set(simWidth, simHeight);
      displayResolution.set(displayWidth, displayHeight);
      fluidTarget1.setSize(simWidth, simHeight);
      fluidTarget2.setSize(simWidth, simHeight);

      frameCount = 0;
      warmedUp = false;
      warmupFrame = 0;
      warmupBudgetMs = 0;
      sessionStart = 0;
    },

    setConfig(next) {
      applyConfig(next);
    },

    setMouse(x, y, prevX, prevY) {
      const sx = simWidth / displayWidth;
      const sy = simHeight / displayHeight;
      lastMouse = {
        x: x * sx,
        y: y * sy,
        px: prevX * sx,
        py: prevY * sy,
        valid: true,
      };
      mouseTarget = 1;
    },

    clearMouse() {
      mouseTarget = 0;
    },

    setIdlePrefetch(enabled) {
      idlePrefetch = enabled;
    },

    tick() {
      if (!warmedUp) {
        advanceWarmup(
          idlePrefetch ? tuning.warmupBatchIdle : tuning.warmupBatch
        );
      }

      const now = performance.now();
      const time = now * 0.001;
      const dt =
        lastTickAt > 0 ? Math.min((now - lastTickAt) / 1000, 0.05) : 1 / 60;
      lastTickAt = now;

      const fadeRate = mouseTarget > mouseBlend ? MOUSE_FADE_IN : MOUSE_FADE_OUT;
      mouseBlend += (mouseTarget - mouseBlend) * Math.min(1, fadeRate * dt);

      if (mouseBlend > 0.004 && lastMouse.valid) {
        fluidMouse.set(lastMouse.x, lastMouse.y, lastMouse.px, lastMouse.py);
      } else if (mouseBlend <= 0.004) {
        mouseBlend = 0;
        fluidMouse.set(0, 0, 0, 0);
      }

      fluidMaterial.uniforms.uMouseBlend.value = mouseBlend;

      const displayTime =
        WARMUP_SECONDS + (sessionStart > 0 ? time - sessionStart : 0);
      displayMaterial.uniforms.iTime.value = displayTime;

      stepFluid(time);

      displayMaterial.uniforms.iFluid.value = currentFluidTarget.texture;
      renderer.setRenderTarget(null);
      renderer.render(displayPlane, camera);

      swapFluidTargets();
    },

    dispose() {
      geometry.dispose();
      fluidMaterial.dispose();
      displayMaterial.dispose();
      fluidTarget1.dispose();
      fluidTarget2.dispose();
      renderer.dispose();
    },
  };
}
