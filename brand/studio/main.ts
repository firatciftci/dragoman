import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { Pose } from "#src/figure";
import { cast, figure } from "#src/figure";
import { createStage } from "#src/stage";

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (canvas == null) throw new Error("Missing canvas");
await document.fonts.load("92px 'Aref Ruqaa'");
const { renderer, scene, camera, ground, resize } = createStage(canvas);
const statue = new THREE.Group();
scene.add(statue);

const pieces: Array<ReturnType<typeof figure>> = [];
const poses: Record<
  string,
  Pose & { nod: number; tilt: number; lean: number }
> = {
  idle: { eyes: "open", arms: "hold", nod: 0, tilt: 0, lean: 0 },
  blink: { eyes: "closed", arms: "hold", nod: 0, tilt: 0, lean: 0 },
  happy: { eyes: "happy", arms: "wave", nod: -0.1, tilt: -0.14, lean: -0.08 },
  sleep: { eyes: "closed", arms: "hold", nod: 0.16, tilt: 0.34, lean: 0.06 },
  lift: { eyes: "open", arms: "up", nod: -0.16, tilt: 0.08, lean: -0.1 },
  read: { eyes: "open", arms: "hold", nod: 0.18, tilt: 0.1, lean: 0.06 },
};
const show = (name: string, pose?: string) => {
  statue.clear();
  statue.position.set(0, 0, 0);
  pieces.length = 0;
  const chosen = Object.entries(cast).filter(
    ([key]) => name === "all" || key === name,
  );
  for (const [i, [, character]] of chosen.entries()) {
    const posed = pose == null ? undefined : poses[pose];
    const piece = figure(character, posed);
    if (posed != null) {
      piece.base.removeFromParent();
      piece.neck.rotation.x += posed.nod;
      piece.neck.rotation.z += posed.tilt;
      piece.upper.rotation.x += posed.lean;
    }
    piece.position.x = i * 1.45;
    statue.add(piece);
    pieces.push(piece);
  }
  new THREE.Box3()
    .setFromObject(statue)
    .getCenter(statue.position)
    .multiplyScalar(-1)
    .setY(0);
  statue.updateMatrixWorld(true);
};
show(new URLSearchParams(location.search).get("character") ?? "all");

camera.position.set(-1.2, 1.9, 7.4);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.update();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ambient = new GTAOPass(scene, camera);
ambient.updateGtaoMaterial({
  radius: 0.12,
  distanceExponent: 1.5,
  thickness: 1,
  scale: 1,
});
ambient.blendIntensity = 0.85;
composer.addPass(ambient);
composer.addPass(new OutputPass());

const state = { isSpinning: false, isPaused: false };
for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
  button.addEventListener("click", () => {
    if (button.dataset.background != null)
      document.body.style.background = button.dataset.background;
    if (button.dataset.spin != null) state.isSpinning = !state.isSpinning;
  });
}

const fit = () => {
  resize();
  composer.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();
renderer.setAnimationLoop(() => {
  if (state.isPaused) return;
  if (state.isSpinning) statue.rotation.y += 0.01;
  controls.update();
  composer.render();
});

const shot = ({
  name,
  kind,
  width,
  height,
  background,
  pose,
}: {
  name: string;
  kind: "icon" | "portrait" | "figure" | "cast" | "pet";
  width: number;
  height: number;
  background?: string;
  pose?: string;
}) => {
  state.isPaused = true;
  show(kind === "cast" ? "all" : name, pose);
  const [piece] = pieces;
  const center = new THREE.Vector3();
  const box = new THREE.Box3().setFromObject(statue);
  const size = box.getSize(new THREE.Vector3());
  const direction = new THREE.Vector3(-0.42, 0.12, 1).normalize();
  let span = size.y * 1.08;
  if (kind === "pet") {
    statue.position.set(0, 0, 0);
    statue.updateMatrixWorld(true);
    center.set(0, 0.76, 0);
    direction.set(-0.3, 0.1, 1).normalize();
    span = 1.56;
  } else if (piece != null && (kind === "icon" || kind === "portrait")) {
    piece.head.getWorldPosition(center);
    center.add(new THREE.Vector3(0, kind === "icon" ? 0.13 : 0.07, 0.04));
    span = kind === "icon" ? 0.86 : 1.16;
  } else {
    box.getCenter(center);
    if (kind === "cast") {
      direction.set(-0.18, 0.16, 1).normalize();
      span = Math.max(size.y * 1.15, (size.x * 1.08 * height) / width);
    }
  }
  camera.aspect = width / height;
  camera.fov = 20;
  camera.updateProjectionMatrix();
  const distance =
    span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  ground.visible = kind === "figure" || kind === "cast";
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  if (background == null) {
    scene.background = null;
    renderer.setClearColor(0x00_00_00, 0);
    renderer.render(scene, camera);
  } else {
    scene.background = new THREE.Color(background);
    composer.setPixelRatio(1);
    composer.setSize(width, height);
    composer.render();
  }
  return canvas.toDataURL("image/png");
};

Object.assign(globalThis, {
  studio: { camera, controls, statue, renderer, shot },
});
