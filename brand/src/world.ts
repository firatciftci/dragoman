import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { noise, outline, paint, seeded, smoothstep, toon } from "./kit";

const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const STONE = "#ece0c6";
const LEAD = "#8e9cab";
const GOLD = "#e0ac3e";

function add(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | Array<THREE.Material>,
  parent: THREE.Object3D,
  position?: THREE.Vector3,
) {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  if (position != null) result.position.copy(position);
  parent.add(result);
  return result;
}

export function skyDome() {
  const uniforms = {
    top: { value: new THREE.Color("#2b4fb3") },
    middle: { value: new THREE.Color("#8fb4e8") },
    horizon: { value: new THREE.Color("#ffd9a8") },
    sun: { value: new THREE.Vector3(-0.8, 0.18, -0.3).normalize() },
    glow: { value: new THREE.Color("#ffb46b") },
    stars: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `uniform vec3 top; uniform vec3 middle; uniform vec3 horizon; uniform vec3 sun; uniform vec3 glow; uniform float stars;
varying vec3 vDirection;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  float h = vDirection.y;
  vec3 color = mix(horizon, middle, smoothstep(-0.02, 0.22, h));
  color = mix(color, top, smoothstep(0.2, 0.75, h));
  float facing = max(dot(vDirection, sun), 0.0);
  color += glow * (pow(facing, 18.0) * 0.55 + pow(facing, 600.0) * 2.5);
  vec3 cell = floor(vDirection * 260.0);
  float star = step(0.9965, hash(cell)) * smoothstep(0.05, 0.4, h);
  color += vec3(star) * stars;
  gl_FragColor = vec4(color, 1.0);
}`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), material);
  dome.renderOrder = -1;
  return { dome, uniforms };
}

const EXTENT = { x: -70, z: -75, size: 150 };

const LANDS: Array<Array<[number, number]>> = [
  [
    [-300, -30],
    [-38, -24],
    [-30, -17.5],
    [-22, -13.5],
    [-14, -9.6],
    [-7, -6.6],
    [-1, -5],
    [4, -3.6],
    [8, -2.4],
    [10.6, -1.2],
    [12.4, 0.6],
    [12.9, 2.6],
    [12.2, 5.2],
    [10.6, 8.2],
    [8.2, 11.4],
    [5, 13.8],
    [1, 15.2],
    [-5, 16.2],
    [-14, 17],
    [-24, 17.6],
    [-40, 18.6],
    [-300, 40],
  ],
  [
    [-300, -300],
    [-300, -30],
    [-38, -24],
    [-30, -21.5],
    [-22, -17.4],
    [-14, -13.4],
    [-7, -10.4],
    [-1, -8.8],
    [4, -7.6],
    [8, -6.4],
    [11.6, -5],
    [14.2, -3.4],
    [15.4, -6],
    [15.6, -12],
    [15, -20],
    [16.2, -30],
    [15.4, -42],
    [17, -300],
  ],
  [
    [21.5, -300],
    [22.2, -42],
    [21, -30],
    [22, -20],
    [21.4, -10],
    [20.2, -3],
    [20.6, 4],
    [21.8, 10],
    [21, 15],
    [23.4, 19],
    [28, 22],
    [40, 24.5],
    [80, 26],
    [300, 40],
    [300, -300],
  ],
  [
    [32, 42],
    [35, 41],
    [36.5, 43.5],
    [34, 45.5],
    [31.5, 44.5],
  ],
  [
    [39, 48],
    [42, 47.5],
    [43, 50],
    [40.5, 51.5],
    [38.5, 50],
  ],
];

function inside(polygon: Array<[number, number]>, x: number, z: number) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i] ?? [0, 0];
    const [xj, zj] = polygon[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      isInside = !isInside;
  }
  return isInside;
}

function segment(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = THREE.MathUtils.clamp(
    ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz),
    0,
    1,
  );
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

function coastDistance(x: number, z: number) {
  let best = Infinity;
  for (const polygon of LANDS) {
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[j] ?? [0, 0];
      const [bx, bz] = polygon[i] ?? [0, 0];
      best = Math.min(best, segment(x, z, ax, az, bx, bz));
    }
  }
  return best;
}

const isLand = (x: number, z: number) =>
  LANDS.some((polygon) => inside(polygon, x, z));

const HILLS: Array<[number, number, number, number]> = [
  [8.6, 2.4, 1.5, 3.4],
  [1.6, 1.8, 1.7, 3.6],
  [-3, -2.4, 2.1, 3.6],
  [-9, -1, 2.1, 4],
  [-15, -4.2, 1.9, 4.2],
  [-19.5, 2.5, 1.7, 4.6],
  [-12, 10.5, 1.5, 5],
  [-6.4, 0.4, -0.9, 1.7],
  [6, -12, 2.4, 5.4],
  [-4, -17, 1.8, 7],
  [31, -7, 4, 9],
  [27, 9, 1.8, 7],
  [34, 43.5, 1.2, 2],
  [40.5, 49.5, 1.3, 2.2],
];

const PALACE: [number, number] = [9.8, 1.8];
const SOPHIA: [number, number] = [5.4, 4.9];
const HIPPODROME: [number, number, number, number] = [-0.9, 6.5, -2.7, 10.5];
const QIBLA = -2.62;
const MOSQUES: Array<{
  x: number;
  z: number;
  scale: number;
  turn: number;
  minarets: 1 | 2 | 4 | 6;
  semis: 0 | 2 | 4;
  court: number;
  base?: string;
  style?: "classic" | "mihrimah";
}> = [
  {
    x: 2.8,
    z: 10.4,
    scale: 0.88,
    turn: -1.99,
    minarets: 6,
    semis: 4,
    court: 2,
    base: "#eee6d6",
  },
  {
    x: -3,
    z: 0.7,
    scale: 0.85,
    turn: QIBLA,
    minarets: 4,
    semis: 2,
    court: 1.8,
  },
  {
    x: -9.2,
    z: -1.4,
    scale: 0.82,
    turn: QIBLA,
    minarets: 2,
    semis: 4,
    court: 2.2,
  },
  {
    x: 5,
    z: 0.3,
    scale: 0.62,
    turn: QIBLA,
    minarets: 2,
    semis: 4,
    court: 2,
    base: "#efe4cc",
  },
  {
    x: -3.8,
    z: 5.5,
    scale: 0.6,
    turn: QIBLA,
    minarets: 2,
    semis: 2,
    court: 1.6,
  },
  { x: -14, z: -4.6, scale: 0.7, turn: QIBLA, minarets: 2, semis: 0, court: 2 },
  {
    x: -20.6,
    z: 2.2,
    scale: 0.62,
    turn: QIBLA,
    minarets: 1,
    semis: 0,
    court: 0,
    base: "#f1e3c8",
  },
  { x: 12.4, z: -7, scale: 0.55, turn: QIBLA, minarets: 1, semis: 2, court: 0 },
  { x: 24.4, z: 15, scale: 0.5, turn: QIBLA, minarets: 1, semis: 0, court: 0 },
  {
    x: 23.2,
    z: -0.5,
    scale: 0.55,
    turn: -1.92,
    minarets: 2,
    semis: 0,
    court: 0,
    style: "mihrimah",
  },
];
const AQUEDUCT: [number, number, number, number] = [-8.4, 0.9, -5.6, 0.6];
const WALL_X = -23.7;
const SILL: [number, number, number, number] = [
  9.8 - 1.6 + Math.sin(-0.47) * 0.705,
  1.8 + 1.45 + Math.cos(-0.47) * 0.705,
  Math.sin(-0.47),
  Math.cos(-0.47),
];
const corridor = (x: number, z: number) =>
  segment(
    x,
    z,
    SILL[0],
    SILL[1],
    SILL[0] + SILL[2] * 16,
    SILL[1] + SILL[3] * 16,
  );

const FLATS: Array<[number, number, number, number, number, number, number]> = [
  [PALACE[0], PALACE[1], 0, 0, 0, 2.5, 1.1],
  [SOPHIA[0], SOPHIA[1], 0, 0, 0, 1.7, 0.75],
  [-1.8, 8.5, 0, 0, 0, 1.7, 0.75],
  [1.6, 2.8, 0, 0, 0, 1.4, 0.6],
  ...MOSQUES.map(
    ({
      x,
      z,
      scale,
      turn,
      court,
      style,
    }): [number, number, number, number, number, number, number] => {
      const hall = court > 0 ? 1.5 : 1.15;
      const [shift, length, width] =
        style === "mihrimah"
          ? [0.55, 2.3, 1.7]
          : [(0.55 + court) / 2, (hall * 2 + 1.05 + court) / 2, hall + 0.25];
      return [
        x + Math.sin(turn) * shift * scale,
        z + Math.cos(turn) * shift * scale,
        turn,
        width * scale,
        length * scale,
        0.15,
        2.2,
      ];
    },
  ),
];

const raw = (x: number, z: number) => {
  let h = 0.35;
  for (const [cx, cz, peak, radius] of HILLS)
    h += peak * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / radius ** 2);
  return h + 0.12 * noise.noise(x * 0.15, z * 0.15);
};

const shoreline = (x: number, z: number) =>
  raw(x, z) * smoothstep(0, 2.4, coastDistance(x, z));
const LEVELS = FLATS.map(([cx, cz]) => shoreline(cx, cz));

function height(x: number, z: number) {
  if (!isLand(x, z)) return -0.4;
  let weight = 0;
  let level = 0;
  let strongest = 0;
  for (const [k, [cx, cz, turn, wide, long, radius, fade]] of FLATS.entries()) {
    const dx = x - cx;
    const dz = z - cz;
    const pull = smoothstep(
      radius + fade,
      radius,
      Math.hypot(
        Math.max(Math.abs(dx * Math.cos(turn) - dz * Math.sin(turn)) - wide, 0),
        Math.max(Math.abs(dx * Math.sin(turn) + dz * Math.cos(turn)) - long, 0),
      ),
    );
    weight += pull ** 6;
    level += pull ** 6 * (LEVELS[k] ?? 0);
    strongest = Math.max(strongest, pull);
  }
  const coast = coastDistance(x, z);
  const base = raw(x, z) * smoothstep(0, 2.4, coast);
  return (
    (weight > 0
      ? THREE.MathUtils.lerp(
          base,
          level / weight,
          strongest * smoothstep(0, 0.9, coast),
        )
      : base) + 0.05
  );
}

