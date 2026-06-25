type GeoJson = {
  type: string;
  features?: { geometry: GeoGeometry }[];
  geometry?: GeoGeometry;
  geometries?: GeoGeometry[];
};

type GeoGeometry = {
  type: string;
  coordinates: unknown;
};

function createGeometryArray(json: GeoJson): GeoGeometry[] {
  if (json.type === "Feature" && json.geometry) {
    return [json.geometry];
  }
  if (json.type === "FeatureCollection" && json.features) {
    return json.features.map((f) => f.geometry);
  }
  if (json.type === "GeometryCollection" && json.geometries) {
    return json.geometries;
  }
  return [];
}

function lonLatToCanvas(
  lon: number,
  lat: number,
  width: number,
  height: number
) {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

function drawRingPath(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  width: number,
  height: number
) {
  if (ring.length < 2) return;
  const first = ring[0];
  const start = lonLatToCanvas(first[0], first[1], width, height);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < ring.length; i += 1) {
    const [lon, lat] = ring[i];
    const p = lonLatToCanvas(lon, lat, width, height);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function paintGeometry(
  ctx: CanvasRenderingContext2D,
  geom: GeoGeometry,
  width: number,
  height: number,
  holes: boolean
) {
  const coords = geom.coordinates;

  if (geom.type === "Polygon") {
    const rings = coords as number[][][];
    if (holes) {
      for (let r = 1; r < rings.length; r += 1) {
        ctx.beginPath();
        drawRingPath(ctx, rings[r], width, height);
        ctx.fill();
      }
      return;
    }
    if (rings[0]) {
      ctx.beginPath();
      drawRingPath(ctx, rings[0], width, height);
      ctx.fill();
    }
    return;
  }

  if (geom.type === "MultiPolygon") {
    for (const polygon of coords as number[][][][]) {
      if (holes) {
        for (let r = 1; r < polygon.length; r += 1) {
          ctx.beginPath();
          drawRingPath(ctx, polygon[r], width, height);
          ctx.fill();
        }
      } else if (polygon[0]) {
        ctx.beginPath();
        drawRingPath(ctx, polygon[0], width, height);
        ctx.fill();
      }
    }
  }
}

export function createLandMaskCanvas(
  json: GeoJson,
  fillColor: string
) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = fillColor;

  const geometries = createGeometryArray(json);
  for (const geom of geometries) {
    paintGeometry(ctx, geom, width, height, false);
  }

  ctx.globalCompositeOperation = "destination-out";
  for (const geom of geometries) {
    paintGeometry(ctx, geom, width, height, true);
  }
  ctx.globalCompositeOperation = "source-over";

  return canvas;
}
