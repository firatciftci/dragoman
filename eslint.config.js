import config from "./eslint.base.js";

export default config({
  root: import.meta.dirname,
  ignores: [
    "brand/**",
    "extension/**",
    "site/**",
    "messages/**",
    "project.inlang/**",
  ],
});