const CLEARINGS: Array<[number, number, number]> = [
  [PALACE[0], PALACE[1], 3.5],
  [11.2, 5.6, 1.9],
  [SOPHIA[0], SOPHIA[1], 2.3],
  [5.6, 7.8, 1.5],
  [25.4, 4.2, 3.2],
];

function urban(x: number, z: number) {
  if (!isLand(x, z)) return 0;
  for (const [cx, cz, radius] of CLEARINGS)
    if (Math.hypot(x - cx, z - cz) < radius) return 0;
  const peninsula = inside(LANDS[0] ?? [], x, z)
    ? smoothstep(WALL_X - 1, WALL_X + 1.2, x) *
      (0.72 + 0.28 * smoothstep(-20, -6, x))
    : 0;
  const pera =
    Math.exp(-((x - 7) ** 2 + (z + 11) ** 2) / 70) +
    Math.exp(-((x - 13.5) ** 2 + (z + 14) ** 2) / 30) * 0.7;
  const uskudar =
    Math.exp(-((x - 23.5) ** 2 + (z + 1) ** 2) / 36) +
    Math.exp(-((x - 25) ** 2 + (z - 16) ** 2) / 26) * 0.8;
  const shore =
    Math.exp(-coastDistance(x, z) / 1.4) *
    (Math.abs(x - 18.5) < 7 ? 0.6 : 0.15);
  return THREE.MathUtils.clamp(
    Math.max(peninsula, pera, uskudar, shore) +
      0.12 * noise.noise(x * 0.3, z * 0.3),
    0,
    1,
  );
}

function water(size: number) {
  const resolution = 384;
  const data = new Uint8Array(resolution * resolution);
  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const x = EXTENT.x + ((i + 0.5) / resolution) * EXTENT.size;
      const z = EXTENT.z + ((j + 0.5) / resolution) * EXTENT.size;
      data[j * resolution + i] = isLand(x, z)
        ? 0
        : Math.round(Math.min(1, coastDistance(x, z) / 3) * 255);
    }
  }
  const shore = new THREE.DataTexture(
    data,
    resolution,
    resolution,
    THREE.RedFormat,
  );
  shore.magFilter = THREE.LinearFilter;
  shore.minFilter = THREE.LinearFilter;
  shore.needsUpdate = true;
  const uniforms = {
    time: { value: 0 },
    deep: { value: new THREE.Color("#1d6a96") },
    shallow: { value: new THREE.Color("#3fb5bf") },
    shine: { value: new THREE.Color("#fff0c8") },
    foamColor: { value: new THREE.Color("#fffaeb") },
    shore: { value: shore },
    extent: { value: new THREE.Vector3(EXTENT.x, EXTENT.z, EXTENT.size) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      ...uniforms,
    },
    fog: true,
    vertexShader: `varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 shine; uniform vec3 foamColor; uniform sampler2D shore; uniform vec3 extent;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  vec2 uv = (p - extent.xy) / extent.z;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float coast = mix(1.0, texture2D(shore, uv).r, inside);
  float ripple = sin(p.x * 2.6 + sin(p.y * 0.7 + time * 0.4) * 1.6 + time * 0.9) * sin(p.y * 0.45 + sin(p.x * 0.3) * 2.0 - time * 0.3);
  float streak = sin(p.y * 6.0 + sin(p.x * 0.8 + time * 0.5) * 2.5);
  float band = smoothstep(0.7, 0.95, ripple) * smoothstep(0.55, 0.95, streak) * 0.9 * (1.0 - smoothstep(14.0, 40.0, vFogDepth));
  float swell = 0.5 + 0.5 * sin(vWorld.x * 0.08 + vWorld.z * 0.06);
  vec3 color = mix(deep, shallow, swell * 0.35 + (1.0 - smoothstep(0.02, 0.45, coast)) * 0.75);
  color = mix(color, shine, band * 0.5);
  float foam = 1.0 - smoothstep(0.025, 0.06, coast + 0.012 * sin(time * 1.6 + p.x * 3.1 + p.y * 2.3));
  color = mix(color, foamColor, foam * inside * 0.85);
  gl_FragColor = vec4(color, 1.0);
  #include <fog_fragment>
}`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = false;
  return { plane, uniforms };
}

