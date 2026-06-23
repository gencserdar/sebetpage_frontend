declare module "three" {
  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
  }

  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
    set(x: number, y: number, z: number, w: number): this;
  }

  export class Texture {}

  export interface WebGLRendererParameters {
    canvas?: HTMLCanvasElement;
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: string;
  }

  export interface WebGLCapabilities {
    isWebGL2: boolean;
  }

  export interface WebGLExtensions {
    has(name: string): boolean;
  }

  export interface WebGLRendererDebug {
    checkShaderErrors: boolean;
  }

  export class WebGLRenderer {
    constructor(parameters?: WebGLRendererParameters);
    debug: WebGLRendererDebug;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    render(scene: Object3D, camera: Camera): void;
    dispose(): void;
  }

  export class Camera extends Object3D {}

  export class OrthographicCamera extends Camera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
  }

  export interface WebGLRenderTargetOptions {
    minFilter?: number;
    magFilter?: number;
    format?: number;
    type?: number;
  }

  export class WebGLRenderTarget {
    texture: Texture;
    constructor(width: number, height: number, options?: WebGLRenderTargetOptions);
    setSize(width: number, height: number): void;
    dispose(): void;
  }

  export interface ShaderMaterialParameters {
    uniforms?: Record<string, { value: unknown }>;
    vertexShader?: string;
    fragmentShader?: string;
  }

  export class ShaderMaterial {
    uniforms: Record<string, { value: unknown }>;
    constructor(parameters?: ShaderMaterialParameters);
    dispose(): void;
  }

  export class BufferGeometry {
    dispose(): void;
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number);
  }

  export class Object3D {}

  export class Scene extends Object3D {
    add(object: Object3D): this;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: ShaderMaterial);
  }

  export const LinearFilter: number;
  export const RGBAFormat: number;
  export const FloatType: number;
  export const HalfFloatType: number;
}
