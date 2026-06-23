import * as THREE from "three";

import { hexToRgb } from "./hexToRgb";
import { displayShader, fluidShader, vertexShader } from "./shaders";
import type { FluidGradientConfig } from "./types";

export interface FluidGradientHandle {
  resize(width: number, height: number): void;
  setConfig(config: FluidGradientConfig): void;
  setMouse(x: number, y: number, prevX: number, prevY: number): void;
  clearMouse(): void;
  tick(): void;
  dispose(): void;
}

export function createFluidGradient(
  canvas: HTMLCanvasElement,
  config: FluidGradientConfig
): FluidGradientHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
  let width = 1;
  let height = 1;
  let lastMoveTime = 0;

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

      // yeni
      uSwirlStrength: { value: config.swirlStrength },
      uFoldPersistence: { value: config.foldPersistence },
      uAdvectionStrength: { value: config.advectionStrength },
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

      // yeni
      uPermanentWarp: { value: config.permanentWarp },
      uFoldMotion: { value: config.foldMotion },
      uFoldSharpness: { value: config.foldSharpness },

      uColor1: { value: color1 },
      uColor2: { value: color2 },
      uColor3: { value: color3 },
      uColor4: { value: color4 },
      uColorIntensity: { value: config.colorIntensity },
      uSoftness: { value: config.softness },
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

    // yeni fluid ayarları
    fluidMaterial.uniforms.uSwirlStrength.value = next.swirlStrength;
    fluidMaterial.uniforms.uFoldPersistence.value = next.foldPersistence;
    fluidMaterial.uniforms.uAdvectionStrength.value = next.advectionStrength;

    displayMaterial.uniforms.uDistortionAmount.value = next.distortionAmount;

    // yeni display ayarları
    displayMaterial.uniforms.uPermanentWarp.value = next.permanentWarp;
    displayMaterial.uniforms.uFoldMotion.value = next.foldMotion;
    displayMaterial.uniforms.uFoldSharpness.value = next.foldSharpness;

    displayMaterial.uniforms.uColorIntensity.value = next.colorIntensity;
    displayMaterial.uniforms.uSoftness.value = next.softness;

    color1.set(...hexToRgb(next.color1));
    color2.set(...hexToRgb(next.color2));
    color3.set(...hexToRgb(next.color3));
    color4.set(...hexToRgb(next.color4));
  }

  applyConfig(config);

  return {
    resize(w: number, h: number) {
      const nextWidth = Math.max(1, Math.floor(w));
      const nextHeight = Math.max(1, Math.floor(h));

      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;

      renderer.setSize(width, height, false);
      fluidResolution.set(width, height);
      displayResolution.set(width, height);
      fluidTarget1.setSize(width, height);
      fluidTarget2.setSize(width, height);

      frameCount = 0;
    },

    setConfig(next) {
      applyConfig(next);
    },

    setMouse(x, y, prevX, prevY) {
      fluidMouse.set(x, y, prevX, prevY);
      lastMoveTime = performance.now();
    },

    clearMouse() {
      fluidMouse.set(0, 0, 0, 0);
    },

    tick() {
      const time = performance.now() * 0.001;
      fluidMaterial.uniforms.iTime.value = time;
      displayMaterial.uniforms.iTime.value = time;
      fluidMaterial.uniforms.iFrame.value = frameCount;

      if (performance.now() - lastMoveTime > 100) {
        fluidMouse.set(0, 0, 0, 0);
      }

      fluidMaterial.uniforms.iPreviousFrame.value = previousFluidTarget.texture;

      renderer.setRenderTarget(currentFluidTarget);
      renderer.render(fluidPlane, camera);

      displayMaterial.uniforms.iFluid.value = currentFluidTarget.texture;
      renderer.setRenderTarget(null);
      renderer.render(displayPlane, camera);

      const temp = currentFluidTarget;
      currentFluidTarget = previousFluidTarget;
      previousFluidTarget = temp;
      frameCount += 1;
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
