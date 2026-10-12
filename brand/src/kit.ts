import * as THREE from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

export function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export const noise = new SimplexNoise({ random: seeded(7) });

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const rounded =
  (radius: number, power = 0.4) =>
  (t: number) =>
    radius * Math.sin(Math.PI * t) ** power;

function build(
  positions: Array<number>,
  uvs: Array<number>,
  indices: Array<number>,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function revolve(
  control: Array<[number, number]>,
  {
    rows = 96,
    segments = 112,
    depth = 1,
    gap,
    shape,
  }: {
    rows?: number;
    segments?: number;
    depth?: number;
    gap?: (v: number) => number;
    shape?: (phi: number, v: number, radius: number, y: number) => number;
  } = {},
) {
  const profile = new THREE.SplineCurve(
    control.map(([r, y]) => new THREE.Vector2(r, y)),
  ).getSpacedPoints(rows - 1);
  const isClosed = gap == null;
  const columns = isClosed ? segments : segments + 1;
  const positions: Array<number> = [];
  const uvs: Array<number> = [];
  const indices: Array<number> = [];
  const edges: Array<Array<THREE.Vector3>> = [[], []];
  for (const [i, point] of profile.entries()) {
    const v = i / (rows - 1);
    const half = gap?.(v) ?? 0;
    for (let j = 0; j < columns; j++) {
      const phi = half + (j / segments) * (Math.PI * 2 - 2 * half);
      const radius = shape?.(phi, v, point.x, point.y) ?? point.x;
      const vertex = new THREE.Vector3(
        radius * Math.sin(phi),
        point.y,
        radius * Math.cos(phi) * depth,
      );
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(phi * point.x, point.y);
      if (!isClosed && j === 0) edges[0]?.push(vertex);
      if (!isClosed && j === columns - 1) edges[1]?.push(vertex);
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * columns + j;
      const b = i * columns + ((j + 1) % columns);
      indices.push(a, b, a + columns, b, b + columns, a + columns);
    }
  }
  return Object.assign(build(positions, uvs, indices), { edges });
}

export function sweep(
  points: Array<THREE.Vector3>,
  radius: (t: number) => number,
  {
    tubular = 40,
    radial = 18,
    deform,
  }: {
    tubular?: number;
    radial?: number;
    deform?: (
      vertex: THREE.Vector3,
      t: number,
      direction: THREE.Vector3,
    ) => void;
  } = {},
) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const { normals, binormals } = curve.computeFrenetFrames(tubular, false);
  const positions: Array<number> = [];
  const uvs: Array<number> = [];
  const indices: Array<number> = [];
  const center = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (const [i, normal] of normals.entries()) {
    const t = i / tubular;
    const binormal = binormals[i] ?? normal;
    curve.getPointAt(t, center);
    const r = radius(t);
    for (let j = 0; j < radial; j++) {
      const angle = (j / radial) * Math.PI * 2;
      direction
        .copy(normal)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(binormal, Math.sin(angle));
      vertex.copy(center).addScaledVector(direction, r);
      deform?.(vertex, t, direction);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(j / radial, t * curve.getLength());
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      indices.push(a, b, a + radial, b, b + radial, a + radial);
    }
  }
  return build(positions, uvs, indices);
}

export function displace(
  geometry: THREE.BufferGeometry,
  offset: (vertex: THREE.Vector3, normal: THREE.Vector3) => number,
) {
  const position = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    normal.fromBufferAttribute(normals, i);
    vertex.addScaledVector(normal, offset(vertex, normal));
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function paint(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context == null) throw new Error("Canvas 2D is unavailable");
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function stripes(colors: Array<string>, widths: Array<number>) {
  let total = 0;
  for (const width of widths) total += width;
  return paint(256, 4, (context) => {
    let x = 0;
    for (const [i, width] of widths.entries()) {
      context.fillStyle = colors[i % colors.length] ?? "#fff";
      context.fillRect((x / total) * 256, 0, (width / total) * 256 + 1, 4);
      x += width;
    }
  });
}

const ramp = new THREE.DataTexture(
  new Uint8Array([110, 172, 224, 255]),
  4,
  1,
  THREE.RedFormat,
);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

export function toon(
  color: THREE.ColorRepresentation,
  {
    map,
    side,
    ink,
  }: {
    map?: THREE.Texture;
    side?: THREE.Side;
    ink?: THREE.ColorRepresentation;
  } = {},
) {
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: ramp,
    ...(map != null && { map }),
    ...(side != null && { side }),
  });
  material.userData.ink = new THREE.Color(ink ?? color).lerp(
    new THREE.Color("#1a0f12"),
    ink == null ? 0.62 : 0,
  );
  return material;
}

export function outline(root: THREE.Object3D, thickness = 0.005) {
  root.updateMatrixWorld(true);
  const objects: Array<THREE.Object3D> = [];
  const scale = new THREE.Vector3();
  root.traverse((object) => {
    objects.push(object);
  });
  for (const object of objects) {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      object.userData.isBare === true
    )
      continue;
    const source: unknown = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    const ink =
      source instanceof THREE.Material &&
      source.userData.ink instanceof THREE.Color
        ? source.userData.ink
        : new THREE.Color("#2a1a14");
    object.getWorldScale(scale);
    const material = new THREE.MeshBasicMaterial({
      color: ink,
      side: THREE.BackSide,
    });
    const offset = thickness / Math.max(scale.x, scale.y, scale.z);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.thickness = { value: offset };
      shader.vertexShader = `uniform float thickness;\n${shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * thickness;")}`;
    };
    const hull = new THREE.Mesh(object.geometry, material);
    hull.userData.isBare = true;
    object.add(hull);
  }
}