function terrain(size: number, segments: number, drop: number) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(
    EXTENT.x + EXTENT.size / 2,
    -drop,
    EXTENT.z + EXTENT.size / 2,
  );
  const position = geometry.getAttribute("position");
  const colors: Array<number> = [];
  const sand = new THREE.Color("#ecd9a6");
  const grass = new THREE.Color("#8fbf5e");
  const meadow = new THREE.Color("#b9c96e");
  const paving = new THREE.Color("#ead7b0");
  const fields = [
    "#b8c96a",
    "#dcc47a",
    "#9cbd5c",
    "#cfba6c",
    "#a9c873",
    "#e2cf8a",
  ].map((hex) => new THREE.Color(hex));
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, height(x, z) - drop);
    const shore = smoothstep(0.15, 1.1, coastDistance(x, z));
    color
      .copy(grass)
      .lerp(meadow, 0.5 + 0.5 * noise.noise(x * 0.08 + 9, z * 0.08));
    if (x < WALL_X - 1.2 || x > 26 || z < -20) {
      const cell =
        Math.abs(
          Math.sin(
            Math.floor(x / 2.6) * 12.9898 + Math.floor(z / 1.9) * 78.233,
          ) * 43_758.5453,
        ) % 1;
      color.lerp(fields[Math.floor(cell * fields.length)] ?? meadow, 0.65);
    }
    const slope = Math.hypot(
      height(x + 0.25, z) - height(x - 0.25, z),
      height(x, z + 0.25) - height(x, z - 0.25),
    );
    color
      .lerp(
        paving,
        smoothstep(0.15, 0.55, urban(x, z)) *
          0.9 *
          (1 - smoothstep(0.32, 0.55, slope)),
      )
      .lerp(sand, 1 - shore);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = toon("#ffffff");
  material.vertexColors = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function dome(radius: number, squash = 0.86) {
  const geometry = new THREE.SphereGeometry(
    radius,
    40,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  geometry.scale(1, squash, 1);
  return geometry;
}

function minaret(
  parent: THREE.Object3D,
  x: number,
  z: number,
  tall: number,
  color = STONE,
  balconies = 2,
) {
  const stone = toon(color);
  const lead = toon(LEAD);
  add(
    new THREE.CylinderGeometry(0.13, 0.16, tall, 12),
    stone,
    parent,
    at(x, tall / 2, z),
  );
  const levels =
    [[0.74], [0.62, 0.84], [0.52, 0.69, 0.86]][balconies - 1] ?? [];
  for (const level of levels)
    add(
      new THREE.CylinderGeometry(0.24, 0.18, 0.1, 16),
      stone,
      parent,
      at(x, tall * level, z),
    );
  add(
    new THREE.ConeGeometry(0.16, 1.1, 12),
    lead,
    parent,
    at(x, tall + 0.55, z),
  );
  add(
    new THREE.SphereGeometry(0.05, 8, 6),
    toon(GOLD),
    parent,
    at(x, tall + 1.14, z),
  );
}

function halfDome(radius: number) {
  const geometry = new THREE.SphereGeometry(
    radius,
    28,
    10,
    0,
    Math.PI,
    0,
    Math.PI / 2,
  );
  geometry.scale(1, 0.86, 1);
  return geometry;
}

function mosque({
  x,
  z,
  scale,
  turn,
  minarets,
  semis,
  court,
  base = STONE,
  style = "classic",
}: (typeof MOSQUES)[number]) {
  const group = new THREE.Group();
  const wall = toon(base);
  const lead = toon(LEAD);
  const gold = toon(GOLD);
  const glass = new THREE.MeshBasicMaterial({ color: "#3a2a3a" });
  const fountain = (fx: number, fy: number, fz: number, size: number) => {
    add(
      new THREE.CylinderGeometry(size * 0.6, size * 0.66, size * 0.4, 8),
      wall,
      group,
      at(fx, fy + size * 0.2, fz),
    );
    add(
      new THREE.CylinderGeometry(size * 0.1, size * 0.1, size * 0.6, 8),
      wall,
      group,
      at(fx, fy + size * 0.7, fz),
    );
    add(
      new THREE.ConeGeometry(size, size * 0.42, 8),
      lead,
      group,
      at(fx, fy + size * 1.2, fz),
    );
    add(
      new THREE.ConeGeometry(size * 0.08, size * 0.3, 6),
      gold,
      group,
      at(fx, fy + size * 1.55, fz),
    );
  };
  const dimple = (radius: number, y: number, cx: number, cz: number) => {
    add(dome(radius, 0.9), lead, group, at(cx, y, cz));
    add(
      new THREE.ConeGeometry(radius * 0.16, radius * 0.6, 6),
      gold,
      group,
      at(cx, y + radius * 0.95, cz),
    );
  };
  const crown = (
    radius: number,
    y: number,
    cz: number,
    halves: Array<number>,
  ) => {
    add(
      new THREE.CylinderGeometry(radius, radius + 0.04, 0.36, 32),
      wall,
      group,
      at(0, y + 0.18, cz),
    );
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const pane = add(
        new THREE.BoxGeometry(0.07, 0.15, 0.03),
        glass,
        group,
        at(
          Math.sin(angle) * (radius + 0.005),
          y + 0.18,
          cz + Math.cos(angle) * (radius + 0.005),
        ),
      );
      pane.rotation.y = angle;
      pane.castShadow = false;
    }
    add(dome(radius * 1.06), lead, group, at(0, y + 0.36, cz));
    add(
      new THREE.ConeGeometry(0.05, 0.42, 8),
      gold,
      group,
      at(0, y + 0.36 + radius * 0.91 + 0.18, cz),
    );
    for (const angle of halves) {
      const half = add(
        halfDome(radius * 0.88),
        lead,
        group,
        at(
          Math.sin(angle) * radius * 0.5,
          y,
          cz + Math.cos(angle) * radius * 0.5,
        ),
      );
      half.rotation.y = angle;
    }
  };
  let footing: THREE.Mesh;
  if (style === "mihrimah") {
    footing = add(
      new THREE.BoxGeometry(3.4, 3.4, 4.6),
      toon("#d9c7a2"),
      group,
      at(0, -1.35, 0.55),
    );
    add(
      new THREE.BoxGeometry(3.5, 0.08, 4.7),
      toon("#c9b48c"),
      group,
      at(0, 0.36, 0.55),
    );
    add(new THREE.BoxGeometry(2.2, 1.1, 2.2), wall, group, at(0, 0.95, -0.4));
    crown(0.78, 1.5, -0.4, [Math.PI, Math.PI / 2, -Math.PI / 2]);
    for (const [cx, cz] of [
      [-0.92, -1.32],
      [0.92, -1.32],
      [-0.92, 0.52],
      [0.92, 0.52],
    ] as const) {
      add(
        new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8),
        wall,
        group,
        at(cx, 1.65, cz),
      );
      dimple(0.15, 1.8, cx, cz);
    }
    add(new THREE.BoxGeometry(2.2, 0.1, 0.62), wall, group, at(0, 1.12, 1.01));
    for (const cx of [-0.84, -0.42, 0, 0.42, 0.84])
      dimple(0.19, 1.17, cx, 1.01);
    for (const cx of [-1.05, -0.63, -0.21, 0.21, 0.63, 1.05])
      add(
        new THREE.CylinderGeometry(0.04, 0.045, 0.72, 8),
        wall,
        group,
        at(cx, 0.76, 1.28),
      );
    const eave = add(
      new THREE.BoxGeometry(3.1, 0.07, 0.86),
      lead,
      group,
      at(0, 0.98, 1.68),
    );
    eave.rotation.x = 0.3;
    for (const cx of [-1.4, -1, -0.6, -0.2, 0.2, 0.6, 1, 1.4])
      add(
        new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8),
        wall,
        group,
        at(cx, 0.65, 2.04),
      );
    fountain(0, 0.4, 2.55, 0.42);
    const raised = new THREE.Group();
    raised.position.y = 0.4;
    group.add(raised);
    for (const side of [-1, 1])
      minaret(raised, side * 1.22, 0.78, 3.3, STONE, 1);
  } else {
    const hall = court > 0 ? 1.5 : 1.15;
    const front = hall + 0.55;
    footing = add(
      new THREE.BoxGeometry(hall * 2 + 0.5, 2.6, hall + front + court + 0.5),
      toon("#dccaa6"),
      group,
      at(0, -1.2, (front + court - hall) / 2),
    );
    add(
      new THREE.BoxGeometry(hall * 2, 1.05, hall * 2),
      wall,
      group,
      at(0, 0.62, 0),
    );
    crown(
      hall * 0.7,
      1.15,
      0,
      semis === 4
        ? [0, Math.PI / 2, Math.PI, -Math.PI / 2]
        : semis === 2
          ? [0, Math.PI]
          : [],
    );
    for (const cx of [-1, 1])
      for (const cz of [-1, 1]) {
        add(
          new THREE.CylinderGeometry(0.2, 0.2, 0.28, 8),
          wall,
          group,
          at(cx * (hall - 0.24), 1.29, cz * (hall - 0.24)),
        );
        dimple(0.2, 1.43, cx * (hall - 0.24), cz * (hall - 0.24));
      }
    add(
      new THREE.BoxGeometry(hall * 2, 0.1, 0.55),
      wall,
      group,
      at(0, 0.8, hall + 0.27),
    );
    const bays = court > 0 ? 5 : 3;
    for (let i = 0; i < bays; i++)
      dimple(0.19, 0.85, -hall + (hall * 2 * (i + 0.5)) / bays, hall + 0.27);
    for (let i = 0; i <= bays; i++)
      add(
        new THREE.CylinderGeometry(0.04, 0.045, 0.7, 8),
        wall,
        group,
        at(-hall + 0.08 + ((hall * 2 - 0.16) * i) / bays, 0.45, hall + 0.5),
      );
    if (court > 0) {
      add(
        new THREE.BoxGeometry(hall * 2 - 0.9, 0.03, court - 0.45),
        toon("#f4ecdc"),
        group,
        at(0, 0.11, front + (court - 0.45) / 2),
      );
      for (const side of [-1, 1]) {
        add(
          new THREE.BoxGeometry(0.45, 0.42, court),
          wall,
          group,
          at(side * (hall - 0.22), 0.31, front + court / 2),
        );
        const count = Math.max(2, Math.round(court / 0.46));
        for (let i = 0; i < count; i++)
          dimple(
            0.17,
            0.52,
            side * (hall - 0.22),
            front + (court * (i + 0.5)) / count,
          );
      }
      add(
        new THREE.BoxGeometry(hall * 2 - 0.9, 0.42, 0.45),
        wall,
        group,
        at(0, 0.31, front + court - 0.22),
      );
      for (let i = 0; i < 4; i++)
        dimple(
          0.17,
          0.52,
          -hall + 0.45 + ((hall * 2 - 0.9) * (i + 0.5)) / 4,
          front + court - 0.22,
        );
      add(
        new THREE.BoxGeometry(0.5, 0.66, 0.52),
        wall,
        group,
        at(0, 0.43, front + court - 0.22),
      );
      fountain(0, 0.12, front + (court - 0.45) / 2, 0.3);
    }
    const spots: Array<[number, number, number, number]> =
      minarets === 1
        ? [[hall + 0.06, hall + 0.06, 3.6, 1]]
        : [
            [
              -hall - 0.08,
              hall + 0.08,
              minarets > 2 ? 4.9 : 4.3,
              minarets > 2 ? 3 : 2,
            ],
            [
              hall + 0.08,
              hall + 0.08,
              minarets > 2 ? 4.9 : 4.3,
              minarets > 2 ? 3 : 2,
            ],
          ];
    if (minarets === 6)
      spots.push(
        [-hall - 0.08, -hall - 0.08, 4.9, 3],
        [hall + 0.08, -hall - 0.08, 4.9, 3],
      );
    if (minarets >= 4)
      spots.push(
        [-hall + 0.1, front + court - 0.1, 4.1, 2],
        [hall - 0.1, front + court - 0.1, 4.1, 2],
      );
    for (const [mx, mz, tall, balconies] of spots)
      minaret(group, mx, mz, tall, STONE, balconies);
  }
  outline(group, 0.03);
  group.rotation.y = turn;
  group.scale.setScalar(scale);
  footing.geometry.computeBoundingBox();
  const box = footing.geometry.boundingBox ?? new THREE.Box3();
  let high = -Infinity;
  for (let i = 0; i <= 4; i++)
    for (let j = 0; j <= 4; j++) {
      const spot = at(
        THREE.MathUtils.lerp(box.min.x, box.max.x, i / 4),
        0,
        THREE.MathUtils.lerp(box.min.z, box.max.z, j / 4) + footing.position.z,
      )
        .applyEuler(group.rotation)
        .multiplyScalar(scale);
      high = Math.max(high, height(x + spot.x, z + spot.z));
    }
  group.position.set(x, high - 0.1 * scale, z);
  return group;
}

function hagiaSophia() {
  const group = new THREE.Group();
  const rose = toon("#e9a384");
  const lead = toon(LEAD);
  add(new THREE.BoxGeometry(3.4, 1.4, 3), rose, group, at(0, 0.7, 0));
  add(new THREE.BoxGeometry(2.3, 0.62, 2.3), rose, group, at(0, 1.7, 0));
  add(
    new THREE.CylinderGeometry(1.08, 1.14, 0.34, 40),
    rose,
    group,
    at(0, 2.15, 0),
  );
  const glass = new THREE.MeshBasicMaterial({ color: "#3a2a3a" });
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const pane = add(
      new THREE.BoxGeometry(0.08, 0.17, 0.04),
      glass,
      group,
      at(Math.sin(angle) * 1.12, 2.15, Math.cos(angle) * 1.12),
    );
    pane.rotation.y = angle;
    pane.castShadow = false;
  }
  add(dome(1.12, 0.48), lead, group, at(0, 2.32, 0));
  add(new THREE.ConeGeometry(0.05, 0.4, 8), toon(GOLD), group, at(0, 3.02, 0));
  for (const side of [-1, 1]) {
    const semi = add(dome(1.02, 0.6), lead, group, at(side * 1.15, 1.7, 0));
    semi.scale.set(0.7, 1, 1);
    for (const offset of [-0.78, 0.78])
      add(dome(0.42, 0.7), lead, group, at(side * 1.62, 1.4, offset));
    for (const offset of [-1.05, 1.05]) {
      const buttress = add(
        new THREE.BoxGeometry(0.5, 2.2, 0.62),
        rose,
        group,
        at(offset, 1.1, side * 1.62),
      );
      buttress.rotation.x = side * 0.06;
    }
  }
  for (const [mx, mz, tall, color] of [
    [-1.95, -1.75, 4.6, STONE],
    [1.95, -1.75, 4.6, STONE],
    [-1.95, 1.75, 4.4, STONE],
    [1.95, 1.75, 4.2, "#c0654a"],
  ] as const)
    minaret(group, mx, mz, tall, color);
  outline(group, 0.03);
  return group;
}

