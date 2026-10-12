import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { openStudio } from "./studio.ts";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "..", "extension", "public", "pet");
await mkdir(output, { recursive: true });
const scratch = await mkdtemp(path.join(tmpdir(), "dragoman-pet-"));

const studio = await openStudio(3022);
await studio.open("index.html", 1200, 800, "window.studio != null");

for (const name of [
  "grand",
  "envoy",
  "apprentice",
  "scholar",
  "kira",
  "calligrapher",
]) {
  for (const pose of ["idle", "blink", "happy", "sleep", "lift", "read"]) {
    const data = await studio.evaluate<string>(
      `window.studio.shot(${JSON.stringify({ name, kind: "pet", pose, width: 384, height: 512 })})`,
    );
    const source = path.join(scratch, `${name}-${pose}.png`);
    await writeFile(source, Buffer.from(data.split(",", 2)[1] ?? "", "base64"));
    execFileSync("magick", [
      source,
      "-filter",
      "Lanczos",
      "-resize",
      "192x256",
      "-quality",
      "88",
      "-define",
      "webp:alpha-quality=100",
      path.join(output, `${name}-${pose}.webp`),
    ]);
    process.stdout.write(`Rendered ${name}-${pose}\n`);
  }
}

await studio.close();
await rm(scratch, { recursive: true, force: true });
