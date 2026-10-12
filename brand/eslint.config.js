import config from "../eslint.base.js";

export default config({ root: import.meta.dirname }).append({
  files: ["src/figure.ts", "src/world.ts"],
  rules: {
    "sonarjs/cognitive-complexity": "off",
    "unicorn/prefer-path2d": "off",
  },
});