function flagTexture() {
  return paint(128, 84, (context) => {
    context.fillStyle = "#d02b20";
    context.fillRect(0, 0, 128, 84);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(50, 42, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d02b20";
    context.beginPath();
    context.arc(57, 42, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 : 4;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      context.lineTo(80 + Math.cos(angle) * r, 42 + Math.sin(angle) * r);
    }
    context.fill();
  });
}

function palace() {
  const group = new THREE.Group();
  const plaster = toon("#f6ecd8");
  const lead = toon(LEAD);
  const wood = toon("#7a4a2c");
  const flags: Array<THREE.Object3D> = [];
  const flagMaterial = new THREE.MeshToonMaterial({
    map: flagTexture(),
    side: THREE.DoubleSide,
  });
  const flag = (
    parent: THREE.Object3D,
    position: THREE.Vector3,
    size: number,
  ) => {
    const pole = new THREE.Group();
    pole.position.copy(position);
    parent.add(pole);
    add(
      new THREE.CylinderGeometry(0.015, 0.015, size * 1.4, 6),
      toon(GOLD),
      pole,
      at(0, size * 0.7, 0),
    );
    const cloth = add(
      new THREE.PlaneGeometry(size, size * 0.66, 6, 2),
      flagMaterial,
      pole,
      at(size / 2, size * 1.1, 0),
    );
    cloth.castShadow = false;
    flags.push(pole);
  };
  const kiosk = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    turn = 0,
  ) => {
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = turn;
    group.add(holder);
    add(new THREE.BoxGeometry(w, h, d), plaster, holder, at(0, h / 2, 0));
    for (let i = 0; i < Math.floor(w / 0.32); i++)
      add(
        new THREE.BoxGeometry(0.14, h * 0.45, 0.02),
        wood,
        holder,
        at(-w / 2 + 0.25 + i * 0.32, h * 0.5, d / 2 + 0.01),
      );
    const roof = add(
      new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, h * 0.5, 4),
      lead,
      holder,
      at(0, h + h * 0.25 + 0.02, 0),
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(
      (w / Math.hypot(w, d)) * 1.414,
      1,
      (d / Math.hypot(w, d)) * 1.414,
    );
  };
  kiosk(0.6, -0.8, 2.4, 1.6, 0.85);
  kiosk(2.1, 0.5, 1.5, 1.5, 0.7, 0.3);
  kiosk(2.6, -1.4, 1.2, 1.2, 0.6, -0.2);
  kiosk(-0.2, -2.2, 3, 1, 0.65);
  kiosk(1.4, 1.9, 1.1, 1.1, 0.6, 0.5);
  for (let i = 0; i < 7; i++) {
    const cx = -0.2 + i * 0.42;
    add(
      new THREE.CylinderGeometry(0.14, 0.17, 0.75, 10),
      plaster,
      group,
      at(cx, 0.38, 2.8),
    );
    add(dome(0.21), lead, group, at(cx, 0.76, 2.8));
    add(
      new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6),
      plaster,
      group,
      at(cx, 1.05, 2.8),
    );
  }
  const tower = new THREE.Group();
  tower.position.set(-1, 0, 0.4);
  group.add(tower);
  add(new THREE.BoxGeometry(0.9, 3.3, 0.9), plaster, tower, at(0, 1.65, 0));
  add(new THREE.BoxGeometry(1.05, 0.12, 1.05), plaster, tower, at(0, 2.6, 0));
  const glass = new THREE.MeshBasicMaterial({ color: "#2a1f3a" });
  for (const side of [0, 1, 2, 3]) {
    const angle = (side * Math.PI) / 2;
    for (const y of [2.05, 2.95]) {
      const pane = add(new THREE.PlaneGeometry(0.22, 0.36), glass, tower);
      pane.position.set(Math.sin(angle) * 0.452, y, Math.cos(angle) * 0.452);
      pane.rotation.y = angle;
    }
  }
  add(
    new THREE.CylinderGeometry(0.62, 0.62, 0.14, 8),
    lead,
    tower,
    at(0, 3.37, 0),
  );
  add(new THREE.ConeGeometry(0.6, 2.1, 8), lead, tower, at(0, 4.45, 0));
  add(new THREE.SphereGeometry(0.07, 10, 8), toon(GOLD), tower, at(0, 5.55, 0));
  flag(tower, at(0, 5.6, 0), 0.5);
  const gate = new THREE.Group();
  gate.position.set(-2.6, 0, -0.9);
  gate.rotation.y = 0.5;
  group.add(gate);
  add(new THREE.BoxGeometry(1.2, 0.9, 0.5), plaster, gate, at(0, 0.45, 0));
  for (const side of [-1, 1]) {
    add(
      new THREE.CylinderGeometry(0.3, 0.32, 1.5, 8),
      plaster,
      gate,
      at(side * 0.75, 0.75, 0),
    );
    add(
      new THREE.ConeGeometry(0.34, 0.9, 8),
      lead,
      gate,
      at(side * 0.75, 1.95, 0),
    );
    flag(gate, at(side * 0.75, 2.38, 0), 0.32);
  }
  const room = new THREE.Group();
  room.position.set(-1.6, 0, 1.45);
  room.rotation.y = -0.47;
  group.add(room);
  add(new THREE.BoxGeometry(2, 1.3, 1.4), plaster, room, at(0, 0.65, 0));
  const roof = add(
    new THREE.ConeGeometry(1.75, 0.6, 4),
    lead,
    room,
    at(0, 1.6, 0),
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.1, 1, 0.85);
  add(dome(0.32), lead, room, at(0, 1.86, 0));
  const glowMap = paint(128, 256, (context) => {
    const light = context.createRadialGradient(64, 150, 10, 64, 150, 150);
    light.addColorStop(0, "#fff1c4");
    light.addColorStop(0.6, "#ffc76a");
    light.addColorStop(1, "#d9822c");
    context.fillStyle = light;
    context.fillRect(0, 0, 128, 256);
    context.fillStyle = "rgba(90, 40, 20, 0.35)";
    context.beginPath();
    context.ellipse(44, 210, 18, 46, 0, 0, Math.PI * 2);
    context.ellipse(88, 214, 16, 42, 0, 0, Math.PI * 2);
    context.fill();
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ map: glowMap });
  const frameMaterial = toon("#5c3a22");
  const windowGlow = new THREE.Mesh(
    new THREE.ShapeGeometry(arch(0.36, 0.42)),
    glowMaterial,
  );
  windowGlow.position.set(0, 0.42, 0.705);
  room.add(windowGlow);
  for (const x of [-0.62, 0, 0.62]) {
    if (x !== 0) {
      const side = new THREE.Mesh(
        new THREE.ShapeGeometry(arch(0.28, 0.36)),
        glowMaterial,
      );
      side.position.set(x, 0.45, 0.705);
      room.add(side);
    }
    const width = x === 0 ? 0.36 : 0.28;
    const ring = new THREE.Shape();
    ring.setFromPoints(
      arch(width + 0.08, (x === 0 ? 0.42 : 0.36) + 0.04).getPoints(24),
    );
    ring.holes.push(
      new THREE.Path(
        arch(width, x === 0 ? 0.42 : 0.36)
          .getPoints(24)
          .toReversed(),
      ),
    );
    add(
      new THREE.ExtrudeGeometry(ring, { depth: 0.03, bevelEnabled: false }),
      frameMaterial,
      room,
      at(x, x === 0 ? 0.4 : 0.43, 0.7),
    );
    add(
      new THREE.BoxGeometry(0.02, 0.4, 0.02),
      frameMaterial,
      room,
      at(x, x === 0 ? 0.64 : 0.63, 0.715),
    );
  }
  add(
    new THREE.BoxGeometry(2.3, 0.08, 0.3),
    toon(STONE),
    room,
    at(0, 1.33, 0.7),
  );
  outline(group, 0.02);
  return { group, windowGlow, tower, flags };
}

function galata() {
  const group = new THREE.Group();
  add(
    new THREE.CylinderGeometry(0.75, 0.85, 4.2, 24),
    toon("#d8c7a6"),
    group,
    at(0, 2.1, 0),
  );
  add(
    new THREE.CylinderGeometry(0.95, 0.95, 0.16, 24),
    toon("#d8c7a6"),
    group,
    at(0, 4.1, 0),
  );
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const pane = add(
      new THREE.PlaneGeometry(0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: "#3a2a3a" }),
      group,
      at(Math.sin(angle) * 0.77, 3.7, Math.cos(angle) * 0.77),
    );
    pane.rotation.y = angle;
  }
  add(new THREE.ConeGeometry(0.88, 1.8, 24), toon(LEAD), group, at(0, 5.1, 0));
  add(new THREE.SphereGeometry(0.06, 8, 6), toon(GOLD), group, at(0, 6.05, 0));
  outline(group, 0.03);
  return group;
}

function maiden() {
  const group = new THREE.Group();
  add(
    new THREE.CylinderGeometry(0.88, 1.04, 0.4, 16),
    toon("#cbb994"),
    group,
    at(0, 0.1, 0),
  );
  add(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    toon("#f1e6cf"),
    group,
    at(0, 0.6, 0),
  );
  add(
    new THREE.CylinderGeometry(0.26, 0.26, 1.5, 12),
    toon("#f1e6cf"),
    group,
    at(0.15, 1.3, 0),
  );
  add(
    new THREE.ConeGeometry(0.3, 0.6, 12),
    toon(LEAD),
    group,
    at(0.15, 2.3, 0),
  );
  outline(group, 0.03);
  return group;
}

function hippodrome() {
  const group = new THREE.Group();
  const [ax, az, bx, bz] = HIPPODROME;
  const length = Math.hypot(bx - ax, bz - az);
  const cx = (ax + bx) / 2;
  const cz = (az + bz) / 2;
  group.position.set(cx, height(cx, cz) + 0.02, cz);
  group.rotation.y = Math.atan2(bx - ax, bz - az);
  const track = new THREE.Shape();
  track.absarc(0, -length / 2 + 0.75, 0.75, Math.PI, 0, true);
  track.absarc(0, length / 2 - 0.75, 0.75, 0, Math.PI, true);
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(track, 24),
    toon("#f1e2bf"),
  );
  floor.rotation.x = Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  add(
    new THREE.BoxGeometry(0.16, 0.06, length - 1.6),
    toon("#cdb88f"),
    group,
    at(0, 0.03, 0),
  );
  const granite = toon("#d98d78");
  add(
    new THREE.BoxGeometry(0.14, 1.3, 0.14),
    granite,
    group,
    at(0, 0.75, -0.9),
  );
  add(new THREE.ConeGeometry(0.1, 0.18, 4), granite, group, at(0, 1.49, -0.9));
  add(
    new THREE.BoxGeometry(0.16, 1.1, 0.16),
    toon("#b9a27e"),
    group,
    at(0, 0.65, 0.9),
  );
  add(
    new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8),
    toon("#8b6a3a"),
    group,
    at(0, 0.35, 0),
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const tree = add(
        new THREE.IcosahedronGeometry(0.22, 1),
        toon("#5f9a4c"),
        group,
        at(side * 0.95, 0.32, -length / 2 + 0.7 + i * ((length - 1.4) / 8)),
      );
      tree.scale.y = 1.2;
    }
  }
  outline(group, 0.015);
  return group;
}

