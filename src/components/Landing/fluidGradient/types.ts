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
}

export const DEFAULT_FLUID_GRADIENT_CONFIG: FluidGradientConfig = {
  brushSize: 52.0,
  brushStrength: 0.88,
  distortionAmount: 1.45,
  fluidDecay: 0.982,
  trailLength: 1.0,
  stopDecay: 0.92,

  swirlStrength: 1.15,
  foldPersistence: 0.998,
  advectionStrength: 0.95,

  permanentWarp: 1.05,
  foldMotion: 0.85,
  foldSharpness: 2.4,

  color1: "#b8fff7",
  color2: "#6e3466",
  color3: "#0133ff",
  color4: "#66d1fe",
  colorIntensity: 1.0,
  softness: 1.0,
};