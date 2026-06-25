declare module "three" {
  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
    set(x: number, y: number): this;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number;
    y: number;
    z: number;
    w: number;
    set(x: number, y: number, z: number, w: number): this;
  }

  export class Color {
    constructor(color?: string | number);
    r: number;
    g: number;
    b: number;
    setHSL(h: number, s: number, l: number): this;
  }

  export class Texture {}

  export class Material {
    dispose(): void;
  }

  export interface BufferAttribute {
    array: ArrayLike<number>;
    itemSize: number;
  }

  export class Float32BufferAttribute implements BufferAttribute {
    constructor(array: ArrayLike<number> | number[], itemSize: number);
    array: ArrayLike<number>;
    itemSize: number;
  }

  export interface WebGLRendererParameters {
    canvas?: HTMLCanvasElement;
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: string;
  }

  export interface WebGLRendererDebug {
    checkShaderErrors: boolean;
  }

  export class WebGLRenderer {
    constructor(parameters?: WebGLRendererParameters);
    domElement: HTMLCanvasElement;
    debug: WebGLRendererDebug;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: number, alpha?: number): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    render(scene: Object3D, camera: Camera): void;
    dispose(): void;
  }

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    position: Vector3;
    updateProjectionMatrix(): void;
  }

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

  export class ShaderMaterial extends Material {
    uniforms: Record<string, { value: unknown }>;
    constructor(parameters?: ShaderMaterialParameters);
  }

  export class LineBasicMaterial extends Material {
    constructor(parameters?: {
      color?: number;
      transparent?: boolean;
      opacity?: number;
    });
  }

  export class PointsMaterial extends Material {
    constructor(parameters?: {
      size?: number;
      vertexColors?: boolean;
      transparent?: boolean;
      opacity?: number;
      depthWrite?: boolean;
    });
  }

  export class BufferGeometry {
    dispose(): void;
    setAttribute(name: string, attribute: BufferAttribute): this;
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry: BufferGeometry, thresholdAngle?: number);
  }

  export class Object3D {
    position: Vector3;
    rotation: { x: number; y: number; z: number };
    add(object: Object3D): this;
    traverse(callback: (object: Object3D) => void): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {}

  export class Mesh extends Object3D {
    geometry: BufferGeometry;
    material: Material | Material[];
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export class Line extends Object3D {
    geometry: BufferGeometry;
    material: Material | Material[];
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export class LineLoop extends Line {}

  export class LineSegments extends Line {}

  export class Points extends Object3D {
    geometry: BufferGeometry;
    material: Material | Material[];
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export const LinearFilter: number;
  export const RGBAFormat: number;
  export const FloatType: number;
  export const HalfFloatType: number;
}
