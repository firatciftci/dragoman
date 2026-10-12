import config from "../eslint.base.js";

export default config({ root: import.meta.dirname }).append(
  {
    files: ["**/*.svelte"],
    rules: { "svelte/no-navigation-without-resolve": "off" },
  },
  {
    files: ["src/routes/**/+*.ts"],
    rules: { "unicorn/consistent-boolean-name": "off" },
  },
);
