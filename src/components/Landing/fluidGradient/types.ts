export interface FluidGradientConfig {
  brushSize: number;
  brushStrength: number;
  distortionAmount: number;
  fluidDecay: number;
  trailLength: number;
  stopDecay: number;

  swirlStrength: number;
  foldPersistence: number;
  advectionStrength: number;

  permanentWarp: number;
  foldMotion: number;
  foldSharpness: number;

  color1: string;
  color2: string;
  color3: string;
  color4: string;
  colorIntensity: number;
  softness: number;
  /** Display blur strength (0 = off, ~0.3–0.6 = soft, 1+ = stronger). */
  blur: number;
}

export const DEFAULT_FLUID_GRADIENT_CONFIG: FluidGradientConfig = {
  brushSize: 45.0,
  brushStrength: 0.57,
  distortionAmount: 0.05,
  fluidDecay: 0.982,
  trailLength: 1.0,
  stopDecay: 0.92,

  swirlStrength: 1.15,
  foldPersistence: 0.996,
  advectionStrength: 0.95,

  permanentWarp: 1.05,
  foldMotion: 1.85,
  foldSharpness: 2.4,

  color1: "#b8fff7",
  color2: "#6e3466",
  color3: "#0133ff",
  color4: "#66d1fe",
  colorIntensity: 0.7,
  softness: 1.0,
  blur: 2.0,
};