function bazaar() {
  const group = new THREE.Group();
  group.position.set(1.6, height(1.6, 2.8) - 0.05, 2.8);
  group.rotation.y = 0.35;
  add(
    new THREE.BoxGeometry(2.4, 0.45, 3.2),
    toon("#e2cba2"),
    group,
    at(0, 0.22, 0),
  );
  const cap = dome(0.16, 0.9);
  const domes = new THREE.InstancedMesh(cap, toon(LEAD), 60);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 7; j++) {
      dummy.position.set(-0.92 + i * 0.46, 0.45, -1.38 + j * 0.46);
      dummy.updateMatrix();
      domes.setMatrixAt(index++, dummy.matrix);
    }
  }
  domes.count = index;
  domes.castShadow = true;
  group.add(domes);
  outline(group, 0.015);
  return group;
}

function aqueduct() {
  const group = new THREE.Group();
  const [ax, az, bx, bz] = AQUEDUCT;
  const length = Math.hypot(bx - ax, bz - az);
  const stone = toon("#d3b98f");
  let deck = 0;
  for (let s = 0; s <= length; s += 0.2)
    deck = Math.max(
      deck,
      height(ax + ((bx - ax) * s) / length, az + ((bz - az) * s) / length),
    );
  deck += 0.85;
  const angle = Math.atan2(bx - ax, bz - az);
  for (let s = 0; s <= length + 0.01; s += 0.36) {
    const x = ax + ((bx - ax) * s) / length;
    const z = az + ((bz - az) * s) / length;
    const ground = height(x, z) - 0.2;
    const pier = add(
      new THREE.BoxGeometry(0.3, deck - ground, 0.13),
      stone,
      group,
      at(x, (deck + ground) / 2, z),
    );
    pier.rotation.y = angle + Math.PI / 2;
  }
  for (const [y, thick] of [
    [deck, 0.18],
    [deck - 0.48, 0.09],
  ] as const) {
    const band = add(
      new THREE.BoxGeometry(0.3, thick, length),
      stone,
      group,
      at((ax + bx) / 2, y, (az + bz) / 2),
    );
    band.rotation.y = angle;
  }
  outline(group, 0.012);
  return group;
}

