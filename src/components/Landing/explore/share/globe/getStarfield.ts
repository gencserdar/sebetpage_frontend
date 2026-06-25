import * as THREE from "three";

type StarfieldOptions = {
  numStars?: number;
  minRadius?: number;
  maxRadius?: number;
};

export default function getStarfield({
  numStars = 2400,
  minRadius = 30,
  maxRadius = 78,
}: StarfieldOptions = {}) {
  const verts: number[] = [];
  const colors: number[] = [];
  const span = maxRadius - minRadius;

  for (let i = 0; i < numStars; i += 1) {
    const radius = Math.random() * span + minRadius;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const col = new THREE.Color().setHSL(0.62, 0.25, 0.55 + Math.random() * 0.35);
    verts.push(x, y, z);
    colors.push(col.r, col.g, col.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
}
