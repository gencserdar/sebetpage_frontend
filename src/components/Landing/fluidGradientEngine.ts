/**
 * Persistent paint trail + velocity tail with wave tip.
 */

export type Rgb255 = [number, number, number];

export interface FluidPalette {
  base: Rgb255;
  scroll: Rgb255;
  ambient: Rgb255[];
  trail: Rgb255[];
  /** Lava-lamp blob tones — lighter/darker variants of section hue */
  blobs: Rgb255[];
}

export interface FluidGradientConfig {
  dprCap: number;
  simMaxWidth: number;
  diffusion: number;
  bgPull: number;
  /** Max spread distance as fraction of min screen dimension. */
  diffusionReach: number;
  depositIntervalMs: number;
  depositRadius: number;
  depositStrength: number;
  depositAlpha: number;
  ambientCount: number;
  ambientSpeed: number;
  ambientRadius: number;
  ambientOpacity: number;
  momentumDecay: number;
  momentumGain: number;
  waveAmp: number;
}

export const DEFAULT_FLUID_CONFIG: FluidGradientConfig = {
  dprCap: 1,
  simMaxWidth: 560,
  diffusion: 0.32,
  bgPull: 0.005,
  diffusionReach: 0.6,
  depositIntervalMs: 10,
  depositRadius: 0.13,
  depositStrength: 0.06,
  depositAlpha: 0.19,
  ambientCount: 4,
  ambientSpeed: 0.000078,
  ambientRadius: 0.46,
  ambientOpacity: 0.46,
  momentumDecay: 0.89,
  momentumGain: 1.2,
  waveAmp: 0.046,
};

export type PigmentPicker = (
  palette: FluidPalette,
  background: Rgb255,
  paint: Rgb255 | null,
  paintAlpha: number,
  nx: number,
  ny: number,
  trailSorted?: {
    lightest: Rgb255;
    darkest: Rgb255;
    mid: Rgb255;
  } | null
) => Rgb255;

interface AmbientBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: Rgb255;
  displayColor: Rgb255;
  phase: number;
  alpha: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpByte(a: number, b: number, t: number) {
  return Math.round(lerp(a, b, t));
}

function lerpRgb(a: Rgb255, b: Rgb255, t: number): Rgb255 {
  return [
    lerpByte(a[0], b[0], t),
    lerpByte(a[1], b[1], t),
    lerpByte(a[2], b[2], t),
  ];
}

