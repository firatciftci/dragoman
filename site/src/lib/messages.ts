import type * as english from "#lib/paraglide/messages/en.js";
import { getLocale } from "#lib/paraglide/runtime.js";

type Table = Record<string, (inputs?: Record<string, unknown>) => string>;
type Messages = {
  [Key in keyof typeof english]: Parameters<
    (typeof english)[Key]
  >[0] extends infer Inputs
    ? object extends Inputs
      ? (inputs?: Inputs) => string
      : (inputs: Inputs) => string
    : never;
};

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

export const m = new Proxy({} as Messages, {
  get: (_, key) => (inputs?: Record<string, unknown>) =>
    tables.get(getLocale())?.[String(key)]?.(inputs) ?? String(key),
});
