import { defineConfig } from "bumpp";

export default defineConfig({
  commit: "chore: release v{version}",
  files: [
    "package.json",
    "brand/package.json",
    "extension/package.json",
    "site/package.json",
    "extension/safari/dragoman.xcodeproj/project.pbxproj",
  ],
});
