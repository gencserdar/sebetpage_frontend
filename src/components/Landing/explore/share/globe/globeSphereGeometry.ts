import * as THREE from "three";

/** Same lat/lon → sphere mapping as drawThreeGeo line rings. */
export function buildGlobeSphereGeometry(
  radius: number,
  widthSegments = 128,
  heightSegments = 64
) {
  const verts: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= heightSegments; y += 1) {
    const lat = 90 - (y / heightSegments) * 180;
    const latRad = (lat * Math.PI) / 180;

    for (let x = 0; x <= widthSegments; x += 1) {
      const lon = -180 + (x / widthSegments) * 360;
      const lonRad = (lon * Math.PI) / 180;

      verts.push(
        Math.cos(latRad) * Math.cos(lonRad) * radius,
        Math.cos(latRad) * Math.sin(lonRad) * radius,
        Math.sin(latRad) * radius
      );
    }
  }

  const row = widthSegments + 1;
  for (let y = 0; y < heightSegments; y += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const a = y * row + x;
      const b = a + 1;
      const c = row * (y + 1) + x;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geometry.setIndex(indices);
  return geometry;
}
