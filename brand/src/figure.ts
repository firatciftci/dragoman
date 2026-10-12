import * as THREE from "three";
import {
  displace,
  noise,
  outline,
  paint,
  revolve,
  rounded,
  seeded,
  smoothstep,
  stripes,
  sweep,
  toon,
} from "./kit";

const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const WAIST = 0.42;
const BEND = 0.2;
const GOLD = "#e0ac3e";

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
) {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function joint(parent: THREE.Object3D, origin: THREE.Vector3) {
  const pivot = new THREE.Group();
  pivot.position.copy(origin);
  const rest = new THREE.Group();
  rest.position.copy(origin).negate();
  pivot.add(rest);
  parent.add(pivot);
  return { pivot, rest };
}

function bow(geometry: THREE.BufferGeometry, angle: number) {
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) - WAIST;
    const z = position.getZ(i);
    const a = angle * smoothstep(0, BEND, y);
    position.setXYZ(
      i,
      position.getX(i),
      WAIST + y * Math.cos(a) - z * Math.sin(a),
      y * Math.sin(a) + z * Math.cos(a),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function pattern(
  kind: "cintemani" | "floral" | "tulip",
  base: string,
  motif: string,
  width: number,
  height: number,
) {
  return paint(width, height, (context) => {
    const random = seeded(width + height);
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = motif;
    context.strokeStyle = motif;
    context.lineWidth = 5;
    context.lineCap = "round";
    for (let row = 0; row < Math.ceil(height / 116); row++) {
      for (let column = 0; column < width / 128; column++) {
        const x = column * 128 + (row % 2) * 64 + 64;
        const y = row * 116 + 40;
        switch (kind) {
          case "cintemani": {
            for (const [dx, dy] of [
              [-14, -10],
              [14, -10],
              [0, 12],
            ] as const) {
              context.beginPath();
              context.arc(x + dx, y + dy, 9, 0, Math.PI * 2);
              context.fill();
            }
            for (const offset of [34, 48]) {
              context.beginPath();
              context.moveTo(x - 28, y + offset);
              context.bezierCurveTo(
                x - 12,
                y + offset - 10,
                x + 2,
                y + offset + 10,
                x + 28,
                y + offset - 2,
              );
              context.stroke();
            }

            break;
          }
          case "tulip": {
            context.beginPath();
            context.moveTo(x, y + 40);
            context.quadraticCurveTo(x + 6, y + 20, x, y);
            context.stroke();
            for (const lean of [-1, 0, 1]) {
              context.beginPath();
              context.ellipse(
                x + lean * 9,
                y - 6,
                7,
                20,
                lean * 0.35,
                0,
                Math.PI * 2,
              );
              context.fill();
            }
            context.beginPath();
            context.ellipse(x - 12, y + 26, 4, 12, -0.9, 0, Math.PI * 2);
            context.fill();

            break;
          }
          case "floral": {
            const cx = x + (random() - 0.5) * 30;
            const cy = y + (random() - 0.5) * 30;
            context.fillStyle = "#4f8a5b";
            for (const turn of [0.6, 3.6]) {
              context.beginPath();
              context.ellipse(
                cx + Math.cos(turn) * 20,
                cy + Math.sin(turn) * 20,
                5,
                12,
                turn + Math.PI / 2,
                0,
                Math.PI * 2,
              );
              context.fill();
            }
            context.fillStyle = random() > 0.5 ? "#e07a95" : "#4a6fc0";
            for (let petal = 0; petal < 5; petal++) {
              const turn = (petal / 5) * Math.PI * 2;
              context.beginPath();
              context.arc(
                cx + Math.cos(turn) * 9,
                cy + Math.sin(turn) * 9,
                8,
                0,
                Math.PI * 2,
              );
              context.fill();
            }
            context.fillStyle = "#e9b949";
            context.beginPath();
            context.arc(cx, cy, 5, 0, Math.PI * 2);
            context.fill();

            break;
          }
          // No default
        }
      }
    }
  });
}

function robeTexture(
  kind: "cintemani" | "floral" | "tulip",
  base: string,
  motif: string,
) {
  const texture = pattern(kind, base, motif, 512, 800);
  const context = texture.image.getContext("2d");
  if (context != null) {
    context.fillStyle = "#e0ac3e";
    context.fillRect(0, 800 - 34, 512, 22);
    context.fillRect(0, 800 - 46, 512, 5);
  }
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2.2, 1 / 0.8);
  return texture;
}

function documentTexture() {
  return paint(640, 900, (context) => {
    const random = seeded(11);
    context.fillStyle = "#efe2c2";
    context.fillRect(0, 0, 640, 900);
    for (let i = 0; i < 260; i++) {
      context.fillStyle = `rgba(150, 110, 60, ${random() * 0.05})`;
      context.beginPath();
      context.arc(
        random() * 640,
        random() * 900,
        10 + random() * 60,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.strokeStyle = "#b08a3c";
    context.lineWidth = 6;
    context.strokeRect(34, 34, 572, 832);
    context.lineWidth = 2;
    context.strokeRect(48, 48, 544, 804);
    context.direction = "rtl";
    context.textAlign = "center";
    context.fillStyle = "#1a2050";
    context.font = "92px 'Aref Ruqaa', 'Noto Nastaliq Urdu', serif";
    context.fillText("ترجمان", 320, 200);
    context.font = "40px 'Aref Ruqaa', 'Noto Naskh Arabic', serif";
    context.fillText("بو ورقه ترجمه اولنمشدر", 320, 290);
    context.fillText("دیل بیلن آدم ایكی آدم", 320, 350);
    context.strokeStyle = "#c8402c";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(150, 410);
    context.bezierCurveTo(260, 380, 380, 440, 490, 410);
    context.stroke();
    context.direction = "ltr";
    context.fillStyle = "rgba(26, 32, 80, 0.85)";
    context.font = "italic 38px 'IBM Plex Serif', Georgia, serif";
    context.fillText("This page has", 320, 500);
    context.fillText("been translated.", 320, 548);
    context.fillStyle = "rgba(26, 32, 80, 0.28)";
    for (const [i, width] of [440, 470, 400, 455, 300].entries())
      context.fillRect(320 - width / 2, 610 + i * 34, width, 9);
    context.fillStyle = "#b8321f";
    context.beginPath();
    context.arc(480, 790, 44, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#efe2c2";
    context.font = "30px 'Aref Ruqaa', serif";
    context.direction = "rtl";
    context.fillText("مهر", 480, 800);
  });
}

export type Character = {
  seed: number;
  bow: number;
  isSlim: boolean;
  skin: string;
  hair: string;
  robe: {
    pattern: "cintemani" | "floral" | "tulip";
    base: string;
    motif: string;
    lining: string;
  };
  under: Array<string>;
  sash: Array<string>;
  slippers: string;
  face: "elder" | "youth" | "woman" | "sage" | "neutral";
  headwear: "kalpak" | "cap" | "hotoz" | "scarf" | "kavuk" | "kallavi" | "bork";
  crown: string;
  holds: "document" | "clasped" | "pen";
};

export const cast = {
  grand: {
    seed: 3,
    bow: 0.18,
    isSlim: false,
    skin: "#dcae8a",
    hair: "#3a2214",
    robe: {
      pattern: "cintemani",
      base: "#c8321f",
      motif: "#efc56e",
      lining: "#2347a8",
    },
    under: ["#f6f5ef", "#2347a8", "#f6f5ef", "#1e9c94", "#f6f5ef", "#2347a8"],
    sash: ["#d9a43b", "#18204a", "#d9a43b", "#f6f5ef", "#1e9c94", "#f6f5ef"],
    slippers: "#e3a92b",
    face: "elder",
    headwear: "kalpak",
    crown: "#6b4528",
    holds: "document",
  },
  envoy: {
    seed: 17,
    bow: 0.14,
    isSlim: false,
    skin: "#e0b48f",
    hair: "#b7b0a6",
    robe: {
      pattern: "tulip",
      base: "#18204a",
      motif: "#d9a43b",
      lining: "#c8321f",
    },
    under: ["#f6f5ef", "#c8321f", "#f6f5ef", "#d9a43b", "#f6f5ef", "#c8321f"],
    sash: ["#d9a43b", "#2347a8", "#d9a43b", "#f6f5ef", "#c8321f", "#f6f5ef"],
    slippers: "#d9a43b",
    face: "sage",
    headwear: "hotoz",
    crown: "#2347a8",
    holds: "document",
  },
  apprentice: {
    seed: 5,
    bow: 0.04,
    isSlim: false,
    skin: "#e3bb98",
    hair: "#2a1a10",
    robe: {
      pattern: "floral",
      base: "#f6f2e8",
      motif: "#e07a95",
      lining: "#e07a95",
    },
    under: ["#f2c4cf", "#e07a95", "#f2c4cf", "#d9a43b", "#f2c4cf", "#e07a95"],
    sash: ["#d9a43b", "#b8862c", "#d9a43b", "#f0d38a", "#d9a43b", "#b8862c"],
    slippers: "#c8321f",
    face: "youth",
    headwear: "cap",
    crown: "#e8b244",
    holds: "clasped",
  },
  scholar: {
    seed: 21,
    bow: 0.08,
    isSlim: false,
    skin: "#b98260",
    hair: "#1f140d",
    robe: {
      pattern: "floral",
      base: "#d9a43b",
      motif: "#18204a",
      lining: "#1e9c94",
    },
    under: ["#f6f5ef", "#1e9c94", "#f6f5ef", "#2347a8", "#f6f5ef", "#1e9c94"],
    sash: ["#1e9c94", "#f6f5ef", "#1e9c94", "#c8321f", "#1e9c94", "#f6f5ef"],
    slippers: "#1e9c94",
    face: "neutral",
    headwear: "cap",
    crown: "#1e9c94",
    holds: "pen",
  },
  kira: {
    seed: 9,
    bow: 0.06,
    isSlim: true,
    skin: "#d9a47e",
    hair: "#24160e",
    robe: {
      pattern: "tulip",
      base: "#1e9c94",
      motif: "#f6f0e2",
      lining: "#c8321f",
    },
    under: ["#f6f5ef", "#c8321f", "#f6f5ef", "#d9a43b", "#f6f5ef", "#c8321f"],
    sash: ["#c8321f", "#d9a43b", "#c8321f", "#f6f5ef", "#d9a43b", "#f6f5ef"],
    slippers: "#d9a43b",
    face: "woman",
    headwear: "hotoz",
    crown: "#d13a26",
    holds: "clasped",
  },
  calligrapher: {
    seed: 13,
    bow: 0.12,
    isSlim: true,
    skin: "#c48d66",
    hair: "#1c120b",
    robe: {
      pattern: "cintemani",
      base: "#2347a8",
      motif: "#f6f0e2",
      lining: "#1e9c94",
    },
    under: ["#f6f5ef", "#1e9c94", "#f6f5ef", "#d9a43b", "#f6f5ef", "#1e9c94"],
    sash: ["#c8321f", "#f6f5ef", "#c8321f", "#d9a43b", "#c8321f", "#f6f5ef"],
    slippers: "#c8321f",
    face: "woman",
    headwear: "scarf",
    crown: "#f0c6cc",
    holds: "pen",
  },
} satisfies Record<string, Character>;

export function plinth() {
  const top = paint(1024, 1024, (context) => {
    context.fillStyle = "#f6f5ef";
    context.fillRect(0, 0, 1024, 1024);
    context.translate(512, 512);
    context.strokeStyle = "#2347a8";
    context.lineWidth = 40;
    context.beginPath();
    context.arc(0, 0, 466, 0, Math.PI * 2);
    context.stroke();
    for (let i = 0; i < 12; i++) {
      context.save();
      context.rotate((i / 12) * Math.PI * 2);
      context.fillStyle = i % 2 === 0 ? "#2347a8" : "#1e9c94";
      context.beginPath();
      context.moveTo(0, -200);
      context.bezierCurveTo(-70, -280, -50, -370, 0, -420);
      context.bezierCurveTo(50, -370, 70, -280, 0, -200);
      context.fill();
      context.restore();
    }
  });
  top.wrapS = THREE.ClampToEdgeWrapping;
  top.wrapT = THREE.ClampToEdgeWrapping;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.05, 64), [
    toon("#2347a8"),
    toon("#ffffff", { map: top, ink: "#18204a" }),
    toon("#18204a"),
  ]);
  base.position.y = 0.025;
  base.castShadow = true;
  base.receiveShadow = true;
  return base;
}

const headwear: Record<
  Character["headwear"],
  (parts: {
    head: THREE.Group;
    hair: THREE.Material;
    crown: string;
    random: () => number;
  }) => void
> = {
  kalpak({ head, crown }) {
    const control: Array<[number, number]> = [
      [0.158, 0.085],
      [0.163, 0.14],
      [0.176, 0.22],
      [0.198, 0.31],
      [0.207, 0.35],
      [0.19, 0.368],
      [0.165, 0.364],
    ];
    const fur = toon(crown, { ink: "#2a160a" });
    mesh(
      revolve(control, {
        rows: 64,
        segments: 144,
        shape: (phi, v, radius) =>
          radius +
          0.016 *
            Math.abs(Math.sin(phi * 9 + v * 2.4)) ** 0.7 *
            smoothstep(0, 0.12, v) +
          0.012 * v,
      }),
      fur,
      head,
    );
    const rim = revolve(
      [
        [0.205, 0.322],
        [0.226, 0.338],
        [0.22, 0.356],
        [0.198, 0.366],
      ],
      {
        rows: 12,
        segments: 144,
        shape: (phi, _v, radius) =>
          radius + 0.01 * Math.abs(Math.sin(phi * 9 + 2.4)) ** 0.7,
      },
    );
    mesh(rim, toon("#7d5432", { ink: "#2a160a" }), head);
    mesh(
      displace(
        revolve(
          [
            [0.002, 0.43],
            [0.1, 0.425],
            [0.168, 0.402],
            [0.205, 0.372],
            [0.21, 0.35],
            [0.2, 0.335],
          ],
          {
            rows: 28,
            segments: 72,
            shape: (phi, v, radius) =>
              radius * (1 + 0.05 * v * Math.sin(phi * 6)),
          },
        ),
        (vertex) =>
          0.005 * noise.noise3d(vertex.x * 20, vertex.y * 20, vertex.z * 20),
      ),
      toon("#d13a26"),
      head,
    );
    const knob = mesh(
      new THREE.SphereGeometry(0.018, 16, 12),
      toon(GOLD),
      head,
    );
    knob.position.set(0, 0.434, 0);
  },
  cap({ head, hair, crown }) {
    mesh(
      revolve(
        [
          [0.168, -0.06],
          [0.17, 0.04],
          [0.162, 0.1],
          [0.1, 0.16],
          [0.002, 0.172],
        ],
        {
          rows: 24,
          segments: 64,
          gap: (v) => 1.25 * (1 - smoothstep(0.35, 0.55, v)),
        },
      ),
      hair,
      head,
    );
    mesh(
      revolve(
        [
          [0.158, 0.075],
          [0.178, 0.09],
          [0.18, 0.13],
          [0.162, 0.148],
        ],
        {
          rows: 20,
          shape: (phi, _v, radius) => radius + 0.004 * Math.sin(phi * 9),
        },
      ),
      toon("#f6f5ef"),
      head,
    );
    mesh(
      revolve(
        [
          [0.154, 0.13],
          [0.156, 0.28],
          [0.152, 0.44],
          [0.138, 0.5],
          [0.08, 0.52],
          [0.002, 0.524],
        ],
        {
          rows: 48,
          segments: 112,
          shape: (phi, v, radius) =>
            radius *
            (1 +
              0.04 *
                Math.abs(Math.sin(phi * 10)) *
                (1 - smoothstep(0.85, 1, v))),
        },
      ),
      toon(crown),
      head,
    );
    for (const side of [-1, 1]) {
      mesh(
        sweep(
          [
            at(0.1 * side, 0.5, -0.06),
            at(0.15 * side, 0.36, -0.1),
            at(0.18 * side, 0.15, -0.11),
            at(0.19 * side, -0.05, -0.09),
            at(0.18 * side, -0.25, -0.04),
          ],
          () => 0.007,
          { tubular: 48, radial: 8 },
        ),
        toon("#c8321f"),
        head,
      );
      const tassel = mesh(
        new THREE.ConeGeometry(0.024, 0.06, 16),
        toon(GOLD),
        head,
      );
      tassel.position.set(0.18 * side, -0.27, -0.04);
    }
  },
  hotoz({ head, hair, crown: tint, random }) {
    mesh(
      revolve(
        [
          [0.18, -0.09],
          [0.17, 0],
          [0.17, 0.07],
          [0.148, 0.13],
          [0.085, 0.165],
          [0.002, 0.172],
        ],
        {
          rows: 32,
          segments: 72,
          gap: (v) => 1.25 * (1 - smoothstep(0.32, 0.6, v)),
        },
      ),
      hair,
      head,
    );
    for (const side of [-1, 1]) {
      mesh(
        sweep(
          [
            at(0.125 * side, -0.03, -0.06),
            at(0.16 * side, -0.17, -0.02),
            at(0.165 * side, -0.32, 0.05),
            at(0.155 * side, -0.46, 0.08),
          ],
          (t) =>
            0.024 *
            (1 + 0.22 * Math.sin(t * 40)) *
            (1 - t * 0.45) *
            Math.min(1, (1 - t) * 12),
          { tubular: 72, radial: 14 },
        ),
        hair,
        head,
      );
      const bead = mesh(
        new THREE.SphereGeometry(0.015, 14, 10),
        toon(GOLD),
        head,
      );
      bead.position.set(0.155 * side, -0.47, 0.08);
    }
    const crown = new THREE.Group();
    crown.rotation.x = -0.2;
    head.add(crown);
    mesh(
      revolve(
        [
          [0.172, 0.08],
          [0.174, 0.17],
          [0.162, 0.31],
          [0.14, 0.42],
          [0.118, 0.47],
          [0.065, 0.49],
          [0.002, 0.494],
        ],
        { rows: 48, segments: 96 },
      ),
      toon(tint),
      crown,
    );
    mesh(
      revolve(
        [
          [0.177, 0.1],
          [0.182, 0.12],
          [0.177, 0.14],
        ],
        { rows: 12 },
      ),
      toon(GOLD),
      crown,
    );
    const veil = new THREE.PlaneGeometry(1, 1, 24, 40);
    const position = veil.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i) * 2;
      const v = 0.5 - position.getY(i);
      position.setXYZ(
        i,
        u * (0.08 + 0.15 * v),
        0.47 - 0.82 * v,
        -0.12 -
          0.08 * Math.sin(v * 2.2) -
          0.05 * Math.cos((u * Math.PI) / 2) * v +
          0.012 * Math.sin(u * 9 + v * 4),
      );
    }
    veil.computeVertexNormals();
    mesh(veil, toon("#f6f1e6", { side: THREE.DoubleSide }), crown);
    const coin = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 20);
    for (let i = 0; i < 15; i++) {
      const phi = (i / 14 - 0.5) * 2.5;
      const piece = mesh(coin, toon(GOLD), head);
      const drop = i % 2 === 0 ? 0 : 0.016;
      piece.position.set(
        0.178 * Math.sin(phi),
        0.088 - drop,
        0.178 * Math.cos(phi),
      );
      piece.rotation.set(Math.PI / 2, 0, -phi + (random() - 0.5) * 0.1);
      piece.rotateX(0.15);
    }
  },
  kavuk({ head, crown }) {
    const linen = toon("#fbf7ec", { ink: "#8a7a5c" });
    mesh(
      revolve(
        [
          [0.162, 0.07],
          [0.205, 0.11],
          [0.25, 0.19],
          [0.262, 0.27],
          [0.245, 0.35],
          [0.2, 0.42],
          [0.13, 0.46],
          [0.11, 0.47],
        ],
        {
          rows: 64,
          segments: 144,
          shape: (phi, v, radius) =>
            radius * (1 + 0.035 * Math.abs(Math.sin(phi * 3 + v * 9)) ** 0.6),
        },
      ),
      linen,
      head,
    );
    mesh(
      revolve(
        [
          [0.118, 0.44],
          [0.115, 0.5],
          [0.09, 0.545],
          [0.002, 0.56],
        ],
        { rows: 20, segments: 64 },
      ),
      toon(crown),
      head,
    );
    const jewel = mesh(
      new THREE.SphereGeometry(0.034, 24, 16),
      toon("#1e9c94", { ink: "#0c3c38" }),
      head,
    );
    jewel.position.set(0, 0.29, 0.262);
    jewel.scale.set(1, 1.25, 0.6);
    const setting = mesh(
      new THREE.TorusGeometry(0.038, 0.009, 10, 32),
      toon(GOLD),
      head,
    );
    setting.position.copy(jewel.position);
    setting.scale.set(1, 1.25, 1);
    for (const [i, lean] of [-0.5, 0, 0.5].entries()) {
      mesh(
        sweep(
          [
            at(0.01 * lean, 0.32, 0.255),
            at(0.05 * lean, 0.45, 0.24),
            at(0.11 * lean, 0.58, 0.16),
            at(0.16 * lean, 0.66, 0.04 - i * 0.02),
          ],
          (t) =>
            0.014 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.5 + 0.002,
          { tubular: 32, radial: 10 },
        ),
        toon(i === 1 ? "#18204a" : "#fbf7ec", {
          ink: i === 1 ? "#05070f" : "#8a7a5c",
        }),
        head,
      );
    }
  },
  kallavi({ head, crown }) {
    mesh(
      revolve(
        [
          [0.163, 0.07],
          [0.19, 0.12],
          [0.198, 0.3],
          [0.194, 0.5],
          [0.17, 0.6],
          [0.1, 0.645],
          [0.002, 0.652],
        ],
        {
          rows: 56,
          segments: 128,
          shape: (phi, v, radius) =>
            radius * (1 + 0.02 * Math.abs(Math.sin(phi * 4 - v * 14)) ** 0.7),
        },
      ),
      toon("#fbf7ec", { ink: "#8a7a5c" }),
      head,
    );
    const band = mesh(
      new THREE.TorusGeometry(0.2, 0.014, 12, 96),
      toon(crown),
      head,
    );
    band.position.y = 0.3;
    band.rotation.set(Math.PI / 2 + 0.42, 0, 0);
  },
  bork({ head, crown }) {
    const felt = toon("#f3eee0", { ink: "#8a7a5c" });
    mesh(
      revolve(
        [
          [0.166, 0.07],
          [0.172, 0.16],
          [0.16, 0.36],
          [0.13, 0.5],
          [0.1, 0.56],
          [0.002, 0.57],
        ],
        { rows: 48, segments: 96 },
      ),
      felt,
      head,
    );
    mesh(
      revolve(
        [
          [0.17, 0.07],
          [0.182, 0.085],
          [0.182, 0.15],
          [0.17, 0.165],
        ],
        { rows: 12, segments: 96 },
      ),
      toon(crown),
      head,
    );
    const flap = new THREE.PlaneGeometry(1, 1, 16, 48);
    const position = flap.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i) * 2;
      const v = 0.5 - position.getY(i);
      position.setXYZ(
        i,
        u * (0.07 + 0.05 * v),
        0.54 - 0.95 * v + 0.12 * Math.sin(v * 2.4),
        -0.1 - 0.16 * Math.sin(v * 2.1) - 0.04 * u * u,
      );
    }
    flap.computeVertexNormals();
    mesh(
      flap,
      toon("#f3eee0", { side: THREE.DoubleSide, ink: "#8a7a5c" }),
      head,
    );
    const spoon = mesh(
      new THREE.CylinderGeometry(0.03, 0.022, 0.2, 20),
      toon(GOLD),
      head,
    );
    spoon.position.set(0, 0.25, 0.17);
    spoon.rotation.x = -0.12;
    const knob = mesh(
      new THREE.SphereGeometry(0.032, 16, 12),
      toon(GOLD),
      head,
    );
    knob.position.set(0, 0.36, 0.158);
  },
  scarf({ head, crown }) {
    const print = pattern("floral", crown, "#2347a8", 256, 256);
    print.repeat.set(4, 4);
    const hood = revolve(
      [
        [0.24, -0.3],
        [0.198, -0.17],
        [0.18, -0.03],
        [0.18, 0.07],
        [0.155, 0.16],
        [0.09, 0.208],
        [0.002, 0.218],
      ],
      {
        rows: 56,
        segments: 96,
        gap: (v) => 0.92 * (1 - smoothstep(0.52, 0.8, v)),
        shape: (phi, v, radius) =>
          radius * (1 + 0.03 * (1 - v) * Math.sin(phi * 7)),
      },
    );
    mesh(
      hood,
      toon("#ffffff", { map: print, side: THREE.DoubleSide, ink: "#7a3a48" }),
      head,
    );
    for (const edge of hood.edges)
      mesh(
        sweep(edge, () => 0.006, { tubular: 60, radial: 8 }),
        toon(GOLD),
        head,
      );
    mesh(
      sweep(
        [at(0.16, 0.15, 0.06), at(0.205, 0, -0.03), at(0.225, -0.12, -0.12)],
        (t) => 0.0075 * Math.min(1, (1 - t) * 14 + 0.1),
        { tubular: 20, radial: 8 },
      ),
      toon("#c9a26a"),
      head,
    );
  },
};

