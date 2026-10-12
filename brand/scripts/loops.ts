import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { openStudio } from "./studio.ts";

const output = path.resolve(import.meta.dirname, "../../site/static/loops");
await mkdir(output, { recursive: true });
const work = await mkdtemp(path.join(tmpdir(), "dragoman-loops-"));
const studio = await openStudio(3023);

const run = async (
  args: Array<string>,
  input?: (stdin: NodeJS.WritableStream) => Promise<void>,
) => {
  const child = spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: [input == null ? "ignore" : "pipe", "inherit", "inherit"],
  });
  const exited = new Promise<number | null>((resolve) =>
    child.once("exit", resolve),
  );
  if (input != null && child.stdin != null) {
    await input(child.stdin);
    child.stdin.end();
  }
  if ((await exited) !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
};

for (const shot of ["day", "night"]) {
  for (const { name, width, height, scale } of [
    { name: "wide", width: 3840, height: 2160, scale: "2560:1440" },
    { name: "tall", width: 2160, height: 3840, scale: "1080:1920" },
  ]) {
    await studio.open(
      `loops.html?shot=${shot}`,
      width,
      height,
      "window.loop != null",
    );
    const { fps, length, overlap } = await studio.evaluate<{
      fps: number;
      length: number;
      overlap: number;
    }>(
      "({ fps: window.loop.fps, length: window.loop.length, overlap: window.loop.overlap })",
    );
    const master = path.join(work, `${shot}-${name}.mp4`);
    const frames = Math.round((length + overlap) * fps);
    const started = Date.now();
    await run(
      [
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-c:v",
        "mjpeg",
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-crf",
        "10",
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv444p",
        master,
      ],
      async (stdin) => {
        for (let frame = 0; frame < frames; frame++) {
          await studio.evaluate<boolean>(`window.loop.frame(${frame / fps})`);
          if (!stdin.write(await studio.capture()))
            await new Promise((resolve) => stdin.once("drain", resolve));
          if (frame % 120 === 0)
            process.stdout.write(
              `${shot} ${name}: frame ${frame} of ${frames}, ${Math.round((Date.now() - started) / 1000)}s\n`,
            );
        }
      },
    );
    const loop = `[0:v]trim=start=${overlap}:end=${length + overlap},setpts=PTS-STARTPTS[a];[0:v]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${overlap}:offset=${length - overlap},scale=${scale}:flags=lanczos,format=yuv420p[v]`;
    const base = path.join(output, `${shot}-${name}`);
    await run([
      "-i",
      master,
      "-filter_complex",
      loop,
      "-map",
      "[v]",
      "-c:v",
      "libsvtav1",
      "-crf",
      String((name === "wide" ? 47 : 50) - (shot === "night" ? 1 : 0)),
      "-preset",
      "4",
      "-g",
      String(fps * 4),
      "-svtav1-params",
      "tune=0",
      `${base}.webm`,
    ]);
    await run([
      "-i",
      master,
      "-filter_complex",
      loop,
      "-map",
      "[v]",
      "-c:v",
      "libx265",
      "-crf",
      name === "wide" ? "30" : "33",
      "-preset",
      "slow",
      "-tag:v",
      "hvc1",
      "-x265-params",
      "log-level=error",
      "-movflags",
      "+faststart",
      `${base}.mp4`,
    ]);
    const poster = path.join(work, `${shot}-${name}.png`);
    await run([
      "-ss",
      String(overlap),
      "-i",
      master,
      "-frames:v",
      "1",
      "-vf",
      `scale=${scale}:flags=lanczos`,
      poster,
    ]);
    await run([
      "-i",
      poster,
      "-c:v",
      "libsvtav1",
      "-crf",
      "34",
      "-svtav1-params",
      "avif=1",
      "-frames:v",
      "1",
      `${base}.avif`,
    ]);
    execFileSync("cwebp", [
      "-quiet",
      "-q",
      "78",
      "-m",
      "6",
      poster,
      "-o",
      `${base}.webp`,
    ]);
    process.stdout.write(`Wrote ${base}.{webm,mp4,avif,webp}\n`);
  }
}

await studio.close();
await rm(work, { recursive: true, force: true });
