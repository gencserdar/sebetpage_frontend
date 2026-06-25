import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { drawThreeGeo } from "./drawThreeGeo";
import getStarfield from "./getStarfield";

const LAND_URL = `${process.env.PUBLIC_URL ?? ""}/geojson/ne_110m_land.json`;

export default function ExploreGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let visible = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 120);
    camera.position.set(0, 0.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.72;

    const globeRadius = 2;
    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 0.18;
    scene.add(globeGroup);

    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(globeRadius, 42, 32), 1),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
      })
    );
    globeGroup.add(wire);
    scene.add(getStarfield({ numStars: 900 }));

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
          radius: globeRadius,
          materialOptions: { color: 0x697cf5, opacity: 0.78 },
        });
        globeGroup.add(land);
      })
      .catch(() => {
        /* land layer optional */
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
      globeGroup.rotation.y += 0.0008;
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
          else mat.dispose();
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
      aria-hidden
    />
  );
}
