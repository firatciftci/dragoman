import { browser } from "wxt/browser";
import type { Locale } from "#lib/paraglide/runtime.js";
import { m } from "#lib/paraglide/messages.js";
import { getLocale } from "#lib/paraglide/runtime.js";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: NonNullable<Status["error"]>["code"] };

export type Languages = { sources: Array<string>; targets: Array<string> };

export type Detection = {
  isReliable: boolean;
  languages: Array<{ language: string; percentage: number }>;
};

export type Status = {
  state: "idle" | "translating" | "translated" | "error";
  host: string;
  source: string | null;
  target: string | null;
  blocks: number;
  drafted: number;
  refined: number;
  tokens: number;
  cost: number | null;
  isFollowing: boolean;
  isWholePage: boolean;
  error: {
    code:
      | "same-language"
      | "no-engine"
      | "failed"
      | "key"
      | "credits"
      | "rate"
      | "model"
      | "down"
      | "offline";
    detail: string;
  } | null;
};

export type BackgroundMessage =
  | {
      to: "background";
      type: "draft";
      source: string;
      target: string;
      html: Array<string>;
      tagged: Array<string>;
    }
  | {
      to: "background";
      type: "refine";
      source: string;
      target: string;
      page: {
        url: string;
        title: string;
        headings: Array<string>;
        recurring: Array<[string, string]>;
        terms: Array<[string, string]>;
      };
      texts: Array<string>;
      previous?: Array<string | null>;
    }
  | { to: "background"; type: "languages" }
  | { to: "background"; type: "options" }
  | { to: "background"; type: "forget" }
  | { to: "background"; type: "strings"; locale: Locale }
  | { to: "background"; type: "detect"; text: string };

export type OffscreenMessage =
  | {
      to: "offscreen";
      type: "translate";
      source: string;
      target: string;
      html: Array<string>;
    }
  | { to: "offscreen"; type: "languages" };

export type ContentMessage =
  | { to: "content"; type: "status" }
  | { to: "content"; type: "translate"; target: string }
  | { to: "content"; type: "restore" }
  | { to: "content"; type: "toggle" };

type Responses = {
  draft: Result<Array<{ text: string; isRefined: boolean }>>;
  refine: Result<{
    texts: Array<string | null>;
    terms: Array<[string, string]>;
    tokens: number;
    cost: number | null;
  }>;
  languages: Result<Languages>;
  detect: Result<Detection>;
  options: Result<null>;
  forget: Result<null>;
  strings: Result<Record<string, string>>;
  translate: Result<Array<string>>;
};

export async function sendToExtension<
  M extends BackgroundMessage | OffscreenMessage,
>(message: M): Promise<Responses[M["type"]]> {
  return browser.runtime.sendMessage(message);
}

export function languageName(code: string, locale = navigator.language) {
  return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
}

const ALIASES: Record<string, string> = { iw: "he", no: "nb", fil: "tl" };

export function normalizeLanguage(code: string) {
  const [base = "", region] = code.split("-", 2);
  if (base === "zh")
    return ["TW", "HK", "Hant"].includes(region ?? "") ? "zh-Hant" : "zh-Hans";
  return ALIASES[base] ?? base.toLowerCase();
}

const BCMS = new Set(["bs", "cnr", "hr", "sh", "sr"]);

export function languageKey(code: string) {
  const language = normalizeLanguage(code);
  return BCMS.has(language) ? "bcms" : language;
}

export function sourceName(code: string, locale: Locale = getLocale()) {
  return languageKey(code) === "bcms"
    ? m.language_bcms({}, { locale }).replaceAll("/", "/\u{200B}")
    : languageName(code, locale);
}
