import { rtl } from "@dragoman/brand/locales";
import { getLocale, isLocale, setLocale } from "#lib/paraglide/runtime.js";
import { readSettings } from "#lib/settings.ts";

export async function applyLocale() {
  const { interfaceLanguage } = await readSettings();
  if (isLocale(interfaceLanguage))
    void setLocale(interfaceLanguage, { reload: false });
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = rtl.has(locale) ? "rtl" : "ltr";
}
