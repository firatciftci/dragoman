import { browser } from "wxt/browser";
import type { OffscreenMessage, Result } from "#lib/messages.ts";
import { languages, translate } from "#lib/engine.ts";

browser.runtime.onMessage.addListener(
  (
    message: { to?: string },
    _sender,
    sendResponse: (response: Result<unknown>) => void,
  ) => {
    if (message.to !== "offscreen") return false;
    const request = message as OffscreenMessage;
    void (async () => {
      try {
        sendResponse({
          ok: true,
          value:
            request.type === "languages"
              ? await languages()
              : await translate(request),
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return true;
  },
);
