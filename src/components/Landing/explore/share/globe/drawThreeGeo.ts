import * as THREE from "three";

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

type MaterialOptions = {
  color?: number;
  opacity?: number;
};

export function drawThreeGeo({
  json,
  radius,
  materialOptions = {},
}: {
  json: GeoJson;
  radius: number;
  materialOptions?: MaterialOptions;
}) {
  const container = new THREE.Object3D();
  container.rotation.x = -Math.PI * 0.5;

  const lineColor = materialOptions.color ?? 0x697cf5;
  const lineOpacity = materialOptions.opacity ?? 0.72;
  const geometries = createGeometryArray(json);

  for (const geom of geometries) {
    drawGeometry(geom, radius, lineColor, lineOpacity, container);
  }

  return container;
}

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
  throw new Error("Invalid GeoJSON");
}

function drawGeometry(
  geom: GeoGeometry,
  radius: number,
  color: number,
  opacity: number,
  container: THREE.Object3D
) {
  const coords = geom.coordinates;

  if (geom.type === "Polygon") {
    for (const ring of coords as number[][][]) {
      addLineRing(ring, radius, color, opacity, container);
    }
    return;
  }

  if (geom.type === "MultiPolygon") {
    for (const polygon of coords as number[][][][]) {
      for (const ring of polygon) {
        addLineRing(ring, radius, color, opacity, container);
      }
    }
    return;
  }

  if (geom.type === "LineString") {
    addLineRing(coords as number[][], radius, color, opacity, container, false);
    return;
  }

  if (geom.type === "MultiLineString") {
    for (const line of coords as number[][][]) {
      addLineRing(line, radius, color, opacity, container, false);
    }
  }
}

function addLineRing(
  ring: number[][],
  radius: number,
  color: number,
  opacity: number,
  container: THREE.Object3D,
  closed = true
) {
  const dense = densifyRing(ring);
  const verts: number[] = [];

  for (const point of dense) {
    const [lon, lat] = point;
    verts.push(
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((lon * Math.PI) / 180) *
        radius,
      Math.cos((lat * Math.PI) / 180) *
        Math.sin((lon * Math.PI) / 180) *
        radius,
      Math.sin((lat * Math.PI) / 180) * radius
    );
  }

  if (verts.length < 6) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  const line = closed
    ? new THREE.LineLoop(geometry, material)
    : new THREE.Line(geometry, material);
  container.add(line);
}

function densifyRing(ring: number[][]) {
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const point = ring[i];
    const prev = ring[i > 0 ? i - 1 : ring.length - 1];
    out.push(...interpolateSegment(prev, point));
  }
  return out;
}

function interpolateSegment(a: number[], b: number[]) {
  const steps: number[][] = [];
  const lonDist = Math.abs(a[0] - b[0]);
  const latDist = Math.abs(a[1] - b[1]);
  const segments = Math.max(1, Math.ceil(Math.max(lonDist, latDist) / 4));

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    steps.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return steps;
}
