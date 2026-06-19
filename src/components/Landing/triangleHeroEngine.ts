export const HERO_SWIPE_THRESHOLD = 64;
export const HERO_DIR_LOCK_PX = 12;
export const HERO_RIPPLE_STAGGER_MS = 0.55;
export const HERO_FLIP_MS = 300;

// Side length of each equilateral triangle in CSS pixels.
// Smaller value => smaller triangles.
const HERO_TRI_PX = 58;
const TRI_H_RATIO = Math.sqrt(3) / 2;

export interface TriMesh {
  index: number;
  col: number;
  row: number;
  // Pixel-space vertices (already projected for the current canvas size).
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  // Pixel-space centroid.
  centerX: number;
  centerY: number;
}

export interface HeroEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  frontImg: HTMLImageElement | null;
  backImg: HTMLImageElement | null;
  mesh: TriMesh[];
  stride: number;
  scale: number;
  triHpx: number;
  offX: number;
  offY: number;
  flipped: Uint8Array;
  progress: Float32Array;
  flipStart: Float32Array;
  dirX: Float32Array;
  dirY: Float32Array;
  rippling: boolean;
  raf: number;
  w: number;
  h: number;
  frontCache: HTMLCanvasElement | null;
  frontCacheKey: string;
}

function buildMesh(w: number, h: number) {
  const scale = HERO_TRI_PX;
  const triHpx = scale * TRI_H_RATIO;
  const halfStep = scale * 0.5;

  // Start half a triangle off the top-left so edges are always covered, and
  // generate enough columns/rows to overflow the bottom-right edge too.
  const offX = -halfStep;
  const offY = -triHpx;

  const cols = Math.ceil((w - offX) / halfStep) + 2;
  const rows = Math.ceil((h - offY) / triHpx) + 2;
  const stride = cols + 1;

  const mesh: TriMesh[] = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const xOff = offX + col * halfStep;
      const yOff = offY + row * triHpx;
      const pointsUp = (col + row) % 2 === 0;

      let ax: number;
      let ay: number;
      let bx: number;
      let by: number;
      let cx: number;
      let cy: number;

      if (pointsUp) {
        // Base on the bottom, apex on top.
        ax = xOff;
        ay = yOff + triHpx;
        bx = xOff + scale;
        by = yOff + triHpx;
        cx = xOff + halfStep;
        cy = yOff;
      } else {
        // Base on top, apex on the bottom.
        ax = xOff;
        ay = yOff;
        bx = xOff + scale;
        by = yOff;
        cx = xOff + halfStep;
        cy = yOff + triHpx;
      }

      mesh.push({
        index: mesh.length,
        col,
        row,
        ax,
        ay,
        bx,
        by,
        cx,
        cy,
        centerX: (ax + bx + cx) / 3,
        centerY: (ay + by + cy) / 3,
      });
    }
  }

  return { mesh, stride, scale, triHpx, offX, offY };
}

