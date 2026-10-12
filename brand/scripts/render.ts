import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { openStudio } from "./studio.ts";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "assets");
await mkdir(output, { recursive: true });

const studio = await openStudio(3021);
await studio.open("index.html", 1200, 800, "window.studio != null");

const characters = [
  "grand",
  "envoy",
  "apprentice",
  "scholar",
  "kira",
  "calligrapher",
];
const shots = [
  { file: "icon.png", name: "grand", kind: "icon", width: 1024, height: 1024 },
  ...characters.flatMap((name) => [
    {
      file: `avatar-${name}.png`,
      name,
      kind: "portrait",
      width: 512,
      height: 512,
    },
    {
      file: `figure-${name}.png`,
      name,
      kind: "figure",
      width: 1024,
      height: 1536,
    },
  ]),
  {
    file: "cast.png",
    name: "all",
    kind: "cast",
    width: 2400,
    height: 1260,
    background: "#f6f5ef",
  },
];
for (const shot of shots) {
  const data = await studio.evaluate<string>(
    `window.studio.shot(${JSON.stringify(shot)})`,
  );
  await writeFile(
    path.join(output, shot.file),
    Buffer.from(data.split(",", 2)[1] ?? "", "base64"),
  );
  process.stdout.write(`Rendered ${shot.file}\n`);
}

const extension = path.join(root, "..", "extension", "public");
await mkdir(path.join(extension, "icon"), { recursive: true });
await mkdir(path.join(extension, "characters"), { recursive: true });
const tile = path.join(output, "icon-tile.png");
execFileSync("magick", [
  "-size",
  "1024x1024",
  "xc:none",
  "-fill",
  "#2347a8",
  "-draw",
  "roundrectangle 0,0 1023,1023 236,236",
  "-fill",
  "none",
  "-stroke",
  "#e0ac3e",
  "-strokewidth",
  "18",
  "-draw",
  "roundrectangle 40,40 983,983 200,200",
  "(",
  path.join(output, "icon.png"),
  "-resize",
  "1000x1000",
  ")",
  "-gravity",
  "south",
  "-composite",
  tile,
]);
for (const size of [16, 32, 48, 96, 128]) {
  execFileSync("magick", [
    tile,
    "-filter",
    "Lanczos",
    "-resize",
    `${size}x${size}`,
    path.join(extension, "icon", `${size}.png`),
  ]);
}
const site = path.join(root, "..", "site", "static");
for (const options of [
  ["-resize", "48x48", "-strip", `PNG32:${path.join(site, "favicon.png")}`],
  [
    "-resize",
    "128x128",
    "-quality",
    "90",
    "-define",
    "webp:method=6",
    path.join(site, "logo.webp"),
  ],
  [
    "-resize",
    "180x180",
    "-background",
    "#2347a8",
    "-alpha",
    "remove",
    "-strip",
    "-colors",
    "256",
    `PNG8:${path.join(site, "apple-touch-icon.png")}`,
  ],
]) {
  execFileSync("magick", [tile, "-filter", "Lanczos", ...options]);
}
for (const name of characters) {
  execFileSync("magick", [
    path.join(output, `avatar-${name}.png`),
    "-filter",
    "Lanczos",
    "-resize",
    "256x256",
    path.join(extension, "characters", `${name}.png`),
  ]);
}
process.stdout.write("Wrote extension and site icons and characters\n");

await studio.close();
