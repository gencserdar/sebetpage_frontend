import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  MOCK_GLOBE_POSTS,
  type GlobePost,
} from "../mockGlobePosts";
import { drawThreeGeo } from "./drawThreeGeo";
import { facingCameraScore, latLonToGlobePosition } from "./globeCoords";
import getStarfield from "./getStarfield";

const LAND_URL = `${process.env.PUBLIC_URL ?? ""}/geojson/ne_110m_land.json`;
const GLOBE_RADIUS = 4.35;
const FACE_THRESHOLD = 0.74;
const MARKER_FACE_MIN = 0.08;
/** Min camera travel before post bubbles can open (after grab + rotate). */
const DRAG_MOVE_THRESHOLD = 0.14;
const NORMAL_ROTATE = 0.42;
const FAST_ROTATE = 3.1;
const ROTATE_EASE_MS = 3000;

function motionSmoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

type MarkerRecord = {
  id: string;
  mesh: THREE.Mesh;
};

export default function ExploreGlobe({
  onActivePostChange,
}: {
  onActivePostChange?: (post: GlobePost | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onActivePostChangeRef = useRef(onActivePostChange);
  onActivePostChangeRef.current = onActivePostChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let visible = false;
    let manualExploring = false;
    let isDragging = false;
    let hasRotatedEnough = false;
    let lastActiveId: string | null = null;
    let prevShowcaseOpacity = 0;
    let spinEaseStart = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 200);
    camera.position.set(0, 0.35, 10.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = true;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.42;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.dampingFactor = 0.08;

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.12;
    globeGroup.position.y = -0.32;
    scene.add(globeGroup);

    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.SphereGeometry(GLOBE_RADIUS, 48, 36),
        1
      ),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      })
    );
    globeGroup.add(wire);
    scene.add(getStarfield({ numStars: 2600, minRadius: 32, maxRadius: 82 }));

    const postsGroup = new THREE.Group();
    postsGroup.rotation.x = -Math.PI / 2;
    globeGroup.add(postsGroup);

    const markers: MarkerRecord[] = [];
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x697cf5,
      transparent: true,
      opacity: 0.92,
    });
    const activeMat = new THREE.MeshBasicMaterial({
      color: 0xffdb58,
      transparent: true,
      opacity: 1,
    });

    for (const post of MOCK_GLOBE_POSTS) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 12, 12),
        baseMat
      );
      latLonToGlobePosition(post.lat, post.lon, GLOBE_RADIUS, mesh.position);
      mesh.userData.postId = post.id;
      postsGroup.add(mesh);
      markers.push({ id: post.id, mesh });
    }

    const globeCenter = new THREE.Vector3();
    const surfaceWorld = new THREE.Vector3();
    const dragStartCam = new THREE.Vector3();

    const clearActivePost = () => {
      if (lastActiveId === null) return;
      lastActiveId = null;
      for (const { mesh } of markers) {
        mesh.scale.setScalar(1);
        mesh.material = baseMat;
      }
      onActivePostChangeRef.current?.(null);
    };

    const setActivePost = (post: GlobePost | null) => {
      const nextId = post?.id ?? null;
      if (nextId === lastActiveId) return;
      lastActiveId = nextId;
      for (const { id, mesh } of markers) {
        const active = id === nextId;
        mesh.material = active ? activeMat : baseMat;
        mesh.scale.setScalar(active ? 1.55 : 1);
      }
      onActivePostChangeRef.current?.(post);
    };

    controls.addEventListener("start", () => {
      isDragging = true;
      hasRotatedEnough = false;
      manualExploring = true;
      controls.autoRotate = false;
      dragStartCam.copy(camera.position);
      clearActivePost();
    });

    controls.addEventListener("end", () => {
      isDragging = false;
      hasRotatedEnough = false;
      manualExploring = false;
      controls.autoRotate = true;
      clearActivePost();
    });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0.06;
      },
      { threshold: [0, 0.06, 0.15, 0.35] }
    );
    io.observe(host);

    fetch(LAND_URL)
      .then((res) => res.json())
      .then((data) => {
        if (disposed) return;
        const land = drawThreeGeo({
          json: data,
          radius: GLOBE_RADIUS,
          materialOptions: {
            color: 0x9eb0ff,
            opacity: 0.82,
            fillColor: 0x4f6fe8,
            fillOpacity: 0.3,
          },
        });
        globeGroup.add(land);
      })
      .catch(() => {
        /* optional */
      });

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible) return;

      controls.update();
      globeGroup.getWorldPosition(globeCenter);

      const showcase = host.closest(
        ".landing-share__showcase"
      ) as HTMLElement | null;
      const showcaseOpacity = showcase
        ? Number.parseFloat(getComputedStyle(showcase).opacity) || 0
        : 0;

      const entering =
        prevShowcaseOpacity <= 0.02 && showcaseOpacity > 0.02;
      if (entering && !isDragging) {
        spinEaseStart = performance.now();
      }

      if (!isDragging) {
        if (showcaseOpacity <= 0.02) {
          controls.autoRotate = false;
          controls.autoRotateSpeed = 0;
          spinEaseStart = 0;
        } else {
          controls.autoRotate = true;
          const now = performance.now();
          if (spinEaseStart === 0) {
            spinEaseStart = now;
          }
          const elapsed = now - spinEaseStart;
          if (elapsed < ROTATE_EASE_MS) {
            const t = elapsed / ROTATE_EASE_MS;
            const ease = motionSmoothstep(t);
            controls.autoRotateSpeed =
              FAST_ROTATE + (NORMAL_ROTATE - FAST_ROTATE) * ease;
          } else if (showcaseOpacity < 0.98) {
            controls.autoRotateSpeed =
              NORMAL_ROTATE * Math.max(0.04, showcaseOpacity);
          } else {
            controls.autoRotateSpeed = NORMAL_ROTATE;
          }
        }
      }

      prevShowcaseOpacity = showcaseOpacity;

      for (const { mesh } of markers) {
        mesh.getWorldPosition(surfaceWorld);
        const facing = facingCameraScore(surfaceWorld, globeCenter, camera);
        mesh.visible = facing > MARKER_FACE_MIN;
      }

      if (isDragging && !hasRotatedEnough) {
        const dx = camera.position.x - dragStartCam.x;
        const dy = camera.position.y - dragStartCam.y;
        const dz = camera.position.z - dragStartCam.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) >= DRAG_MOVE_THRESHOLD) {
          hasRotatedEnough = true;
        }
      }

      let bestPost: GlobePost | null = null;
      let bestScore = FACE_THRESHOLD;

      if (isDragging && manualExploring && hasRotatedEnough) {
        for (const post of MOCK_GLOBE_POSTS) {
          const marker = markers.find((m) => m.id === post.id);
          if (!marker || !marker.mesh.visible) continue;
          marker.mesh.getWorldPosition(surfaceWorld);
          const score = facingCameraScore(surfaceWorld, globeCenter, camera);
          if (score > bestScore) {
            bestScore = score;
            bestPost = post;
          }
        }
      }

      if (isDragging && hasRotatedEnough && bestPost) {
        setActivePost(bestPost);
      } else if (isDragging && hasRotatedEnough) {
        if (lastActiveId !== null) setActivePost(null);
      } else if (isDragging && lastActiveId !== null) {
        clearActivePost();
      } else if (lastActiveId !== null) {
        clearActivePost();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      baseMat.dispose();
      activeMat.dispose();
      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineLoop ||
          obj instanceof THREE.LineSegments
        ) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat !== baseMat && mat !== activeMat) mat.dispose();
        }
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="landing-share__globe-host"
      aria-label="Interactive globe of shared moments"
    />
  );
}