function ramparts(
  segments: Array<[number, number, number, number]>,
  tall: number,
  every: number,
) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const walls: Array<THREE.Matrix4> = [];
  const towers: Array<THREE.Matrix4> = [];
  const dummy = new THREE.Object3D();
  for (const [ax, az, bx, bz] of segments) {
    const length = Math.hypot(bx - ax, bz - az);
    const angle = Math.atan2(bx - ax, bz - az);
    const pieces = Math.max(1, Math.round(length / 0.9));
    for (let i = 0; i < pieces; i++) {
      const x = ax + ((bx - ax) * (i + 0.5)) / pieces;
      const z = az + ((bz - az) * (i + 0.5)) / pieces;
      dummy.position.set(x, height(x, z) - 0.2, z);
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(0.16, tall + 0.2, length / pieces + 0.04);
      dummy.updateMatrix();
      walls.push(dummy.matrix.clone());
    }
    for (let s = 0; s <= length; s += every) {
      const x = ax + ((bx - ax) * s) / length;
      const z = az + ((bz - az) * s) / length;
      dummy.position.set(x, height(x, z) - 0.2, z);
      dummy.scale.set(0.36, tall * 1.55 + 0.2, 0.36);
      dummy.updateMatrix();
      towers.push(dummy.matrix.clone());
    }
  }
  const group = new THREE.Group();
  for (const matrices of [walls, towers]) {
    const mesh = new THREE.InstancedMesh(box, toon("#dcc8a2"), matrices.length);
    for (const [i, matrix] of matrices.entries()) mesh.setMatrixAt(i, matrix);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function districts(
  random: () => number,
  isSolid: (x: number, z: number) => boolean,
) {
  const wall = new THREE.BoxGeometry(1, 1, 1);
  wall.translate(0, 0.5, 0);
  const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 0.5, 0);
  const facade = paint(128, 128, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "#e9e1d2";
    context.fillRect(0, 60, 128, 8);
    for (const y of [16, 78]) {
      for (const x of [18, 74]) {
        context.fillStyle = "#fff8ec";
        context.fillRect(x - 4, y - 4, 44, 40);
        context.fillStyle = "#4a3a36";
        context.fillRect(x, y, 36, 32);
        context.fillStyle = "#8a5a3c";
        context.fillRect(x + 16, y, 4, 32);
      }
    }
  });
  const sets = {
    walls: {
      geometry: wall,
      map: facade,
      matrices: [] as Array<THREE.Matrix4>,
      colors: [] as Array<THREE.Color>,
    },
    bays: {
      geometry: wall,
      map: facade,
      matrices: [] as Array<THREE.Matrix4>,
      colors: [] as Array<THREE.Color>,
    },
    roofs: {
      geometry: roof,
      map: null,
      matrices: [] as Array<THREE.Matrix4>,
      colors: [] as Array<THREE.Color>,
    },
  };
  const trees: Array<[number, number, number]> = [];
  const lights: Array<number> = [];
  const shrines: Array<[number, number, number]> = [];
  const palette = [
    "#f3d9a4",
    "#e9a46f",
    "#d9705a",
    "#f6ecd6",
    "#a9cdbb",
    "#e8a7a0",
    "#c4d6e4",
    "#f2c162",
    "#b4533f",
    "#e7cfa9",
    "#8fb7a5",
    "#f0b48c",
    "#d98f9c",
  ];
  const tiles = [
    "#c65a3a",
    "#d4704a",
    "#dd8456",
    "#c96748",
    "#e3a072",
    "#c98b5e",
    "#b9704d",
    "#d9a27a",
    "#e6b48a",
    "#9c5a44",
  ];
  const dummy = new THREE.Object3D();
  const house = (
    x: number,
    z: number,
    angle: number,
    w: number,
    d: number,
    h: number,
    wallColor: string,
    facing: number,
  ) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let y = Infinity;
    let top = -Infinity;
    for (let i = 0; i <= 4; i++)
      for (let j = 0; j <= 4; j++) {
        const u = (i / 4 - 0.5) * (w * 1.24 + 0.16);
        const v = (j / 4 - 0.5) * (d * 1.24 + 0.16);
        if (isSolid(x + u * cos + v * sin, z - u * sin + v * cos)) return;
        if ((i === 0 || i === 4) && (j === 0 || j === 4)) {
          const ground = height(x + u * cos + v * sin, z - u * sin + v * cos);
          y = Math.min(y, ground);
          top = Math.max(top, ground);
        }
      }
    if (top - y > 0.8) return;
    const rise = top - y;
    y -= 0.06;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(w, h + rise, d);
    dummy.updateMatrix();
    sets.walls.matrices.push(dummy.matrix.clone());
    sets.walls.colors.push(new THREE.Color(wallColor));
    if (random() < 0.45) {
      const offset = new THREE.Vector3(
        Math.sin(facing) * (d / 2 + 0.07),
        0,
        Math.cos(facing) * (d / 2 + 0.07),
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      dummy.position.set(x + offset.x, y + rise + h * 0.5, z + offset.z);
      dummy.rotation.set(0, angle + facing, 0);
      dummy.scale.set(w * 0.62, h * 0.42, 0.16);
      dummy.updateMatrix();
      sets.bays.matrices.push(dummy.matrix.clone());
      sets.bays.colors.push(new THREE.Color(wallColor));
    }
    dummy.position.set(x, y + rise + h, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(w * 1.24, 0.22 + random() * 0.14, d * 1.24);
    dummy.updateMatrix();
    sets.roofs.matrices.push(dummy.matrix.clone());
    sets.roofs.colors.push(
      new THREE.Color(
        random() < 0.04
          ? LEAD
          : (tiles[Math.floor(random() * tiles.length)] ?? "#c65a3a"),
      ),
    );
    if (random() < 0.55) {
      const front = new THREE.Vector3(
        Math.sin(facing) * (d / 2 + 0.05),
        0,
        Math.cos(facing) * (d / 2 + 0.05),
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      lights.push(x + front.x, y + rise + h * 0.5, z + front.z);
    }
  };
  const block = 2.8;
  const street = 0.36;
  for (let gx = -40; gx < 40; gx += 0.56) {
    for (let gz = -34; gz < 30; gz += 0.56) {
      const x = gx + (random() - 0.5) * 0.14;
      const z = gz + (random() - 0.5) * 0.14;
      const density = urban(x, z);
      if (density < 0.04 || random() > density * 1.08) continue;
      if (coastDistance(x, z) < (inside(LANDS[0] ?? [], x, z) ? 0.85 : 0.55))
        continue;
      if (
        segment(x, z, ...HIPPODROME) < 1.1 ||
        segment(x, z, ...AQUEDUCT) < 0.45 ||
        Math.abs(x - WALL_X) < 1.2
      )
        continue;
      const angle = 0.55 * noise.noise(x * 0.035 + 3, z * 0.035 - 2);
      const u =
        x * Math.cos(angle) -
        z * Math.sin(angle) +
        0.5 * noise.noise(x * 0.12, z * 0.12);
      const v =
        x * Math.sin(angle) +
        z * Math.cos(angle) +
        0.5 * noise.noise(x * 0.12 + 7, z * 0.12);
      const du = ((u % block) + block) % block;
      const dv = ((v % block) + block) % block;
      if (du < street || dv < street) continue;
      if (Math.floor(u / block) % 3 === 0 && du < street * 2.2) continue;
      const edges = [du - street, block - du, dv - street, block - dv];
      const edge = Math.min(...edges);
      if (edge > 0.7) {
        if (random() < 0.62) trees.push([x, z, random() < 0.3 ? 0 : 1]);
        else if (
          random() < 0.035 &&
          shrines.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > 3) &&
          [
            [0, 0],
            [0.5, 0.5],
            [-0.4, 0.4],
            [0.4, -0.4],
            [-0.4, -0.4],
          ].every(([u = 0, v = 0]) => !isSolid(x + u, z + v))
        )
          shrines.push([x, z, angle]);
        continue;
      }
      const facing =
        [Math.PI / 2, -Math.PI / 2, Math.PI, 0][edges.indexOf(edge)] ?? 0;
      const isMansion = random() < 0.1;
      house(
        x,
        z,
        -angle,
        0.5 + random() * 0.14,
        0.52 + random() * 0.16,
        isMansion ? 1.05 + random() * 0.25 : 0.55 + random() * 0.38,
        palette[Math.floor(random() * palette.length)] ?? "#f3d9a4",
        facing,
      );
    }
  }
  const yali = [
    "#8e3b2c",
    "#8e3b2c",
    "#a4483a",
    "#f2e6cc",
    "#e8c98e",
    "#c9d8d0",
  ];
  for (const polygon of [LANDS[1] ?? [], LANDS[2] ?? []]) {
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[j] ?? [0, 0];
      const [bx, bz] = polygon[i] ?? [0, 0];
      if (
        Math.min(ax, bx) < 13 ||
        Math.max(ax, bx) > 24 ||
        Math.max(az, bz) > 16 ||
        Math.min(az, bz) < -44
      )
        continue;
      const length = Math.hypot(bx - ax, bz - az);
      const angle = Math.atan2(bx - ax, bz - az);
      let normal = new THREE.Vector2(bz - az, -(bx - ax)).normalize();
      if (
        !isLand((ax + bx) / 2 + normal.x * 0.6, (az + bz) / 2 + normal.y * 0.6)
      )
        normal = normal.negate();
      for (let s = 0.5; s < length - 0.4; s += 0.8 + random() * 0.3) {
        if (random() < 0.2) continue;
        const x = ax + ((bx - ax) * s) / length + normal.x * 0.45;
        const z = az + ((bz - az) * s) / length + normal.y * 0.45;
        house(
          x,
          z,
          angle + Math.PI / 2,
          0.68,
          0.5,
          0.6 + random() * 0.25,
          yali[Math.floor(random() * yali.length)] ?? "#8e3b2c",
          Math.atan2(-normal.x, -normal.y) - angle - Math.PI / 2,
        );
      }
    }
  }
  const group = new THREE.Group();
  for (const set of Object.values(sets)) {
    const material = toon("#ffffff", set.map == null ? {} : { map: set.map });
    const mesh = new THREE.InstancedMesh(
      set.geometry,
      material,
      set.matrices.length,
    );
    for (const [i, matrix] of set.matrices.entries()) {
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, set.colors[i] ?? new THREE.Color("#ffffff"));
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const base = new THREE.BoxGeometry(0.7, 0.5, 0.7);
  base.translate(0, 0.25, 0);
  const cap = dome(0.3, 0.9);
  cap.translate(0, 0.5, 0);
  const shaft = new THREE.CylinderGeometry(0.05, 0.06, 1.7, 8);
  shaft.translate(0.42, 0.85, 0.42);
  const spire = new THREE.ConeGeometry(0.075, 0.38, 8);
  spire.translate(0.42, 1.89, 0.42);
  for (const [geometry, color] of [
    [base, STONE],
    [cap, LEAD],
    [shaft, STONE],
    [spire, LEAD],
  ] as const) {
    const mesh = new THREE.InstancedMesh(geometry, toon(color), shrines.length);
    for (const [i, [x, z, angle]] of shrines.entries()) {
      dummy.position.set(x, height(x, z) - 0.05, z);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.castShadow = true;
    group.add(mesh);
  }
  return { group, trees, lights };
}

function plants(
  random: () => number,
  courtyards: Array<[number, number, number]>,
  isSolid: (x: number, z: number) => boolean,
) {
  const cypress = new THREE.ConeGeometry(0.16, 1.3, 8);
  cypress.translate(0, 0.65, 0);
  const round = new THREE.IcosahedronGeometry(0.4, 1);
  round.translate(0, 0.52, 0);
  const sets: Array<[THREE.BufferGeometry, string, Array<THREE.Matrix4>]> = [
    [cypress, "#2f5a3c", []],
    [round, "#5f9a4c", []],
    [round, "#7fae54", []],
  ];
  const dummy = new THREE.Object3D();
  const plant = (x: number, z: number, kind: number) => {
    if (!isLand(x, z) || coastDistance(x, z) < 0.45) return;
    if (
      segment(x, z, ...HIPPODROME) < 0.9 ||
      corridor(x, z) < 1.6 ||
      [
        [0, 0],
        [0.3, 0],
        [-0.3, 0],
        [0, 0.3],
        [0, -0.3],
      ].some(([u = 0, v = 0]) => isSolid(x + u, z + v))
    )
      return;
    dummy.position.set(x, height(x, z) - 0.05, z);
    const s = 0.65 + random() * 0.6;
    dummy.scale.set(s, s * (kind === 0 ? 1 + random() * 0.7 : 1), s);
    dummy.rotation.y = random() * 6;
    dummy.updateMatrix();
    sets[kind]?.[2].push(dummy.matrix.clone());
  };
  for (const [x, z, kind] of courtyards)
    plant(x, z, kind === 0 ? 0 : random() < 0.5 ? 1 : 2);
  for (let i = 0; i < 5200; i++) {
    const x = -55 + random() * 115;
    const z = -55 + random() * 90;
    const slope = Math.hypot(
      height(x + 0.25, z) - height(x - 0.25, z),
      height(x, z + 0.25) - height(x, z - 0.25),
    );
    if (random() < urban(x, z) * 1.6 * (1 - smoothstep(0.32, 0.55, slope)))
      continue;
    if (i >= 2600 && slope < 0.32) continue;
    plant(x, z, random() < 0.35 ? 0 : random() < 0.5 ? 1 : 2);
  }
  for (const [cx, cz, radius, count] of [
    [25.4, 4.2, 3, 160],
    [-4.6, -0.2, 2.4, 22],
    [-10.6, 0.4, 2.2, 18],
    [PALACE[0], PALACE[1], 3.6, 60],
    [11.2, 5.6, 2, 26],
    [-26, 6, 4, 70],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const r = radius * Math.sqrt(random());
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      if (cx === PALACE[0] && r < 2.6 && random() < 0.8) continue;
      plant(x, z, random() < 0.7 ? 0 : 1);
    }
  }
  const group = new THREE.Group();
  for (const [geometry, color, matrices] of sets) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      toon(color),
      matrices.length,
    );
    for (const [i, matrix] of matrices.entries()) mesh.setMatrixAt(i, matrix);
    mesh.castShadow = true;
    group.add(mesh);
  }
  const bloom = new THREE.SphereGeometry(0.055, 6, 5);
  bloom.scale(1, 1.4, 1);
  const beds: Array<[number, number, number, number, number]> = [
    [10.3, 4.3, 1.6, 2.8, 0.9],
    [4.3, 7.4, 2.4, 1.1, -0.15],
    [6.9, 7.3, 1.3, 1, -0.2],
    [-0.9, 5.3, 1.1, 0.9, 0.4],
  ];
  const colors = [
    "#e0322a",
    "#f5c531",
    "#f07aa6",
    "#fff4e2",
    "#f08a2c",
    "#b03fa0",
  ];
  const tulips: Array<[THREE.Matrix4, THREE.Color]> = [];
  for (const [cx, cz, w, d, turn] of beds) {
    const rows = Math.floor(d / 0.16);
    for (let row = 0; row < rows; row++) {
      const color = new THREE.Color(
        colors[(row + Math.floor(cx)) % colors.length] ?? "#e0322a",
      );
      for (let k = 0; k < Math.floor(w / 0.11); k++) {
        const lx = -w / 2 + k * 0.11 + (random() - 0.5) * 0.03;
        const lz = -d / 2 + row * 0.16;
        const x = cx + lx * Math.cos(turn) + lz * Math.sin(turn);
        const z = cz - lx * Math.sin(turn) + lz * Math.cos(turn);
        dummy.position.set(x, height(x, z) + 0.05, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.85 + random() * 0.3);
        dummy.updateMatrix();
        tulips.push([dummy.matrix.clone(), color]);
      }
    }
  }
  const flowers = new THREE.InstancedMesh(
    bloom,
    toon("#ffffff"),
    tulips.length,
  );
  for (const [i, [matrix, color]] of tulips.entries()) {
    flowers.setMatrixAt(i, matrix);
    flowers.setColorAt(i, color);
  }
  group.add(flowers);
  return group;
}

function caique(color: string, hasCanopy: boolean) {
  const group = new THREE.Group();
  const hull = new THREE.CapsuleGeometry(0.12, 1.1, 6, 12);
  hull.rotateZ(Math.PI / 2);
  hull.scale(1, 0.7, 1);
  add(hull, toon(color), group, at(0, 0.04, 0));
  add(
    new THREE.BoxGeometry(1, 0.03, 0.18),
    toon("#e9d3a8"),
    group,
    at(0, 0.12, 0),
  );
  if (hasCanopy) {
    add(
      new THREE.BoxGeometry(0.4, 0.02, 0.26),
      toon("#c8321f"),
      group,
      at(-0.2, 0.32, 0),
    );
    for (const x of [-0.38, -0.02]) {
      add(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4),
        toon("#5a3a22"),
        group,
        at(x, 0.22, 0.1),
      );
      add(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4),
        toon("#5a3a22"),
        group,
        at(x, 0.22, -0.1),
      );
    }
  }
  for (const side of [-1, 1]) {
    const oar = add(
      new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4),
      toon("#5a3a22"),
      group,
      at(0.15, 0.08, side * 0.24),
    );
    oar.rotation.x = side * 1.2;
  }
  outline(group, 0.012);
  return group;
}

