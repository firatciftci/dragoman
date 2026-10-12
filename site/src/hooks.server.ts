import type { Handle } from "@sveltejs/kit/hooks";
import { rtl } from "@dragoman/brand/locales";
import { paraglideMiddleware } from "#lib/paraglide/server.js";

export const handle: Handle = async ({ event, resolve }) =>
  paraglideMiddleware(event.request, async ({ request, locale }) =>
    resolve(
      { ...event, request },
      {
        transformPageChunk: ({ html }) =>
          html
            .replace("%paraglide.lang%", () => locale)
            .replace("%paraglide.dir%", () =>
              rtl.has(locale) ? "rtl" : "ltr",
            ),
      },
    ),
  );
