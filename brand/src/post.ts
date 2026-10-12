import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.35,
    0.55,
    0.88,
  );
  composer.addPass(bloom);
  const tiltShader = {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0 },
      focus: { value: 0.5 },
      direction: { value: new THREE.Vector2(1, 0) },
      resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float focus; uniform vec2 direction; uniform vec2 resolution;
  varying vec2 vUv;
  void main() {
    float blur = amount * smoothstep(0.12, 0.5, abs(vUv.y - focus));
    vec2 step = direction / resolution * blur * (resolution.y / 1080.0);
    vec4 sum = vec4(0.0);
    float total = 0.0;
    for (int i = -6; i <= 6; i++) {
      float w = exp(-float(i * i) / 18.0);
      sum += texture2D(tDiffuse, vUv + step * float(i)) * w;
      total += w;
    }
    gl_FragColor = sum / total;
  }`,
  };
  const tiltH = new ShaderPass(tiltShader);
  const tiltV = new ShaderPass(tiltShader);
  tiltV.uniforms.direction = { value: new THREE.Vector2(0, 1) };
  composer.addPass(tiltH);
  composer.addPass(tiltV);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      vignette: { value: 0.35 },
      warmth: { value: 0 },
      tint: { value: new THREE.Color("#000000") },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float vignette; uniform float warmth; uniform vec3 tint;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 17.0) * 43758.5453); }
  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.rgb += vec3(0.035, 0.012, -0.03) * warmth;
    color.rgb = mix(color.rgb, color.rgb * tint * 2.0, length(tint) > 0.0 ? 0.35 : 0.0);
    float d = distance(vUv, vec2(0.5));
    color.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
    color.rgb += (hash(vUv * 1000.0) - 0.5) * 0.025;
    gl_FragColor = color;
  }`,
  });
  composer.addPass(grade);
  const gradeTime = uniform(grade, "time");
  const gradeWarmth = uniform(grade, "warmth");
  const gradeVignette = uniform(grade, "vignette");
  const tiltAmounts = [uniform(tiltH, "amount"), uniform(tiltV, "amount")];
  return {
    composer,
    bloom,
    gradeTime,
    gradeWarmth,
    gradeVignette,
    tiltAmounts,
  };
}

function uniform(pass: ShaderPass, name: string) {
  const found = pass.uniforms[name];
  if (found == null) throw new Error(`Missing uniform ${name}`);
  return found;
}
