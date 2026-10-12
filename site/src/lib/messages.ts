import type { m as messages } from "#lib/paraglide/messages.js";
import { getLocale } from "#lib/paraglide/runtime.js";

type Table = Record<string, (inputs?: Record<string, unknown>) => string>;

const modules = import.meta.glob<Table>([
  "./paraglide/messages/*.js",
  "!./paraglide/messages/_index.js",
]);
const tables = new Map<string, Table>();

export async function loadMessages(locale: string): Promise<void> {
  const load = modules[`./paraglide/messages/${locale}.js`];
  if (load == null || tables.has(locale)) return;
  tables.set(locale, await load());
}

export const m = new Proxy({} as typeof messages, {
  get: (_, key) => (inputs?: Record<string, unknown>) =>
    tables.get(getLocale())?.[String(key)]?.(inputs) ?? String(key),
});
