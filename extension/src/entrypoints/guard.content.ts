import { defineContentScript } from "wxt/utils/define-content-script";
import { exclusion, readSettings, settingsItem } from "#lib/settings.ts";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main(ctx) {
    const root = document.documentElement;
    const meta = document.createElement("meta");
    meta.name = "google";
    meta.content = "notranslate";
    let isQuiet = false;
    let isRequested = false;
    try {
      isRequested = sessionStorage.getItem("dragoman:original") != null;
    } catch {}
    const apply = () => {
      if (!isQuiet) {
        meta.remove();
        for (const element of document.querySelectorAll<HTMLElement>(
          "[data-dragoman-quiet]",
        )) {
          element.removeAttribute("translate");
          delete element.dataset.dragomanQuiet;
        }
        return;
      }
      if (!meta.isConnected) (root.querySelector("head") ?? root).append(meta);
      for (const element of [root, root.querySelector("body")]) {
        if (element == null || element.hasAttribute("translate")) continue;
        element.setAttribute("translate", "no");
        element.dataset.dragomanQuiet = "";
      }
    };
    const update = async () => {
      const settings = await readSettings();
      isQuiet =
        isRequested ||
        (settings.quietBrowser &&
          exclusion(location.hostname, settings.neverSites).site == null);
      apply();
    };
    void update();
    const unwatch = settingsItem.watch(() => void update());
    const observer = new MutationObserver(() => {
      if (isQuiet) apply();
    });
    observer.observe(root, { childList: true });
    ctx.onInvalidated(() => {
      unwatch();
      observer.disconnect();
      isQuiet = false;
      apply();
    });
  },
});
