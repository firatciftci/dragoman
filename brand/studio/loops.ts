import * as THREE from "three";
import { createPost } from "#src/post";
import { buildCity, skyDome } from "#src/world";

const query = new URLSearchParams(location.search);
const isNight = query.get("shot") === "night";
const vector = (name: string, fallback: [number, number, number]) => {
  const [x = 0, y = 0, z = 0] =
    query.get(name)?.split(",").map(Number) ?? fallback;
  return new THREE.Vector3(x, y, z);
};
const center = vector("look", isNight ? [4, 5.5, 2] : [4, 2, 2]);
const base = vector("from", isNight ? [26, 7, 30] : [30, 14, 34]);
const fov = Number(query.get("fov") ?? (isNight ? 34 : 36));
const drift = Number(query.get("drift") ?? 2.2);

const canvas = document.querySelector("canvas");
if (canvas == null) throw new Error("Missing canvas");
const FPS = 30;
const LENGTH = 16;
const OVERLAP = 2;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  fov,
  innerWidth / innerHeight,
  0.05,
  900,
);
const sky = skyDome();
scene.add(sky.dome);
const city = buildCity();
scene.add(city.group);
const sun = new THREE.DirectionalLight("#ffd6a6", 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, {
  left: -40,
  right: 40,
  top: 40,
  bottom: -40,
  near: 1,
  far: 260,
});
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
sun.target.position.set(4, 0, 4);
const fill = new THREE.HemisphereLight("#cfe0ff", "#a07a50", 1.25);
city.group.add(sun, sun.target, fill);

const dusk = isNight ? 1 : Number(query.get("dusk") ?? 0.45);
const night = isNight ? 1 : dusk * 0.6;
const mix = (from: string, to: string, amount: number) =>
  new THREE.Color(from).lerp(new THREE.Color(to), amount);
sky.uniforms.top.value.copy(
  mix("#2b4fb3", isNight ? "#070b26" : "#1b1f5a", night),
);
sky.uniforms.middle.value.copy(
  mix("#8fb4e8", isNight ? "#1a2257" : "#6a4f9a", night),
);
sky.uniforms.horizon.value.copy(
  mix("#ffd9a8", isNight ? "#4a2f6a" : "#ff9a62", night),
);
sky.uniforms.glow.value.copy(
  mix("#ffb46b", isNight ? "#2a1640" : "#ff7a4a", night),
);
sky.uniforms.stars.value = isNight ? 1 : 0;
const sunDirection = new THREE.Vector3(
  THREE.MathUtils.lerp(-0.55, -0.75, dusk),
  isNight ? 0.35 : THREE.MathUtils.lerp(0.5, 0.1, dusk),
  0.65,
).normalize();
sky.uniforms.sun.value.copy(sunDirection);
sun.position.copy(sun.target.position).addScaledVector(sunDirection, 120);
sun.color.copy(
  isNight ? new THREE.Color("#7f8fd8") : mix("#ffd6a6", "#ff8a5a", dusk),
);
sun.intensity = isNight ? 0.7 : THREE.MathUtils.lerp(3.1, 1.4, dusk);
fill.color.copy(
  isNight ? new THREE.Color("#5566b8") : new THREE.Color("#cfe0ff"),
);
fill.groundColor.copy(
  isNight ? new THREE.Color("#2a1a3a") : new THREE.Color("#a07a50"),
);
fill.intensity = 1.25;
scene.fog = new THREE.Fog(
  isNight ? new THREE.Color("#1c1a44") : mix("#f2d3ac", "#c98a6a", dusk * 0.6),
  isNight ? 40 : 70,
  isNight ? 220 : 320,
);

const clouds: Array<THREE.MeshToonMaterial> = [];
const windows = city.group.children.find(
  (part): part is THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> =>
    part instanceof THREE.Points &&
    part.material instanceof THREE.ShaderMaterial,
)?.material.uniforms.scale;
city.update(0, dusk);
city.group.traverse((part) => {
  if (
    part instanceof THREE.Mesh &&
    part.material instanceof THREE.MeshToonMaterial &&
    part.material.emissive.getHexString() ===
      new THREE.Color("#ffe9d2")
        .lerp(new THREE.Color("#ff9b6a"), dusk)
        .getHexString()
  )
    clouds.push(part.material);
});
for (const gull of city.gulls) gull.visible = !isNight;

const { composer, bloom, gradeWarmth, gradeVignette, tiltAmounts } = createPost(
  renderer,
  scene,
  camera,
);
bloom.strength = isNight ? 1.1 : 0.45;
bloom.threshold = isNight ? 0.78 : 0.88;
gradeWarmth.value = isNight ? 0.2 : 0.8;
gradeVignette.value = isNight ? 0.5 : 0.32;
for (const amount of tiltAmounts) amount.value = 1.1;

const frame = (t: number) => {
  const phase = (t / LENGTH) * Math.PI * 2;
  camera.position
    .copy(base)
    .add(
      new THREE.Vector3(
        Math.sin(phase) * drift,
        Math.sin(phase * 2) * drift * 0.18,
        Math.cos(phase) * drift * 0.6 - drift * 0.6,
      ),
    );
  camera.lookAt(
    center
      .clone()
      .add(new THREE.Vector3(Math.sin(phase + 0.6) * drift * 0.25, 0, 0)),
  );
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < innerHeight ? fov * 1.45 : fov;
  camera.updateProjectionMatrix();
  sky.dome.position.copy(camera.position);
  city.update(t, dusk, 1000);
  if (windows != null) windows.value = innerHeight * (isNight ? 1.1 : 0.5);
  if (isNight)
    for (const material of clouds) {
      material.color.set("#39407e");
      material.emissive.set("#1b2052");
    }
  composer.render();
  return true;
};

Object.assign(globalThis, {
  loop: { frame, fps: FPS, length: LENGTH, overlap: OVERLAP },
});
frame(Number(query.get("t") ?? 0));
