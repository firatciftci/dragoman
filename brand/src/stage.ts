import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createStage(
  canvas: HTMLCanvasElement,
  {
    shadows = true,
    transparent = true,
  }: { shadows?: boolean; transparent?: boolean } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: transparent,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight("#fff1dc", 3.2);
  key.position.set(-2.2, 3.4, 3);
  key.castShadow = shadows;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.left = -3.5;
  key.shadow.camera.right = 3.5;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -1.5;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight("#9fb8ff", 2.4);
  rim.position.set(2.6, 2.2, -2.4);
  scene.add(rim);

  const bounce = new THREE.HemisphereLight("#fff6ea", "#5a3a2a", 0.55);
  scene.add(bounce);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };

  return { renderer, scene, camera, key, rim, ground, resize };
}