function rgbCss(c: Rgb255, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function layerOpacity(
  nx: number,
  ny: number,
  cx: number,
  cy: number,
  ew: number,
  eh: number
): number {
  const dx = (nx - cx) / (ew * 0.5);
  const dy = (ny - cy) / (eh * 0.5);
  const d2 = dx * dx + dy * dy;
  if (d2 >= 1) return 0;
  return (1 - Math.sqrt(d2)) ** 1.35;
}

function localVisual(p: FluidPalette, nx: number, ny: number): Rgb255 {
  const light = p.trail[0] ?? p.scroll;
  const dark = p.base;
  const mid =
    p.ambient[Math.floor(p.ambient.length / 2)] ??
    p.trail[Math.floor(p.trail.length / 2)] ??
    p.scroll;
  const accent = p.blobs[1] ?? p.trail[p.trail.length - 1] ?? mid;

  let c: Rgb255 = [...p.scroll];
  const washes: [Rgb255, number, number, number, number, number][] = [
    [light, 0.66, 0.24, 1.22, 0.94, 0.3],
    [dark, 0.33, -0.2, 0.41, 1.13, 0.72],
    [mid, -0.56, 2.24, 1.88, 1.88, 0.68],
    [accent, 1.07, 0.39, 0.61, 0.52, 0.48],
    [accent, 1.08, 0.82, 0.42, 0.28, 0.42],
  ];
  for (const [col, cx, cy, ew, eh, peak] of washes) {
    const op = layerOpacity(nx, ny, cx, cy, ew, eh) * peak;
    if (op > 0.002) c = lerpRgb(c, col, Math.min(0.96, op));
  }
  const lin = Math.max(0, Math.min(1, (nx * 0.5 + ny * 0.92 - 0.38) / 0.72));
  return lerpRgb(c, light, lin * 0.52);
}

function luminance255(c: Rgb255) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function softenRgb(c: Rgb255, strength = 0.2): Rgb255 {
  const scale = 1 - strength * 0.5;
  const g = luminance255(c) * 0.22;
  const mix = strength * 0.28;
  return [
    Math.round(lerp(c[0] * scale, g, mix)),
    Math.round(lerp(c[1] * scale, g, mix)),
    Math.round(lerp(c[2] * scale, g, mix)),
  ];
}

export class FluidGradientEngine {
  private ctx: CanvasRenderingContext2D;
  private cfg: FluidGradientConfig;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private simW = 0;
  private simH = 0;
  private palette: FluidPalette = {
    base: [18, 14, 28],
    scroll: [28, 24, 36],
    ambient: [[28, 24, 36]],
    trail: [[32, 28, 40]],
    blobs: [[32, 28, 40]],
  };
  private field: Uint8ClampedArray | null = null;
  private scratch: Uint8ClampedArray | null = null;
  private reach: Uint8ClampedArray | null = null;
  private scratchReach: Uint8ClampedArray | null = null;
  private imageData: ImageData | null = null;
  private ambient: AmbientBlob[] = [];
  private ambientReady = false;
  private lastDeposit = 0;
  private lastTick = 0;
  private trailX = -1;
  private trailY = -1;
  private ptrLastX = 0.5;
  private ptrLastY = 0.5;
  private ptrLastT = 0;
  private velX = 0;
  private velY = 0;
  private momX = 0.5;
  private momY = 0.5;
  private wavePhase = 0;
  private frame = 0;
  private hasPaint = false;
  private pickPigment: PigmentPicker | null = null;
  private blitCanvas: HTMLCanvasElement | null = null;
  private pointerActive = false;
  private simScale = 1;
  private trailSorted: {
    lightest: Rgb255;
    darkest: Rgb255;
    mid: Rgb255;
  } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    config: Partial<FluidGradientConfig> = {}
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.cfg = { ...DEFAULT_FLUID_CONFIG, ...config };
    this.ctx.imageSmoothingEnabled = true;
    this.cacheTrailSorted();
  }

  setPigmentPicker(fn: PigmentPicker) {
    this.pickPigment = fn;
  }

  private minDim() {
    return Math.min(this.cssW, this.cssH);
  }

  private px(x: number, y: number) {
    return (y * this.simW + x) * 4;
  }

  private resetMotion() {
    this.trailX = -1;
    this.trailY = -1;
    this.ptrLastT = 0;
    this.velX = 0;
    this.velY = 0;
    this.wavePhase = 0;
  }

  private clearField() {
    if (this.field) this.field.fill(0);
    if (this.reach) this.reach.fill(0);
    this.hasPaint = false;
    this.resetMotion();
  }

  private blobColors() {
    return this.palette.blobs.length ? this.palette.blobs : this.palette.ambient;
  }

  private cacheTrailSorted() {
    const pool = this.palette.trail.length
      ? this.palette.trail
      : this.palette.ambient;
    if (!pool.length) {
      this.trailSorted = null;
      return;
    }
    let darkest = pool[0];
    let lightest = pool[0];
    let minL = luminance255(darkest);
    let maxL = minL;
    for (let i = 1; i < pool.length; i++) {
      const c = pool[i];
      const l = luminance255(c);
      if (l < minL) {
        minL = l;
        darkest = c;
      }
      if (l > maxL) {
        maxL = l;
        lightest = c;
      }
    }
    this.trailSorted = {
      lightest,
      darkest,
      mid: pool[Math.floor(pool.length / 2)] ?? pool[0],
    };
  }

  private initAmbient() {
    const colors = this.blobColors();
    const c = this.cfg;
    this.ambient = [];
    for (let i = 0; i < c.ambientCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = c.ambientSpeed * this.minDim() * (0.5 + Math.random() * 0.85);
      const color = colors[i % colors.length] ?? this.palette.base;
      this.ambient.push({
        x: 0.12 + Math.random() * 0.76,
        y: 0.1 + Math.random() * 0.8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: c.ambientRadius * this.minDim() * (0.62 + Math.random() * 0.78),
        color,
        displayColor: softenRgb(color, 0.12),
        phase: Math.random() * Math.PI * 2,
        alpha: 0.24 + Math.random() * 0.14,
      });
    }
    this.ambientReady = true;
  }

  private allocBuffers() {
    const n = this.simW * this.simH * 4;
    this.field = new Uint8ClampedArray(n);
    this.scratch = new Uint8ClampedArray(n);
    this.reach = new Uint8ClampedArray(this.simW * this.simH);
    this.scratchReach = new Uint8ClampedArray(this.simW * this.simH);
    this.imageData = new ImageData(this.simW, this.simH);
    this.clearField();
  }

  setPalette(palette: FluidPalette) {
    this.palette = palette;
    this.cacheTrailSorted();
    if (this.ambientReady) {
      const colors = palette.blobs.length ? palette.blobs : palette.ambient;
      this.ambient.forEach((a, i) => {
        const color = colors[i % colors.length] ?? palette.base;
        a.color = color;
        a.displayColor = softenRgb(color, 0.12);
      });
    }
  }

  resize(cssW: number, cssH: number) {
    if (cssW <= 0 || cssH <= 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.cfg.dprCap);
    this.cssW = cssW;
    this.cssH = cssH;

    const targetW = Math.floor(cssW * this.dpr);
    const scale =
      targetW > this.cfg.simMaxWidth ? this.cfg.simMaxWidth / targetW : 1;
    const newSimW = Math.max(1, Math.floor(targetW * scale));
    const newSimH = Math.max(1, Math.floor(cssH * this.dpr * scale));

    const sizeChanged = newSimW !== this.simW || newSimH !== this.simH;
    this.simW = newSimW;
    this.simH = newSimH;
    this.simScale = this.cssW > 0 ? this.simW / this.cssW : 1;

    this.canvas.width = this.simW;
    this.canvas.height = this.simH;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    if (!this.field || sizeChanged) {
      this.allocBuffers();
      this.ambientReady = false;
    }
    if (!this.ambientReady) this.initAmbient();
  }

  private underColor(nx: number, ny: number): Rgb255 {
    return localVisual(this.palette, nx, ny);
  }

  /** Weighted blob colour under cursor — enables painting & smearing blobs. */
  private sampleBlobInfluence(nx: number, ny: number): { color: Rgb255; weight: number } {
    if (!this.ambient.length || this.cssW <= 0) {
      return { color: this.underColor(nx, ny), weight: 0 };
    }
    const w = this.cssW;
    const h = this.cssH;
    let totalW = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (const a of this.ambient) {
      const dx = (nx - a.x) * w;
      const dy = (ny - a.y) * h;
      const dist = Math.hypot(dx, dy);
      const reach = a.r * 2.35;
      if (dist >= reach) continue;
      const t = 1 - dist / reach;
      const influence = t * t * (0.55 + a.alpha * 0.85);
      totalW += influence;
      r += a.displayColor[0] * influence;
      g += a.displayColor[1] * influence;
      b += a.displayColor[2] * influence;
    }
    if (totalW < 0.01) {
      return { color: this.underColor(nx, ny), weight: 0 };
    }
    return {
      color: [
        Math.round(r / totalW),
        Math.round(g / totalW),
        Math.round(b / totalW),
      ],
      weight: Math.min(1, totalW * 3.4),
    };
  }

  private stirBlobsNear(nx: number, ny: number) {
    const w = this.cssW;
    const h = this.cssH;
    if (w <= 0 || h <= 0) return;
    for (const a of this.ambient) {
      const dx = nx - a.x;
      const dy = ny - a.y;
      const distPx = Math.hypot(dx * w, dy * h);
      const reach = a.r * 2.8;
      if (distPx >= reach) continue;
      const push = (1 - distPx / reach) ** 1.6;
      const len = Math.hypot(dx, dy) || 0.0001;
      const dirX = dx / len;
      const dirY = dy / len;
      a.vx += dirX * push * 0.00072 * w;
      a.vy += dirY * push * 0.00072 * h;
      a.x = clamp01(a.x + dirX * push * 0.0048);
      a.y = clamp01(a.y + dirY * push * 0.0048);
    }
  }

  private sampleField(nx: number, ny: number): { rgb: Rgb255; alpha: number } {
    const x = Math.min(this.simW - 1, Math.max(0, Math.floor(nx * this.simW)));
    const y = Math.min(this.simH - 1, Math.max(0, Math.floor(ny * this.simH)));
    if (!this.field) return { rgb: [0, 0, 0], alpha: 0 };
    const i = this.px(x, y);
    return {
      rgb: [this.field[i], this.field[i + 1], this.field[i + 2]],
      alpha: this.field[i + 3] / 255,
    };
  }

  /** Full visual tone under pointer — CSS wash + canvas blobs. */
  private pointerTone(
    nx: number,
    ny: number,
    blob = this.sampleBlobInfluence(nx, ny)
  ): Rgb255 {
    let tone = localVisual(this.palette, nx, ny);
    if (blob.weight > 0.04) {
      tone = lerpRgb(tone, blob.color, Math.min(0.9, blob.weight * 0.86));
    }
    return tone;
  }

  private pickAt(
    nx: number,
    ny: number,
    blob = this.sampleBlobInfluence(nx, ny)
  ): Rgb255 {
    const tone = this.pointerTone(nx, ny, blob);
    return this.pickPigment
      ? this.pickPigment(this.palette, tone, null, 0, nx, ny, this.trailSorted)
      : softenRgb(tone, 0.04);
  }

  private strokePoints(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): [number, number][] {
    if (x0 < 0) return [[x1, y1]];
    const md = this.minDim();
    const dist = Math.hypot((x1 - x0) * md, (y1 - y0) * md);
    const brushPx = this.cfg.depositRadius * md * 0.5;
    const steps = Math.min(
      16,
      Math.max(1, Math.ceil(dist / Math.max(3, brushPx)))
    );
    const pts: [number, number][] = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      pts.push([lerp(x0, x1, t), lerp(y0, y1, t)]);
    }
    return pts;
  }

  private depositDisk(
    nx: number,
    ny: number,
    pigment: Rgb255,
    radiusNorm: number,
    rgbMix: number,
    alphaAdd: number
  ) {
    if (!this.field || !this.reach || (rgbMix < 0.001 && alphaAdd < 0.001)) return;
    const cx = nx * this.simW;
    const cy = ny * this.simH;
    const r = radiusNorm * Math.min(this.simW, this.simH);
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.simW - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.simH - 1, Math.ceil(cy + r));
    const alphaCap = 158;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const f = (1 - d2 / r2) ** 1.05;
        const mix = rgbMix * f;
        const aAdd = alphaAdd * f;
        const i = this.px(x, y);
        this.field[i] = lerpByte(this.field[i], pigment[0], mix);
        this.field[i + 1] = lerpByte(this.field[i + 1], pigment[1], mix);
        this.field[i + 2] = lerpByte(this.field[i + 2], pigment[2], mix);
        this.field[i + 3] = Math.min(
          alphaCap,
          Math.round(this.field[i + 3] + aAdd * 255)
        );
        if (aAdd > 0.001) {
          this.reach[y * this.simW + x] = 255;
        }
      }
    }
    this.hasPaint = true;
  }

  private depositAt(nx: number, ny: number, scale = 1) {
    const c = this.cfg;
    const blob = this.sampleBlobInfluence(nx, ny);
    const pigment = this.pickAt(nx, ny, blob);
    let strength = c.depositStrength * scale;
    let alpha = c.depositAlpha * scale;
    let radius = c.depositRadius * scale;

    if (blob.weight > 0.03) {
      const blobBoost = 1 + blob.weight * 0.55;
      strength *= blobBoost;
      alpha *= 1 + blob.weight * 0.45;
      radius *= 1 + blob.weight * 0.22;
    }

    this.depositDisk(nx, ny, pigment, radius, strength, alpha);
  }

  private depositStroke(nx: number, ny: number, now: number) {
    if (now - this.lastDeposit < this.cfg.depositIntervalMs) return;
    this.lastDeposit = now;

    const points = this.strokePoints(this.trailX, this.trailY, nx, ny);
    this.trailX = nx;
    this.trailY = ny;

    for (let i = 0; i < points.length; i++) {
      const [px, py] = points[i];
      this.depositAt(px, py, 1);
    }
    this.depositAt(nx, ny, 1);
  }

  /** Pointer update — tracks velocity for momentum tail. */
  updatePointer(nx: number, ny: number, has: boolean, now: number) {
    this.pointerActive = has;
    if (has) {
      if (this.ptrLastT > 0) {
        const dt = Math.max(1, now - this.ptrLastT);
        const rawVx = ((nx - this.ptrLastX) / dt) * this.cfg.momentumGain;
        const rawVy = ((ny - this.ptrLastY) / dt) * this.cfg.momentumGain;
        this.velX = lerp(this.velX, rawVx, 0.42);
        this.velY = lerp(this.velY, rawVy, 0.42);
      }
      this.ptrLastX = nx;
      this.ptrLastY = ny;
      this.ptrLastT = now;
      this.momX = nx;
      this.momY = ny;
      this.stirBlobsNear(nx, ny);
      this.depositStroke(nx, ny, now);
    } else {
      this.ptrLastT = 0;
    }
  }

  /** Velocity tail with wave tip — continues after mouse slows/stops. */
  private tickMomentum(dtMs: number) {
    const speed = Math.hypot(this.velX, this.velY);
    if (speed < 0.000018) {
      this.velX = 0;
      this.velY = 0;
      return;
    }

    const c = this.cfg;
    const dt = Math.min(32, Math.max(1, dtMs));
    const decay = c.momentumDecay ** (dt / 16);

    this.momX = clamp01(this.momX + this.velX * dt);
    this.momY = clamp01(this.momY + this.velY * dt);
    this.velX *= decay;
    this.velY *= decay;

    const speedNorm = Math.min(1, speed / 0.001);
    this.wavePhase += 0.32 + speedNorm * 0.55;

    const dirX = this.velX / speed;
    const dirY = this.velY / speed;
    const perpX = -dirY;
    const perpY = dirX;
    const amp = c.waveAmp * (0.35 + speedNorm * 0.45);

    const tailSteps = Math.min(5, 2 + Math.floor(speedNorm * 4));
    for (let i = 0; i < tailSteps; i++) {
      const u = (i + 1) / tailSteps;
      const along = u * 0.07 * speedNorm;
      const px = clamp01(this.momX - dirX * along);
      const py = clamp01(this.momY - dirY * along);
      const fade = (1 - u * 0.55) * (0.45 + speedNorm * 0.55);
      this.depositAt(px, py, fade);
    }

    const tipWave =
      Math.sin(this.wavePhase * 1.3) * amp * 0.85 +
      Math.sin(this.wavePhase * 2.8) * amp * 0.28;
    const tipX = clamp01(this.momX + perpX * tipWave);
    const tipY = clamp01(this.momY + perpY * tipWave);
    this.depositAt(tipX, tipY, 0.7 * speedNorm);
  }

  private diffuseOnce() {
    const src = this.field;
    const dst = this.scratch;
    const reachSrc = this.reach;
    const reachDst = this.scratchReach;
    if (!src || !dst || !reachSrc || !reachDst) return;
    const w = this.simW;
    const h = this.simH;
    const k = this.cfg.diffusion;
    const pull = this.cfg.bgPull;
    const ak = k * 0.92;
    const reachLoss = Math.max(
      0.9,
      255 / Math.max(24, this.cfg.diffusionReach * Math.min(w, h))
    );
    const w4 = w * 4;

    for (let y = 0; y < h; y++) {
      const ny = (y + 0.5) / h;
      const row = y * w4;
      const rowUp = y > 0 ? row - w4 : row;
      const rowDn = y < h - 1 ? row + w4 : row;
      const rowUp2 = y > 1 ? row - w4 * 2 : row;
      const rowDn2 = y < h - 1 ? row + w4 * 2 : row;
      for (let x = 0; x < w; x++) {
        const i = row + x * 4;
        const a = src[i + 3];
        const ri = y * w + x;

        const l = x > 0 ? i - 4 : i;
        const r = x < w - 1 ? i + 4 : i;
        const u = rowUp + x * 4;
        const d = rowDn + x * 4;
        const ul = y > 0 && x > 0 ? u - 4 : u;
        const ur = y > 0 && x < w - 1 ? u + 4 : u;
        const dl = y < h - 1 && x > 0 ? d - 4 : d;
        const dr = y < h - 1 && x < w - 1 ? d + 4 : d;
        const l2 = x > 1 ? i - 8 : l;
        const r2 = x < w - 2 ? i + 8 : r;
        const u2 = rowUp2 + x * 4;
        const d2 = rowDn2 + x * 4;

        const rl = x > 0 ? ri - 1 : ri;
        const rr = x < w - 1 ? ri + 1 : ri;
        const ru = y > 0 ? ri - w : ri;
        const rd = y < h - 1 ? ri + w : ri;
        const rul = y > 0 && x > 0 ? ru - 1 : ru;
        const rur = y > 0 && x < w - 1 ? ru + 1 : ru;
        const rdl = y < h - 1 && x > 0 ? rd - 1 : rd;
        const rdr = y < h - 1 && x < w - 1 ? rd + 1 : rd;

        const reachAvg =
          (reachSrc[rl] +
            reachSrc[rr] +
            reachSrc[ru] +
            reachSrc[rd] +
            reachSrc[rul] +
            reachSrc[rur] +
            reachSrc[rdl] +
            reachSrc[rdr]) *
          0.125;
        let nextReach = Math.max(
          0,
          Math.max(reachSrc[ri], reachAvg) - reachLoss
        );

        const nIdx = [l, r, u, d, ul, ur, dl, dr];
        let avgA = 0;
        let wSum = 0;
        const avgRgb: [number, number, number] = [0, 0, 0];
        for (let ni = 0; ni < nIdx.length; ni++) {
          const j = nIdx[ni];
          const na = src[j + 3];
          avgA += na;
          if (na > 0.5) {
            const nw = na;
            avgRgb[0] += src[j] * nw;
            avgRgb[1] += src[j + 1] * nw;
            avgRgb[2] += src[j + 2] * nw;
            wSum += nw;
          }
        }
        avgA *= 0.125;
        avgA +=
          (src[l2 + 3] + src[r2 + 3] + src[u2 + 3] + src[d2 + 3]) * 0.25 * 0.22;

        if (wSum > 0) {
          avgRgb[0] /= wSum;
          avgRgb[1] /= wSum;
          avgRgb[2] /= wSum;
        }

        const spreading = a < 1 && avgA >= 0.75 && nextReach >= 1.5;
        const hasInk = a >= 1 || spreading;

        if (!hasInk) {
          dst[i] = dst[i + 1] = dst[i + 2] = dst[i + 3] = 0;
          reachDst[ri] = nextReach;
          continue;
        }

        const inkSignal = Math.max(a, avgA);
        nextReach = Math.max(
          nextReach,
          Math.min(255, inkSignal * 1.05)
        );
        reachDst[ri] = nextReach;

        const nx = (x + 0.5) / w;
        const bg = this.underColor(nx, ny);
        const ink = Math.min(1, inkSignal / 95);
        const paintLum =
          a >= 1
            ? luminance255([src[i], src[i + 1], src[i + 2]])
            : wSum > 0
              ? luminance255([
                  Math.round(avgRgb[0]),
                  Math.round(avgRgb[1]),
                  Math.round(avgRgb[2]),
                ])
              : luminance255(bg);
        const bgLum = luminance255(bg);
        const darkSpread = paintLum < bgLum - 6;
        const lightSpread = paintLum > bgLum + 6;
        const pullAmt = spreading
          ? 0
          : darkSpread
            ? pull * ink * 0.04
            : lightSpread
              ? pull * ink * 0.35
              : pull * ink;
        const spreadK = darkSpread ? Math.min(1, ak * 1.28) : ak;

        for (let ch = 0; ch < 3; ch++) {
          let far =
            (src[l2 + ch] + src[r2 + ch] + src[u2 + ch] + src[d2 + ch]) *
            0.25;
          let avg = wSum > 0 ? avgRgb[ch] : far;
          if (wSum > 0) {
            avg = lerp(avg, far, 0.22);
          }

          if (a < 1) {
            if (darkSpread || lightSpread) {
              dst[i + ch] = lerpByte(bg[ch], avg, spreadK);
            } else {
              dst[i + ch] = lerpByte(bg[ch], avg, k * 0.92);
            }
          } else {
            let v = lerpByte(src[i + ch], avg, k);
            if (pullAmt > 0) {
              v = lerpByte(v, bg[ch], pullAmt);
            }
            dst[i + ch] = v;
          }
        }

        const nextA =
          a < 1
            ? Math.max(avgA * spreadK, avgA * 0.42)
            : lerp(src[i + 3], avgA, ak);
        dst[i + 3] = Math.min(158, Math.round(nextA));
      }
    }
    this.field = dst;
    this.scratch = src;
    this.reach = reachDst;
    this.scratchReach = reachSrc;
  }

  private drawSoftBlob(
    px: number,
    py: number,
    radius: number,
    color: Rgb255,
    alpha: number
  ) {
    if (alpha < 0.004 || radius < 2) return;
    const g = this.ctx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0, rgbCss(color, alpha * 0.72));
    g.addColorStop(0.38, rgbCss(color, alpha * 0.32));
    g.addColorStop(0.72, rgbCss(color, alpha * 0.1));
    g.addColorStop(1, rgbCss(color, 0));
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private blitPaintField() {
    if (!this.field || !this.imageData) return;
    this.imageData.data.set(this.field);
    if (!this.blitCanvas) this.blitCanvas = document.createElement("canvas");
    const off = this.blitCanvas;
    if (off.width !== this.simW || off.height !== this.simH) {
      off.width = this.simW;
      off.height = this.simH;
    }
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.putImageData(this.imageData, 0, 0);
    this.ctx.drawImage(off, 0, 0);
  }

  tick(now: number) {
    if (!this.field || this.simW <= 0) return;

    const dtMs = this.lastTick > 0 ? now - this.lastTick : 16;
    this.lastTick = now;
    this.frame += 1;

    const speed = Math.hypot(this.velX, this.velY);
    const simActive =
      this.pointerActive || this.hasPaint || speed > 0.000018;

    if (simActive) {
      this.tickMomentum(dtMs);
    }
    if (this.hasPaint) {
      const passes = this.pointerActive ? 2 : 3;
      for (let p = 0; p < passes; p++) {
        this.diffuseOnce();
      }
    } else if (!simActive && this.frame % 3 !== 0) {
      return;
    }

    const t = now * 0.001;
    const w = this.cssW;
    const h = this.cssH;
    const c = this.cfg;
    const ss = this.simScale;

    this.ctx.clearRect(0, 0, this.simW, this.simH);

    this.ctx.globalCompositeOperation = "soft-light";
    for (const a of this.ambient) {
      a.x += a.vx / w;
      a.y += a.vy / h;
      a.x += Math.sin(t * 0.24 + a.phase) * 0.00028;
      a.y += Math.cos(t * 0.21 + a.phase * 1.3) * 0.00026;
      a.x += Math.sin(t * 0.11 + a.phase * 2.1) * 0.0001;
      if (a.x < -0.12) a.x = 1.12;
      if (a.x > 1.12) a.x = -0.12;
      if (a.y < -0.12) a.y = 1.12;
      if (a.y > 1.12) a.y = -0.12;
      const breathe = 1 + Math.sin(t * 0.36 + a.phase) * 0.12;
      this.drawSoftBlob(
        a.x * this.simW,
        a.y * this.simH,
        a.r * breathe * ss,
        a.displayColor,
        a.alpha * c.ambientOpacity
      );
    }

    this.ctx.globalCompositeOperation = "soft-light";
    this.blitPaintField();

    this.ctx.globalCompositeOperation = "source-over";
  }

  /** Clear paint only — keeps ambient blobs. Call on section change. */
  clearPaint() {
    if (this.field) this.field.fill(0);
    if (this.reach) this.reach.fill(0);
    this.hasPaint = false;
    this.resetMotion();
    this.lastDeposit = 0;
  }

  clear() {
    this.clearPaint();
    this.lastTick = 0;
    this.frame = 0;
  }
}

function pigmentFromPool(palette: FluidPalette): Rgb255 {
  const pool = palette.trail.length ? palette.trail : palette.ambient;
  return pool[Math.floor(Math.random() * pool.length)] ?? palette.base;
}
