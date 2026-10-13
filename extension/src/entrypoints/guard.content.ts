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
    let isMarked = false;
    let isRequested = false;
    try {
      isRequested = sessionStorage.getItem("dragoman:original") != null;
    } catch {}
    const update = async () => {
      const settings = await readSettings();
      const isQuiet =
        isRequested ||
        (settings.quietBrowser &&
          exclusion(location.hostname, settings.neverSites).site == null);
      if (isQuiet) {
        if (!meta.isConnected)
          (root.querySelector("head") ?? root).append(meta);
        if (!root.hasAttribute("translate")) {
          root.setAttribute("translate", "no");
          isMarked = true;
        }
        return;
      }
      meta.remove();
      if (isMarked) root.removeAttribute("translate");
      isMarked = false;
    };
    void update();
    const unwatch = settingsItem.watch(() => void update());
    ctx.onInvalidated(() => {
      unwatch();
      meta.remove();
      if (isMarked) root.removeAttribute("translate");
    });
  },
});