function ship(flagMaterial: THREE.Material) {
  const group = new THREE.Group();
  const hull = new THREE.CapsuleGeometry(0.3, 1.8, 6, 12);
  hull.rotateZ(Math.PI / 2);
  hull.scale(1, 0.75, 0.9);
  add(hull, toon("#6b3f24"), group, at(0, 0.12, 0));
  add(
    new THREE.BoxGeometry(2, 0.05, 0.45),
    toon("#c9a26a"),
    group,
    at(0, 0.36, 0),
  );
  add(
    new THREE.BoxGeometry(0.5, 0.3, 0.46),
    toon("#8a5232"),
    group,
    at(-0.8, 0.5, 0),
  );
  for (const [x, tall] of [
    [-0.45, 1.8],
    [0.45, 2.2],
  ] as const) {
    add(
      new THREE.CylinderGeometry(0.025, 0.03, tall, 6),
      toon("#5a3a22"),
      group,
      at(x, 0.36 + tall / 2, 0),
    );
    const sail = new THREE.PlaneGeometry(0.8, tall * 0.6, 8, 8);
    const position = sail.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i) / 0.4;
      const v = position.getY(i) / (tall * 0.3);
      position.setZ(i, 0.12 * (1 - u * u) * (1 - 0.3 * v * v));
    }
    sail.computeVertexNormals();
    const cloth = add(
      sail,
      toon("#f6f1e6", { side: THREE.DoubleSide }),
      group,
      at(x, 0.36 + tall * 0.55, 0.04),
    );
    cloth.rotation.y = Math.PI / 2;
  }
  const pennant = add(
    new THREE.PlaneGeometry(0.42, 0.26),
    flagMaterial,
    group,
    at(0.66, 2.75, 0),
  );
  pennant.castShadow = false;
  outline(group, 0.015);
  return group;
}

function gull() {
  const group = new THREE.Group();
  const white = toon("#fbfaf6", { side: THREE.DoubleSide });
  const body = new THREE.SphereGeometry(0.09, 12, 8);
  body.scale(1, 0.8, 2.2);
  add(body, white, group);
  const wings: Array<THREE.Group> = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.05 * side, 0.02, 0);
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.08);
    shape.lineTo(0.42 * side, -0.02);
    shape.lineTo(0.5 * side, 0.03);
    shape.lineTo(0, 0.1);
    const wing = new THREE.ShapeGeometry(shape);
    wing.rotateX(Math.PI / 2);
    add(wing, white, pivot);
    const tip = new THREE.ShapeGeometry(
      new THREE.Shape([
        new THREE.Vector2(0.38 * side, -0.03),
        new THREE.Vector2(0.5 * side, 0.03),
        new THREE.Vector2(0.42 * side, 0.05),
      ]),
    );
    tip.rotateX(Math.PI / 2);
    tip.translate(0, 0.002, 0);
    add(tip, toon("#2a2f3a", { side: THREE.DoubleSide }), pivot);
    group.add(pivot);
    wings.push(pivot);
  }
  const beak = add(
    new THREE.ConeGeometry(0.02, 0.08, 6),
    toon("#f0b23a"),
    group,
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.z = 0.23;
  return Object.assign(group, { wings });
}

function cloud(random: () => number, width: number) {
  const parts: Array<THREE.BufferGeometry> = [];
  const count = 7 + Math.floor(random() * 5);
  for (let i = 0; i < count; i++) {
    const r = (0.5 + random() * 0.6) * width * 0.3;
    const piece = new THREE.IcosahedronGeometry(r, 3);
    piece.translate(
      (random() - 0.5) * width,
      r * 0.35 + random() * width * 0.1,
      (random() - 0.5) * width * 0.45,
    );
    parts.push(piece);
  }
  const flat = new THREE.CylinderGeometry(
    width * 0.5,
    width * 0.45,
    width * 0.12,
    24,
  );
  flat.scale(1, 1, 0.5);
  parts.push(flat);
  const geometry = mergeGeometries(
    parts.map((part) => (part.index == null ? part : part.toNonIndexed())),
  );
  const material = toon("#ffffff");
  material.emissive = new THREE.Color("#ffe9d2");
  material.emissiveIntensity = 0.12;
  return new THREE.Mesh(geometry, material);
}

function travel(
  points: Array<[number, number]>,
  distance: number,
  offset: number,
) {
  const lengths = points
    .slice(1)
    .map((point, i) =>
      Math.hypot(
        point[0] - (points[i]?.[0] ?? 0),
        point[1] - (points[i]?.[1] ?? 0),
      ),
    );
  let total = 0;
  for (const length of lengths) total += length;
  let s = ((distance % total) + total) % total;
  for (const [i, length] of lengths.entries()) {
    const [ax, az] = points[i] ?? [0, 0];
    const [bx, bz] = points[i + 1] ?? [0, 0];
    if (s <= length) {
      const k = s / length;
      const nx = (bz - az) / length;
      const nz = -(bx - ax) / length;
      return [
        ax + (bx - ax) * k + nx * offset,
        az + (bz - az) * k + nz * offset,
      ] as const;
    }
    s -= length;
  }
  return points[0] ?? [0, 0];
}

