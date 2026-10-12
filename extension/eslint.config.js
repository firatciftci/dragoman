import config from "../eslint.base.js";

export default config({
  root: import.meta.dirname,
  ignores: ["safari/**"],
}).append({
  files: ["src/entrypoints/content/index.ts", "src/entrypoints/background.ts"],
  rules: { "sonarjs/cognitive-complexity": "off" },
});
