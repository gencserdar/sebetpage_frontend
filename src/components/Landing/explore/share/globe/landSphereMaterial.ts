import * as THREE from "three";

/**
 * Samples the land mask per-pixel from sphere position so texture aligns
 * exactly with drawThreeGeo coastline coordinates.
 */
export function createLandSphereMaterial(map: THREE.CanvasTexture) {
  map.flipY = false;
  map.needsUpdate = true;

  return new THREE.ShaderMaterial({
    uniforms: {
      mapTex: { value: map },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mapTex;
      varying vec3 vPos;

      void main() {
        float r = length(vPos);
        float lat = asin(clamp(vPos.z / r, -1.0, 1.0));
        float lon = atan(vPos.y, vPos.x);
        float u = lon / 6.28318530718 + 0.5;
        float v = 0.5 - lat / 3.14159265359;
        vec4 tex = texture2D(mapTex, vec2(u, v));
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(tex.rgb, tex.a);
      }
    `,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
}