function coverRect(imgW: number, imgH: number, boxW: number, boxH: number) {
  const ir = imgW / imgH;
  const br = boxW / boxH;
  if (ir > br) {
    const dh = boxH;
    const dw = boxH * ir;
    return { dx: (boxW - dw) / 2, dy: 0, dw, dh };
  }
  const dw = boxW;
  const dh = boxW / ir;
  return { dx: 0, dy: (boxH - dh) / 2, dw, dh };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
) {
  const { dx, dy, dw, dh } = coverRect(img.naturalWidth, img.naturalHeight, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clipTri(ctx: CanvasRenderingContext2D, tri: TriMesh) {
  ctx.beginPath();
  ctx.moveTo(tri.ax, tri.ay);
  ctx.lineTo(tri.bx, tri.by);
  ctx.lineTo(tri.cx, tri.cy);
  ctx.closePath();
  ctx.clip();
}

function drawTriImage(
  ctx: CanvasRenderingContext2D,
  tri: TriMesh,
  w: number,
  h: number,
  img: HTMLImageElement
) {
  ctx.save();
  clipTri(ctx, tri);
  drawCover(ctx, img, w, h);
  ctx.restore();
}

function sign(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function pointInTri(px: number, py: number, tri: TriMesh) {
  const d1 = sign(px, py, tri.ax, tri.ay, tri.bx, tri.by);
  const d2 = sign(px, py, tri.bx, tri.by, tri.cx, tri.cy);
  const d3 = sign(px, py, tri.cx, tri.cy, tri.ax, tri.ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

export function hitTestTriangle(engine: HeroEngine, px: number, py: number) {
  const { mesh, stride, scale, triHpx, offX, offY } = engine;
  if (mesh.length === 0) return -1;

  const approxCol = Math.floor((px - offX) / (scale * 0.5));
  const approxRow = Math.floor((py - offY) / triHpx);

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      const c = approxCol + dc;
      const r = approxRow + dr;
      if (c < 0 || r < 0) continue;
      const idx = r * stride + c;
      if (idx < 0 || idx >= mesh.length) continue;
      if (mesh[idx].col === c && pointInTri(px, py, mesh[idx])) return idx;
    }
  }

  for (let i = 0; i < mesh.length; i += 1) {
    if (pointInTri(px, py, mesh[i])) return i;
  }
  return -1;
}

// A coherent "domino" fold: squash the triangle along the wave-propagation
// direction (through its own centroid), so neighbouring triangles tip over in
// the same direction as the wave sweeps past them.
function drawFlipFace(
  ctx: CanvasRenderingContext2D,
  tri: TriMesh,
  w: number,
  h: number,
  img: HTMLImageElement,
  dirX: number,
  dirY: number,
  squash: number
) {
  const s = Math.max(0, Math.min(1, squash));
  if (s < 0.02) return;

  const angle = Math.atan2(dirY, dirX);
  ctx.save();
  ctx.translate(tri.centerX, tri.centerY);
  ctx.rotate(angle);
  ctx.scale(s, 1);
  ctx.rotate(-angle);
  ctx.translate(-tri.centerX, -tri.centerY);
  clipTri(ctx, tri);
  drawCover(ctx, img, w, h);
  ctx.restore();
}

function drawDominoFlip(
  ctx: CanvasRenderingContext2D,
  tri: TriMesh,
  w: number,
  h: number,
  front: HTMLImageElement,
  back: HTMLImageElement,
  p: number,
  dirX: number,
  dirY: number
) {
  if (p < 0.5) {
    drawFlipFace(ctx, tri, w, h, front, dirX, dirY, Math.cos(p * Math.PI));
  } else {
    drawFlipFace(ctx, tri, w, h, back, dirX, dirY, -Math.cos(p * Math.PI));
  }
}

function triProgress(engine: HeroEngine, i: number): number {
  const instant =
    engine.flipped[i] === 1 && engine.flipStart[i] < 0 && engine.progress[i] >= 1;
  if (instant) return 1;
  return engine.progress[i];
}

function ensureFrontCache(engine: HeroEngine) {
  const { frontImg, w, h, mesh } = engine;
  if (!frontImg?.complete || w <= 0 || h <= 0 || mesh.length === 0) return;

  const key = `${w}x${h}:${mesh.length}:${frontImg.src}`;
  if (engine.frontCache && engine.frontCacheKey === key) return;

  const off = document.createElement("canvas");
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const octx = off.getContext("2d");
  if (!octx) return;

  octx.fillStyle = "#060608";
  octx.fillRect(0, 0, w, h);
  for (let i = 0; i < mesh.length; i += 1) {
    drawTriImage(octx, mesh[i], w, h, frontImg);
  }
  octx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  octx.lineWidth = 0.75;
  for (let i = 0; i < mesh.length; i += 1) {
    const tri = mesh[i];
    octx.beginPath();
    octx.moveTo(tri.ax, tri.ay);
    octx.lineTo(tri.bx, tri.by);
    octx.lineTo(tri.cx, tri.cy);
    octx.closePath();
    octx.stroke();
  }

  engine.frontCache = off;
  engine.frontCacheKey = key;
}

export function paintHero(engine: HeroEngine) {
  const { ctx, w, h, frontImg, backImg, mesh } = engine;
  if (!frontImg?.complete || w <= 0 || h <= 0 || mesh.length === 0) return;

  ensureFrontCache(engine);
  if (engine.frontCache) {
    ctx.drawImage(engine.frontCache, 0, 0, w, h);
  }

  let anyActive = false;
  for (let i = 0; i < mesh.length; i += 1) {
    const tri = mesh[i];
    const p = triProgress(engine, i);
    if (p <= 0) continue;
    anyActive = true;

    if (p >= 1 && backImg?.complete) {
      drawTriImage(ctx, tri, w, h, backImg);
    } else if (backImg?.complete) {
      drawDominoFlip(ctx, tri, w, h, frontImg, backImg, p, engine.dirX[i], engine.dirY[i]);
    }
  }

  // Re-stroke the outlines of touched triangles so the grid stays crisp.
  if (anyActive) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 0.75;
    for (let i = 0; i < mesh.length; i += 1) {
      if (triProgress(engine, i) <= 0) continue;
      const tri = mesh[i];
      ctx.beginPath();
      ctx.moveTo(tri.ax, tri.ay);
      ctx.lineTo(tri.bx, tri.by);
      ctx.lineTo(tri.cx, tri.cy);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function allocArrays(engine: HeroEngine, n: number) {
  engine.flipped = new Uint8Array(n);
  engine.progress = new Float32Array(n);
  engine.flipStart = new Float32Array(n).fill(-1);
  engine.dirX = new Float32Array(n);
  engine.dirY = new Float32Array(n);
}

export function createHeroEngine(canvas: HTMLCanvasElement): HeroEngine {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  return {
    canvas,
    ctx,
    frontImg: null,
    backImg: null,
    mesh: [],
    stride: 0,
    scale: HERO_TRI_PX,
    triHpx: HERO_TRI_PX * TRI_H_RATIO,
    offX: 0,
    offY: 0,
    flipped: new Uint8Array(0),
    progress: new Float32Array(0),
    flipStart: new Float32Array(0),
    dirX: new Float32Array(0),
    dirY: new Float32Array(0),
    rippling: false,
    raf: 0,
    w: 0,
    h: 0,
    frontCache: null,
    frontCacheKey: "",
  };
}

export function resizeHeroEngine(engine: HeroEngine) {
  const rect = engine.canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  engine.w = rect.width;
  engine.h = rect.height;
  engine.canvas.width = Math.floor(rect.width * dpr);
  engine.canvas.height = Math.floor(rect.height * dpr);
  engine.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const built = buildMesh(rect.width, rect.height);
  engine.mesh = built.mesh;
  engine.stride = built.stride;
  engine.scale = built.scale;
  engine.triHpx = built.triHpx;
  engine.offX = built.offX;
  engine.offY = built.offY;
  allocArrays(engine, built.mesh.length);

  engine.frontCache = null;
  engine.frontCacheKey = "";
}

let paintQueued = false;

export function requestHeroPaint(engine: HeroEngine) {
  if (engine.rippling || paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => {
    paintQueued = false;
    if (!engine.rippling) paintHero(engine);
  });
}

export function resetHeroFlips(engine: HeroEngine) {
  engine.flipped.fill(0);
  engine.progress.fill(0);
  engine.flipStart.fill(-1);
  engine.rippling = false;
  if (engine.raf) cancelAnimationFrame(engine.raf);
  engine.raf = 0;
}

export function markHeroTile(engine: HeroEngine, tileIdx: number) {
  if (engine.rippling || tileIdx < 0 || engine.flipped[tileIdx]) return;
  engine.flipped[tileIdx] = 1;
  engine.progress[tileIdx] = 1;
  engine.flipStart[tileIdx] = -1;
  requestHeroPaint(engine);
}

export function markHeroStroke(
  engine: HeroEngine,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 3));
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const idx = hitTestTriangle(engine, x, y);
    if (idx >= 0) markHeroTile(engine, idx);
  }
}

export function collectRippleSeeds(engine: HeroEngine): number[] {
  const seeds: number[] = [];
  for (let i = 0; i < engine.mesh.length; i += 1) {
    if (
      engine.flipped[i] === 1 &&
      engine.flipStart[i] < 0 &&
      engine.progress[i] >= 1
    ) {
      seeds.push(i);
    }
  }
  return seeds;
}

export function startHeroRipple(
  engine: HeroEngine,
  seedIndices: number[],
  onDone: () => void
) {
  engine.rippling = true;
  const now = performance.now();
  const { mesh } = engine;
  const n = mesh.length;

  const activeSeeds =
    seedIndices.length > 0 ? seedIndices : [Math.floor(n / 2)];

  for (let i = 0; i < n; i += 1) {
    const alreadyDone =
      engine.flipped[i] === 1 &&
      engine.flipStart[i] < 0 &&
      engine.progress[i] >= 1;

    if (alreadyDone) {
      engine.flipStart[i] = -1;
      continue;
    }

    const tri = mesh[i];

    // Find nearest seed; its direction defines this triangle's domino tip-over.
    let dist = Infinity;
    let nearX = tri.centerX;
    let nearY = tri.centerY;
    for (const seedIdx of activeSeeds) {
      const seed = mesh[seedIdx];
      const d = Math.hypot(tri.centerX - seed.centerX, tri.centerY - seed.centerY);
      if (d < dist) {
        dist = d;
        nearX = seed.centerX;
        nearY = seed.centerY;
      }
    }

    let dx = tri.centerX - nearX;
    let dy = tri.centerY - nearY;
    const dl = Math.hypot(dx, dy);
    if (dl < 0.001) {
      dx = 1;
      dy = 0;
    } else {
      dx /= dl;
      dy /= dl;
    }

    engine.dirX[i] = dx;
    engine.dirY[i] = dy;
    engine.flipStart[i] = now + dist * HERO_RIPPLE_STAGGER_MS;
    engine.progress[i] = 0;
    engine.flipped[i] = 0;
  }

  const loop = (t: number) => {
    let animating = false;
    for (let i = 0; i < n; i += 1) {
      const start = engine.flipStart[i];
      if (start < 0) continue;
      const elapsed = t - start;
      if (elapsed < 0) {
        animating = true;
      } else if (elapsed < HERO_FLIP_MS) {
        engine.progress[i] = elapsed / HERO_FLIP_MS;
        engine.flipped[i] = 1;
        animating = true;
      } else {
        engine.progress[i] = 1;
        engine.flipped[i] = 1;
        engine.flipStart[i] = -1;
      }
    }
    paintHero(engine);
    if (animating) {
      engine.raf = requestAnimationFrame(loop);
    } else {
      engine.raf = 0;
      engine.rippling = false;
      onDone();
    }
  };

  if (engine.raf) cancelAnimationFrame(engine.raf);
  engine.raf = requestAnimationFrame(loop);
}

export function wrapNext(i: number, count: number) {
  return (i + 1) % count;
}

export function wrapPrev(i: number, count: number) {
  return (i - 1 + count) % count;
}

export function loadHeroImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