export function buildCity() {
  const random = seeded(42);
  const group = new THREE.Group();
  const { plane, uniforms: waterUniforms } = water(600);
  const sophia = hagiaSophia();
  sophia.position.set(SOPHIA[0], height(SOPHIA[0], SOPHIA[1]) - 0.1, SOPHIA[1]);
  sophia.rotation.set(0, 0.12, 0);
  sophia.scale.setScalar(0.95);
  const court = palace();
  court.group.position.set(
    PALACE[0],
    height(PALACE[0], PALACE[1]) - 0.05,
    PALACE[1],
  );
  const tower = galata();
  tower.position.set(6.4, height(6.4, -10.4) - 0.1, -10.4);
  const maidenTower = maiden();
  maidenTower.position.set(19, 0, 3.6);
  const landmarks = [
    sophia,
    ...MOSQUES.map((entry) => mosque(entry)),
    hippodrome(),
    bazaar(),
    aqueduct(),
    court.group,
    tower,
    maidenTower,
  ];
  const CELL = 0.08;
  const columns = Math.ceil(120 / CELL);
  const rows = Math.ceil(96 / CELL);
  const solid = new Uint8Array(columns * rows);
  const corner = new THREE.Vector3();
  for (const landmark of landmarks) {
    landmark.updateMatrixWorld(true);
    landmark.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || part instanceof THREE.InstancedMesh)
        return;
      const { geometry } = part as THREE.Mesh;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (box == null) return;
      const points: Array<[number, number]> = [];
      for (const cx of [box.min.x, box.max.x])
        for (const cy of [box.min.y, box.max.y])
          for (const cz of [box.min.z, box.max.z]) {
            corner.set(cx, cy, cz).applyMatrix4(part.matrixWorld);
            points.push([corner.x, corner.z]);
          }
      points.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const hull: Array<[number, number]> = [];
      for (const pass of [points, points.toReversed()]) {
        const start = hull.length;
        for (const point of pass) {
          while (hull.length >= start + 2) {
            const [ax, az] = hull.at(-2) ?? [0, 0];
            const [bx, bz] = hull.at(-1) ?? [0, 0];
            if ((bx - ax) * (point[1] - az) > (bz - az) * (point[0] - ax))
              break;
            hull.pop();
          }
          hull.push(point);
        }
        hull.pop();
      }
      const xs = hull.map(([hx]) => hx);
      const zs = hull.map(([, hz]) => hz);
      for (
        let i = Math.floor((Math.min(...xs) + 56) / CELL);
        i <= Math.ceil((Math.max(...xs) + 56) / CELL);
        i++
      )
        for (
          let j = Math.floor((Math.min(...zs) + 56) / CELL);
          j <= Math.ceil((Math.max(...zs) + 56) / CELL);
          j++
        ) {
          if (i < 0 || j < 0 || i >= columns || j >= rows) continue;
          const px = i * CELL - 56;
          const pz = j * CELL - 56;
          if (
            hull.every(([ax, az], k) => {
              const [bx, bz] = hull[(k + 1) % hull.length] ?? [0, 0];
              return (bx - ax) * (pz - az) - (bz - az) * (px - ax) >= -1e-6;
            })
          )
            solid[j * columns + i] = 1;
        }
    });
  }
  for (const [step, span] of [
    [1, columns],
    [columns, rows],
  ] as const) {
    const source = [...solid];
    for (let k = 0; k < solid.length; k++) {
      if (source[k] === 1) continue;
      const along = step === 1 ? k % columns : Math.floor(k / columns);
      for (let r = -2; r <= 2; r++)
        if (along + r >= 0 && along + r < span && source[k + r * step] === 1) {
          solid[k] = 1;
          break;
        }
    }
  }
  const isSolid = (x: number, z: number) => {
    const i = Math.round((x + 56) / CELL);
    const j = Math.round((z + 56) / CELL);
    return i >= 0 && j >= 0 && i < columns && j < rows
      ? solid[j * columns + i] === 1
      : false;
  };
  const town = districts(random, isSolid);
  group.add(
    plane,
    terrain(EXTENT.size, 600, 0),
    terrain(640, 160, 0.12),
    town.group,
    plants(random, town.trees, isSolid),
    ...landmarks,
  );
  const seaWalls: Array<[number, number, number, number]> = [];
  const peninsula = LANDS[0] ?? [];
  for (let i = 0, j = peninsula.length - 1; i < peninsula.length; j = i++) {
    const [ax, az] = peninsula[j] ?? [0, 0];
    const [bx, bz] = peninsula[i] ?? [0, 0];
    if (Math.min(ax, bx) < WALL_X) continue;
    let normal = new THREE.Vector2(bz - az, -(bx - ax)).normalize();
    if (!isLand((ax + bx) / 2 + normal.x * 0.6, (az + bz) / 2 + normal.y * 0.6))
      normal = normal.negate();
    seaWalls.push([
      ax + normal.x * 0.5,
      az + normal.y * 0.5,
      bx + normal.x * 0.5,
      bz + normal.y * 0.5,
    ]);
  }
  const landWalls: Array<[number, number, number, number]> = [];
  for (const shift of [0, -0.65]) {
    for (let z = -14.6; z < 17.4; z += 1.6)
      landWalls.push([
        WALL_X + shift + 0.4 * Math.sin(z * 0.2),
        z,
        WALL_X + shift + 0.4 * Math.sin((z + 1.6) * 0.2),
        z + 1.6,
      ]);
  }
  const galataWalls: Array<[number, number, number, number]> = [];
  const galataLine: Array<[number, number]> = [
    [2.2, -8.4],
    [3.4, -11.6],
    [5.8, -13.2],
    [8.6, -11.8],
    [10.2, -8.6],
    [11, -6],
  ];
  for (let i = 1; i < galataLine.length; i++)
    galataWalls.push([
      ...(galataLine[i - 1] ?? [0, 0]),
      ...(galataLine[i] ?? [0, 0]),
    ]);
  group.add(
    ramparts(seaWalls, 0.42, 2.2),
    ramparts(landWalls, 0.7, 1.6),
    ramparts(galataWalls, 0.45, 1.8),
  );
  const flagMaterial = new THREE.MeshToonMaterial({
    map: flagTexture(),
    side: THREE.DoubleSide,
  });
  const goldenHorn: Array<[number, number]> = [
    [13.6, -2],
    [10, -3.7],
    [5, -5.5],
    [0, -6.8],
    [-6, -8.5],
    [-12, -11.3],
    [-18, -14.8],
    [-26, -18.9],
  ];
  const bosphorus: Array<[number, number]> = [
    [17.6, 34],
    [17.2, 14],
    [16.4, 4],
    [17.8, -6],
    [18.4, -20],
    [18.6, -34],
    [19, -60],
  ];
  const marmara: Array<[number, number]> = [
    [-50, 25],
    [-10, 22],
    [10, 19.5],
    [30, 30],
    [60, 34],
  ];
  const ferry: Array<[number, number]> = [
    [13.8, 1.2],
    [19.6, -0.4],
    [13.8, 1.2],
  ];
  const boats: Array<{
    mesh: THREE.Object3D;
    path: (t: number) => readonly [number, number];
  }> = [];
  for (let i = 0; i < 22; i++) {
    const speed = (0.3 + random() * 0.35) * (i % 2 === 0 ? 1 : -1);
    const offset = (random() - 0.5) * 2;
    const phase = random() * 60;
    boats.push({
      mesh: caique(
        ["#7d4a2a", "#3f6f8a", "#8a3a2a", "#2e5a4a", "#c9883a"][i % 5] ??
          "#7d4a2a",
        i % 3 !== 0,
      ),
      path: (t) => travel(goldenHorn, phase + t * speed, offset),
    });
  }
  for (let i = 0; i < 8; i++) {
    const phase = random() * 12;
    const offset = (random() - 0.5) * 3;
    boats.push({
      mesh: caique(["#3f6f8a", "#8a3a2a"][i % 2] ?? "#3f6f8a", true),
      path: (t) => travel(ferry, phase + t * 0.32, offset),
    });
  }
  for (let i = 0; i < 6; i++) {
    const speed = (0.4 + random() * 0.3) * (i % 2 === 0 ? 1 : -1);
    const offset = (random() - 0.5) * 2.4;
    const phase = random() * 90;
    const mesh = ship(flagMaterial);
    mesh.scale.setScalar(0.85);
    boats.push({
      mesh,
      path: (t) =>
        travel(i < 3 ? bosphorus : marmara, phase + t * speed, offset),
    });
  }
  for (let i = 0; i < 8; i++) {
    const speed = (0.35 + random() * 0.3) * (i % 2 === 0 ? 1 : -1);
    const offset = (random() - 0.5) * 3;
    const phase = random() * 90;
    boats.push({
      mesh: caique("#7d4a2a", i % 2 === 0),
      path: (t) =>
        travel(i < 5 ? bosphorus : marmara, phase + t * speed, offset),
    });
  }
  for (const boat of boats) group.add(boat.mesh);
  const gulls: Array<ReturnType<typeof gull>> = [];
  for (let i = 0; i < 20; i++) {
    const bird = gull();
    bird.scale.setScalar(1.4);
    group.add(bird);
    gulls.push(bird);
  }
  const clouds: Array<THREE.Mesh> = [];
  for (let i = 0; i < 30; i++) {
    const piece = cloud(random, 7 + random() * 10);
    const angle = random() * Math.PI * 2;
    const distance = 22 + random() * 85;
    piece.position.set(
      Math.cos(angle) * distance + 2,
      28 + random() * 14,
      Math.sin(angle) * distance + 6,
    );
    if (
      new THREE.Line3(at(-30, 34, 66), at(-4, 10, 26))
        .closestPointToPoint(piece.position, true, new THREE.Vector3())
        .distanceTo(piece.position) < 16
    )
      continue;
    piece.rotation.y = random() * 6;
    group.add(piece);
    clouds.push(piece);
  }
  for (const [x, y, z, width] of [
    [-52, 26, 44, 16],
    [-6, 34, 64, 12],
    [-40, 20, 24, 14],
  ] as const) {
    const piece = cloud(random, width);
    piece.position.set(x, y, z);
    group.add(piece);
    clouds.push(piece);
  }
  const lightGeometry = new THREE.BufferGeometry();
  lightGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(town.lights, 3),
  );
  const reaches: Array<number> = [];
  for (let i = 0; i < town.lights.length; i += 3)
    reaches.push(
      Math.hypot(
        (town.lights[i] ?? 0) - SILL[0],
        (town.lights[i + 2] ?? 0) - SILL[1],
      ),
    );
  lightGeometry.setAttribute(
    "reach",
    new THREE.Float32BufferAttribute(reaches, 1),
  );
  const lightUniforms = {
    wave: { value: 0 },
    night: { value: 0 },
    scale: { value: 540 },
  };
  const lightMaterial = new THREE.ShaderMaterial({
    uniforms: lightUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float reach;
uniform float wave; uniform float night; uniform float scale;
varying float vGlow;
void main() {
  float since = wave - reach;
  float lit = smoothstep(0.0, 1.2, since);
  float pop = since > 0.0 ? exp(-since * 0.35) : 0.0;
  vGlow = night * 0.25 * (1.0 - lit) + lit * night * 1.3 + pop * 1.8;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vGlow > 0.001 ? scale * (0.9 + 2.6 * pop) / -mv.z : 0.0;
}`,
    fragmentShader: `varying float vGlow;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = exp(-d * d * 18.0) * smoothstep(0.5, 0.35, d);
  gl_FragColor = vec4(vec3(1.0, 0.77, 0.42) * core * vGlow, core * vGlow);
}`,
  });
  const lightPoints = new THREE.Points(lightGeometry, lightMaterial);
  lightPoints.frustumCulled = false;
  group.add(lightPoints);
  const flags = [...court.flags];
  for (const boat of boats)
    boat.mesh.traverse((part) => {
      if (part instanceof THREE.Mesh && part.material === flagMaterial)
        flags.push(part);
    });
  const update = (time: number, dusk: number, wave = 0) => {
    lightUniforms.wave.value = wave;
    lightUniforms.scale.value = innerHeight / 2;
    waterUniforms.time.value = time;
    waterUniforms.deep.value
      .set("#1d6a96")
      .lerp(new THREE.Color("#1b2550"), dusk);
    waterUniforms.shallow.value
      .set("#3fb5bf")
      .lerp(new THREE.Color("#4a4a86"), dusk);
    waterUniforms.shine.value
      .set("#fff0c8")
      .lerp(new THREE.Color("#ffb070"), dusk);
    waterUniforms.foamColor.value
      .set("#fffaeb")
      .lerp(new THREE.Color("#7d7fb8"), smoothstep(0.5, 1, dusk));
    for (const { mesh, path } of boats) {
      const [x, z] = path(time);
      const [nx, nz] = path(time + 0.2);
      mesh.position.set(x, Math.sin(time * 2 + x) * 0.02, z);
      if (Math.hypot(nx - x, nz - z) > 1e-4)
        mesh.rotation.y = Math.atan2(nx - x, nz - z) - Math.PI / 2;
      mesh.rotation.z = Math.sin(time * 1.6 + z) * 0.04;
    }
    for (const [i, flag] of flags.entries())
      flag.rotation.y = Math.sin(time * 2.4 + i * 1.3) * 0.35;
    for (const [i, bird] of gulls.entries()) {
      const radius = 2.5 + (i % 5) * 1.4;
      const speed = 0.2 + (i % 3) * 0.05;
      const angle = time * speed * (i % 2 === 0 ? 1 : -1) + i * 1.7;
      const cx = [3, 6, 9, 0, 7][i % 5] ?? 0;
      const cz = [13, 7, 1, 9, 11][i % 5] ?? 0;
      const y = 5 + (i % 4) * 1.8 + Math.sin(time * 0.7 + i) * 0.6;
      bird.position.set(
        cx + Math.cos(angle) * radius,
        y,
        cz + Math.sin(angle) * radius,
      );
      const direction = i % 2 === 0 ? 1 : -1;
      bird.rotation.set(
        0,
        -angle - (Math.PI / 2) * direction + Math.PI,
        direction * 0.35,
      );
      const flap = Math.sin(time * 9 + i * 2) * 0.55;
      const [left, right] = bird.wings;
      if (left != null) left.rotation.z = -flap;
      if (right != null) right.rotation.z = flap;
    }
    lightUniforms.night.value = smoothstep(0.35, 0.9, dusk);
    for (const piece of clouds) {
      const material = piece.material as THREE.MeshToonMaterial;
      material.color
        .set("#ffffff")
        .lerp(new THREE.Color("#c9a0c8"), dusk * 0.8);
      material.emissive.set("#ffe9d2").lerp(new THREE.Color("#ff9b6a"), dusk);
    }
  };
  return { group, update, court, gulls, lights: town.lights };
}

function arch(width: number, tall: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, tall - width / 2);
  shape.quadraticCurveTo(
    -width / 2,
    tall + width * 0.05,
    0,
    tall + width * 0.25,
  );
  shape.quadraticCurveTo(
    width / 2,
    tall + width * 0.05,
    width / 2,
    tall - width / 2,
  );
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, 0);
  return shape;
}
