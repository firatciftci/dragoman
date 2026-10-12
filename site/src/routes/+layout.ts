import { loadMessages } from "#lib/messages.ts";
import { getLocale } from "#lib/paraglide/runtime.js";

export const prerender = true;

export const load = async () => {
  await loadMessages(getLocale());
};
