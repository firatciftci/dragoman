import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  svelte: {
    vite: {
      compilerOptions: { cssHash: ({ hash, css }) => `svelte-${hash(css)}` },
    },
  },
  imports: false,
  manifestVersion: 3,
  zip: {
    artifactTemplate: "dragoman-{{version}}-{{browser}}.zip",
    sourcesTemplate: "dragoman-{{version}}-sources.zip",
    sourcesRoot: "..",
    includeSources: [
      "extension/**",
      "brand/src/**",
      "brand/package.json",
      "brand/tsconfig.json",
      "messages/**",
      "project.inlang/settings.json",
      "README.md",
      ".gitignore",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.json",
    ],
    excludeSources: [
      "extension/safari/**",
      "**/.DS_Store",
      "site/**",
      ".github/**",
      "**/node_modules/**",
      "**/.output/**",
      "**/.wxt/**",
    ],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser }) => ({
    name: "dragoman",
    description:
      "Page translation that drafts on your device in a second, then refines with the AI model of your choice.",
    permissions: [
      "storage",
      ...(browser === "firefox" || browser === "safari" ? [] : ["offscreen"]),
      ...(browser === "safari" ? ["nativeMessaging"] : ["identity"]),
    ],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["characters/*.png", "pet/*.webp"],
        matches: ["<all_urls>"],
      },
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    commands: {
      "toggle-translation": {
        suggested_key: { default: "Alt+Shift+T" },
        description: "Translate the page, or show the original",
      },
    },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "dragoman@dragoman.io",
          strict_min_version: "140.0",
          data_collection_permissions: {
            required: ["none"],
            optional: ["websiteContent"],
          },
        },
        gecko_android: { strict_min_version: "140.0" },
      },
    }),
  }),
});
