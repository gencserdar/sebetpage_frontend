import * as THREE from "three";

/** Matches drawThreeGeo sphere coordinates (degrees). */
export function latLonToGlobePosition(
  lat: number,
  lon: number,
  radius: number,
  target = new THREE.Vector3()
) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  target.set(
    Math.cos(latRad) * Math.cos(lonRad) * radius,
    Math.cos(latRad) * Math.sin(lonRad) * radius,
    Math.sin(latRad) * radius
  );
  return target;
}

/** How directly a surface point faces the camera (1 = dead center). */
export function facingCameraScore(
  surfaceWorld: THREE.Vector3,
  globeCenter: THREE.Vector3,
  camera: THREE.Camera
) {
  const normal = surfaceWorld.clone().sub(globeCenter).normalize();
  const viewDir = camera.position.clone().sub(globeCenter).normalize();
  return normal.dot(viewDir);
}