export type Pose = {
  eyes: "open" | "closed" | "happy";
  arms: "hold" | "wave" | "up";
};

export function figure(
  character: Character,
  { eyes = "open", arms = "hold" }: Partial<Pose> = {},
) {
  const random = seeded(character.seed);
  const body = new THREE.Group();
  const angle = character.bow;
  const girth = character.isSlim ? 0.88 : 1;
  const isWoman = character.face === "woman" || character.face === "sage";

  const skinInk = new THREE.Color(character.skin).lerp(
    new THREE.Color("#5a2416"),
    0.6,
  );
  const skin = toon(character.skin, { ink: skinInk });
  const hair = toon(character.hair);
  const gold = toon(GOLD);
  const ink = toon("#24140e");
  const robeMap = robeTexture(
    character.robe.pattern,
    character.robe.base,
    character.robe.motif,
  );
  const sleeveMap = robeMap.clone();
  sleeveMap.offset.y = 0.45;
  const robeInk = new THREE.Color(character.robe.base).lerp(
    new THREE.Color("#1a0f12"),
    0.62,
  );
  const robe = toon("#ffffff", {
    map: robeMap,
    side: THREE.DoubleSide,
    ink: robeInk,
  });
  const sleeveRobe = toon("#ffffff", {
    map: sleeveMap,
    side: THREE.DoubleSide,
    ink: robeInk,
  });
  const lining = toon(character.robe.lining, { side: THREE.BackSide });
  const kutnu = stripes(character.under, [6, 2, 6, 1, 6, 2]);
  kutnu.repeat.set(14, 1);
  const entari = toon("#ffffff", {
    map: kutnu,
    ink: new THREE.Color(character.under[1] ?? "#2347a8").lerp(
      new THREE.Color("#1a0f12"),
      0.55,
    ),
  });
  const sashMap = paint(4, 256, (context) => {
    for (const [i, color] of character.sash.entries()) {
      context.fillStyle = color;
      context.fillRect(0, (i * 256) / 6, 4, 256 / 6 + 1);
    }
  });
  sashMap.repeat.set(1, 1 / 0.075);
  sashMap.offset.set(0, -0.495 / 0.075);
  const sash = toon("#ffffff", {
    map: sashMap,
    ink: new THREE.Color(character.sash[0] ?? GOLD).lerp(
      new THREE.Color("#1a0f12"),
      0.6,
    ),
  });

  const kaftanControl = (
    [
      [0.36, 0],
      [0.352, 0.07],
      [0.325, 0.27],
      [0.282, 0.44],
      [0.262, 0.53],
      [0.268, 0.6],
      [0.255, 0.67],
      [0.215, 0.72],
      [0.14, 0.76],
      [0.075, 0.785],
      [0.06, 0.795],
    ] as Array<[number, number]>
  ).map(([r, y]): [number, number] => [y > 0.74 ? r : r * girth, y]);
  const kaftan = revolve(kaftanControl, {
    rows: 72,
    segments: 96,
    depth: 0.84,
    gap: (v) =>
      0.08 + 0.3 * (1 - smoothstep(0, 0.6, v)) + 0.32 * smoothstep(0.8, 1, v),
    shape: (phi, v, radius) => {
      const front = Math.min(phi, Math.PI * 2 - phi);
      const folds =
        0.035 * (1 - smoothstep(0, 0.6, v)) * smoothstep(0.3, 0.9, front);
      return radius * (1 + folds * Math.sin(phi * 5 + 0.8));
    },
  });
  mesh(bow(kaftan, angle), robe, body);
  for (const edge of kaftan.edges)
    mesh(
      bow(
        sweep(edge, () => 0.008, { tubular: 100, radial: 10 }),
        angle,
      ),
      gold,
      body,
    );
  mesh(
    bow(
      revolve(
        kaftanControl.map(([r, y]) => [r * 0.95, y]),
        {
          rows: 72,
          segments: 96,
          depth: 0.84,
          shape: (_phi, v, radius) =>
            radius * (1 - 0.05 * (1 - smoothstep(0, 0.6, v))),
        },
      ),
      angle,
    ),
    entari,
    body,
  );
  mesh(
    bow(
      revolve(
        [
          [0.27 * girth, 0.495],
          [0.284 * girth, 0.508],
          [0.287 * girth, 0.555],
          [0.274 * girth, 0.57],
        ],
        { depth: 0.84, rows: 20 },
      ),
      angle,
    ),
    sash,
    body,
  );

  for (const side of [-1, 1]) {
    const x = 0.095 * side * girth;
    const shoe = mesh(
      sweep(
        [
          at(x, 0.035, 0.14),
          at(x * 1.05, 0.04, 0.26),
          at(x * 1.12, 0.035, 0.34),
          at(x * 1.18, 0.07, 0.38),
        ],
        (t) => (0.055 * (1 - t) ** 0.7 + 0.004) * Math.min(1, 0.45 + t * 6),
        { tubular: 32 },
      ),
      toon(character.slippers),
      body,
    );
    shoe.scale.y = 0.75;
  }

  const upper = joint(body, at(0, WAIST, 0));
  upper.pivot.rotation.x = angle;

  const isClasped = character.holds === "clasped";
  const hands: Array<THREE.Vector3> = [];
  const isRaised = (side: number) =>
    arms === "up" || (arms === "wave" && side === 1);
  for (const side of [-1, 1]) {
    const shoulder = at(0.19 * side * girth, 0.7, -0.01);
    const elbow = isRaised(side)
      ? arms === "up"
        ? at(0.27 * side * girth, 0.9, 0.03)
        : at(0.33 * side * girth, 0.8, 0.06)
      : isClasped
        ? at(0.235 * side * girth, 0.5, 0.05)
        : at(0.24 * side * girth, 0.52, 0.07);
    const wrist = isRaised(side)
      ? arms === "up"
        ? at(0.25 * side, 1.1, 0.08)
        : at(0.36 * side, 1.02, 0.12)
      : isClasped
        ? at(0.04 * side, 0.49, 0.22)
        : at(0.1 * side, 0.57, 0.25);
    const forearm = wrist.clone().sub(elbow).normalize();
    const sleeve = [
      shoulder.clone().add(at(-0.05 * side, 0.02, 0)),
      shoulder,
      elbow,
      wrist,
      wrist.clone().addScaledVector(forearm, 0.02),
    ];
    const radius = (t: number) => (0.065 + 0.055 * t ** 1.6) * girth;
    const droop = (
      vertex: THREE.Vector3,
      t: number,
      direction: THREE.Vector3,
    ) => {
      vertex.y -= 0.07 * t ** 2.4 * Math.max(0, -direction.y);
    };
    mesh(
      sweep(sleeve, radius, { tubular: 40, radial: 28, deform: droop }),
      sleeveRobe,
      upper.rest,
    );
    mesh(
      sweep(sleeve, (t) => radius(t) * 0.93, {
        tubular: 40,
        radial: 28,
        deform: droop,
      }),
      lining,
      upper.rest,
    ).userData.isBare = true;
    mesh(
      sweep(
        [elbow, wrist, wrist.clone().addScaledVector(forearm, 0.05)],
        (t) => 0.042 - 0.006 * t,
        { radial: 20 },
      ),
      entari,
      upper.rest,
    );
    const hand = mesh(
      new THREE.SphereGeometry(0.042, 32, 24),
      skin,
      upper.rest,
    );
    hand.position
      .copy(wrist)
      .addScaledVector(forearm, isClasped && !isRaised(side) ? 0.06 : 0.075);
    hand.scale.set(1, 0.9, 1.1);
    const thumb = mesh(
      new THREE.SphereGeometry(0.017, 20, 14),
      skin,
      upper.rest,
    );
    thumb.position.copy(hand.position).add(at(-0.025 * side, 0.03, 0.012));
    hands.push(hand.position);
  }

  const [right, left] = hands;
  if (arms === "hold" && !isClasped && left != null && right != null) {
    const width = left.distanceTo(right) + 0.03;
    const sheet = new THREE.PlaneGeometry(width, width * 1.35, 24, 24);
    const position = sheet.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) / (width / 2);
      const y = position.getY(i) / (width * 0.675);
      position.setZ(
        i,
        0.02 * x * x -
          0.03 * Math.max(0, y - 0.6) ** 2 * 6 +
          0.035 * Math.max(0, -y - 0.7) ** 2 * 8,
      );
    }
    sheet.computeVertexNormals();
    const page = mesh(
      sheet,
      toon("#ffffff", {
        map: documentTexture(),
        side: THREE.DoubleSide,
        ink: "#7a5a2c",
      }),
      upper.rest,
    );
    page.position
      .copy(left)
      .add(right)
      .multiplyScalar(0.5)
      .add(at(0, 0.025, -0.015));
    page.rotation.x = -0.85;
  }
  if (right != null && character.holds === "pen" && !isRaised(-1)) {
    const reed = [
      right.clone().add(at(0.01, -0.02, 0.02)),
      right.clone().add(at(0.03, 0.07, 0.04)),
      right.clone().add(at(0.05, 0.15, 0.03)),
    ];
    mesh(
      sweep(
        reed,
        (t) => 0.007 * Math.min(1, (1 - t) * 12) * Math.min(1, t * 20 + 0.2),
        { tubular: 20, radial: 10 },
      ),
      toon("#c9a26a"),
      upper.rest,
    );
  }

  const neck = joint(upper.rest, at(0, 0.78, 0.01));
  neck.pivot.rotation.x = 0.06;
  const head = new THREE.Group();
  head.position.set(0, 0.945, 0.035);
  neck.rest.add(head);

  mesh(
    revolve(
      [
        [0.002, -0.152],
        [0.09, -0.138],
        [0.145, -0.088],
        [0.165, -0.01],
        [0.162, 0.06],
        [0.136, 0.12],
        [0.08, 0.155],
        [0.002, 0.165],
      ],
      { rows: 48, segments: 64, depth: 0.97 },
    ),
    skin,
    head,
  );

  const eyeMap = paint(256, 128, (context) => {
    context.fillStyle = "#1d120c";
    context.fillRect(0, 0, 256, 128);
    const glow = context.createRadialGradient(64, 82, 4, 64, 82, 34);
    glow.addColorStop(0, "#6a3f22");
    glow.addColorStop(1, "rgba(106, 63, 34, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, 256, 128);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.ellipse(56, 48, 11, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(73, 76, 5, 0, Math.PI * 2);
    context.fill();
  });
  const eye = new THREE.MeshBasicMaterial({ map: eyeMap });
  const blushMap = paint(64, 64, (context) => {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, "rgba(232, 96, 72, 0.55)");
    gradient.addColorStop(1, "rgba(232, 96, 72, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  });
  const blush = new THREE.MeshBasicMaterial({
    map: blushMap,
    transparent: true,
    depthWrite: false,
  });

  for (const side of [-1, 1]) {
    if (eyes === "open") {
      const eyeball = mesh(new THREE.SphereGeometry(1, 32, 20), eye, head);
      eyeball.position.set(0.062 * side, -0.008, 0.14);
      eyeball.scale.set(0.029, isWoman ? 0.038 : 0.035, 0.016);
      eyeball.rotation.y = 0.42 * side;
      eyeball.userData.isBare = true;
      eyeball.castShadow = false;
    } else {
      const lid = eyes === "happy" ? 1 : -1;
      mesh(
        sweep(
          [-1, -0.5, 0, 0.5, 1].map((u) => {
            const x = (0.062 + 0.027 * u) * side;
            return at(
              x,
              -0.008 + lid * 0.011 * (1 - u * u) - lid * 0.004,
              0.004 + 0.158 * Math.sqrt(1 - (x / 0.166) ** 2),
            );
          }),
          rounded(0.0062, 0.3),
          { tubular: 20, radial: 10 },
        ),
        ink,
        head,
      );
    }
    const brow =
      character.face === "elder" || character.face === "sage"
        ? 0.011
        : character.face === "woman"
          ? 0.006
          : 0.008;
    mesh(
      sweep(
        [
          at(0.035 * side, 0.052, 0.152),
          at(0.064 * side, 0.062, 0.148),
          at(0.092 * side, 0.054, 0.128),
        ],
        (t) => brow * Math.sin(Math.PI * t) ** 0.45,
        { tubular: 16, radial: 10 },
      ),
      hair,
      head,
    );
    const cheek = mesh(new THREE.CircleGeometry(0.03, 24), blush, head);
    cheek.position.set(0.095 * side, -0.058, 0.128);
    cheek.rotation.y = 0.62 * side;
    cheek.userData.isBare = true;
    cheek.castShadow = false;
    const ear = mesh(new THREE.SphereGeometry(1, 20, 14), skin, head);
    ear.position.set(0.158 * side, -0.01, -0.01);
    ear.scale.set(0.018, 0.036, 0.028);
    if (character.face === "elder") {
      mesh(
        sweep(
          [
            at(0.004 * side, -0.07, 0.185),
            at(0.045 * side, -0.082, 0.172),
            at(0.085 * side, -0.082, 0.14),
            at(0.11 * side, -0.05, 0.11),
          ],
          (t) => 0.024 * (1 - t) ** 0.8 * Math.min(1, 0.45 + t * 6) + 0.002,
          { tubular: 24, radial: 14 },
        ),
        hair,
        head,
      );
    } else if (character.face === "youth") {
      mesh(
        sweep(
          [
            at(0.004 * side, -0.064, 0.172),
            at(0.05 * side, -0.074, 0.16),
            at(0.1 * side, -0.1, 0.125),
            at(0.12 * side, -0.16, 0.1),
          ],
          (t) => 0.0095 * (1 - t) ** 0.8 * Math.min(1, 0.4 + t * 8) + 0.0012,
          { tubular: 28, radial: 10 },
        ),
        hair,
        head,
      );
    }
  }
  if (character.face === "elder") {
    mesh(
      sweep(
        [
          at(0, 0, 0.16),
          at(0, -0.025, 0.188),
          at(0, -0.048, 0.198),
          at(0, -0.062, 0.18),
        ],
        (t) => (0.017 + 0.019 * t ** 2.5) * Math.sin(Math.PI * t) ** 0.35,
        { tubular: 24, radial: 16 },
      ),
      skin,
      head,
    );
    const beard = sweep(
      [
        at(0, -0.075, 0.095),
        at(0, -0.17, 0.12),
        at(0, -0.3, 0.115),
        at(0, -0.43, 0.085),
      ],
      (t) => 0.118 * (1 - t) ** 0.95 * Math.min(1, 0.72 + t * 3) + 0.004,
      {
        tubular: 56,
        radial: 64,
        deform: (vertex, t, direction) => {
          vertex.x *= 1.05;
          vertex.addScaledVector(
            direction,
            0.012 *
              (1 - t) *
              Math.abs(Math.sin(Math.atan2(direction.x, direction.z) * 4.5)) **
                0.6,
          );
        },
      },
    );
    mesh(beard, toon("#6a4026", { ink: "#2a160a" }), head);
  } else {
    const nose = mesh(new THREE.SphereGeometry(0.02, 24, 16), skin, head);
    nose.position.set(0, -0.035, 0.162);
    nose.scale.set(1, 0.9, 1.1);
    mesh(
      sweep(
        [
          at(-0.018, -0.088, 0.148),
          at(0, -0.097, 0.153),
          at(0.018, -0.088, 0.148),
        ],
        rounded(0.0045, 0.5),
        { tubular: 14, radial: 8 },
      ),
      character.face === "woman"
        ? toon("#b8433a")
        : character.face === "sage"
          ? toon("#a85a4e")
          : ink,
      head,
    );
  }

  headwear[character.headwear]({ head, hair, crown: character.crown, random });

  const statue = new THREE.Group();
  body.position.y = 0.05;
  const base = plinth();
  statue.add(base, body);
  outline(statue);
  return Object.assign(statue, {
    head,
    neck: neck.pivot,
    upper: upper.pivot,
    base,
  });
}
