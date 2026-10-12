import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": { entry: ["scripts/*.ts"] },
    brand: {
      entry: [
        "src/*.ts",
        "src/*.svelte",
        "studio/main.ts",
        "studio/loops.ts",
        "scripts/*.ts",
      ],
      ignoreDependencies: [/^@fontsource\//],
    },
    extension: {
      entry: ["src/entrypoints/**/{index,main}.ts", "src/entrypoints/*.ts"],
      ignore: ["public/**", "safari/**"],
    },
    site: { entry: ["src/hooks.ts"] },
  },
  ignoreBinaries: ["magick", "ffmpeg", "uv", "cwebp"],
  treatConfigHintsAsErrors: true,
};

export default config;
