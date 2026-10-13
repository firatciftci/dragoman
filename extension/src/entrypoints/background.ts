import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { storage } from "wxt/utils/storage";
import type {
  BackgroundMessage,
  Detection,
  Result,
  Status,
} from "#lib/messages.ts";
import type { ProviderId } from "#lib/providers.ts";
import { forget, recall, remember } from "#lib/cache.ts";
import { languages, translate } from "#lib/engine.ts";
import { languageName, sendToExtension, sourceName } from "#lib/messages.ts";
import { complete, providers } from "#lib/providers.ts";
import {
  connection,
  hiddenItem,
  readSettings,
  usageItem,
} from "#lib/settings.ts";
import { strings } from "#lib/strings.ts";

const SYSTEM = `You translate web page text for a browser translation extension.

Each input paragraph has an id and text. Inline formatting is marked with numbered tags like <x1>...</x1>, and self-closing tags like <x2/> mark images, icons or line breaks. Code keeps its text inside its tag; copy it unchanged. Every tag in the source must appear exactly once in your translation, wrapping the words that correspond to the original span, in valid nesting. Never add, drop, renumber or merge tags. If word order changes, move the tags with the words. Text may contain HTML entities such as &amp; and &lt;; keep them as entities.

Translate faithfully and fluently, as a professional human translator would for a reader of the target language. Use the established target-language forms of names, places, titles and historical terms (for example the conventional exonym or the form used in the target-language encyclopedia), not literal renderings. Keep text in other scripts (such as Arabic or Greek quotations) unchanged. Keep numbers and dates accurate; convert date formats to target-language conventions.

The paragraphs come from one page and reach you a few at a time, so keeping the page consistent across requests is your job. Translate every recurring label, heading, term, and name the same way each time it appears, as the page's own translator would. When established renderings are given, use them exactly, changing only what grammar requires, such as case, number, or agreement. Before the translations, fill terms with the renderings you settle on for anything that must stay consistent and has no established rendering yet: each recurring phrase listed for the page, judged by the text around it, and the names and specialized terms in these paragraphs that are likely to come up again. Give each source exactly as it appears on the page and each target exactly as you use it, and leave terms empty when nothing is new.

Some paragraphs may include a rejected translation that a reader asked you to redo. Write a fresh translation for those that fixes what the rejected one got wrong, reads more naturally, and does not simply repeat it. A rejected translation may depart from an established rendering when that rendering is what was wrong.

Return one translation per input id, in the same order.`;

const pending: { offscreen?: Promise<void> } = {};
const hasOffscreen = Reflect.has(browser, "offscreen");

async function ensureOffscreen() {
  pending.offscreen ??= (async () => {
    try {
      if (await browser.offscreen.hasDocument()) return;
      await browser.offscreen.createDocument({
        url: browser.runtime.getURL("/offscreen.html"),
        reasons: ["WORKERS"],
        justification: "Runs the local translation engine",
      });
    } catch (error) {
      delete pending.offscreen;
      throw error;
    }
  })();
  return pending.offscreen;
}

function tagsMatch(source: string, translation: string) {
  const pattern = /<(\/?)x(\d+)(\/?)>/g;
  const tags = (text: string) =>
    Array.from(text.matchAll(pattern), (match) => match[0])
      .toSorted((a, b) => a.localeCompare(b))
      .join(",");
  if (tags(source) !== tags(translation)) return false;
  const open: Array<string | undefined> = [];
  for (const [, closing, id, selfClosing] of translation.matchAll(pattern)) {
    if (selfClosing === "/") continue;
    if (closing !== "/") open.push(id);
    else if (open.pop() !== id) return false;
  }
  return open.length === 0;
}

const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const decode = (text: string) =>
  text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

const translators = new Map<
  string,
  Promise<{ translate: (text: string) => Promise<string> } | null>
>();

async function draftOnDevice(
  source: string,
  target: string,
  html: Array<string>,
) {
  const value: Array<string | null> = html.map(() => null);
  const api = Reflect.get(globalThis, "Translator") as
    | {
        create: (options: {
          sourceLanguage: string;
          targetLanguage: string;
        }) => Promise<{ translate: (text: string) => Promise<string> }>;
      }
    | undefined;
  let translatePlain:
    | ((texts: Array<string>) => Promise<Array<string> | null>)
    | null = null;
  if (api != null) {
    const key = `${source}>${target}`;
    let pending = translators.get(key);
    if (pending == null) {
      const code = (language: string) =>
        language === "zh-Hans" ? "zh" : language;
      pending = (async () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            return await api.create({
              sourceLanguage: code(source),
              targetLanguage: code(target),
            });
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        return null;
      })();
      translators.set(key, pending);
    }
    const translator = await pending;
    if (translator != null) {
      const tags = (text: string) =>
        Array.from(text.matchAll(/<(\/?)[a-z][^>]*>/gi), ([tag, closing]) =>
          closing === "/" ? "/" : (/data-x="(\d+)"/.exec(tag)?.[1] ?? ""),
        )
          .toSorted((a, b) => a.localeCompare(b))
          .join(",");
      const drafts = await Promise.all(
        html.map(async (text) => {
          try {
            return await translator.translate(text);
          } catch {
            return null;
          }
        }),
      );
      for (const [i, text] of drafts.entries())
        if (text != null && tags(text) === tags(html[i] ?? "")) value[i] = text;
      translatePlain = async (texts) => {
        try {
          return await Promise.all(
            texts.map(async (text) =>
              decode(await translator.translate(escape(text))),
            ),
          );
        } catch {
          return null;
        }
      };
    }
  } else if (import.meta.env.BROWSER === "safari") {
    translatePlain = async (texts) => {
      try {
        const reply = (await browser.runtime.sendNativeMessage(
          "io.dragoman.app",
          { type: "translate", source, target, texts },
        )) as { texts?: Array<string> } | null;
        return reply?.texts?.length === texts.length ? reply.texts : null;
      } catch {
        return null;
      }
    };
  }

  const plain = html.flatMap((_, i) => (value[i] == null ? [i] : []));
  if (translatePlain != null && plain.length > 0) {
    const requests: Array<string> = [];
    const ask = (text: string) => {
      if (!/\p{L}/u.test(text)) return -1;
      requests.push(text.trim());
      return requests.length - 1;
    };
    const layouts = plain.map((i) => {
      const pieces: Array<
        | string
        | {
            raw: string;
            items: Array<
              string | { tokens: Array<{ raw: string; kind: string }> }
            >;
          }
      > = [];
      let segment: Extract<(typeof pieces)[number], object> = {
        raw: "",
        items: [],
      };
      let depth = 0;
      const tokens = (html[i] ?? "").matchAll(
        /<(\/?)([a-z][\w-]*)(?:\s[^>]*)?>|[^<]+/gi,
      );
      for (const [raw, closing, name] of tokens) {
        const kind =
          name == null
            ? "text"
            : closing === "/"
              ? "close"
              : name === "br" || name === "img"
                ? "void"
                : "open";
        if (depth === 0 && kind === "void") {
          pieces.push(segment, raw);
          segment = { raw: "", items: [] };
          continue;
        }
        segment.raw += raw;
        const last = segment.items.at(-1);
        if (depth === 0 && kind === "text") segment.items.push(decode(raw));
        else if (depth === 0 && kind === "open")
          segment.items.push({ tokens: [{ raw, kind }] });
        else if (typeof last === "object") last.tokens.push({ raw, kind });
        depth = Math.max(
          0,
          depth + (kind === "open" ? 1 : kind === "close" ? -1 : 0),
        );
      }
      pieces.push(segment);
      return pieces.map((piece) => {
        if (typeof piece === "string") return piece;
        let before = "";
        const elements = piece.items.flatMap((item) => {
          if (typeof item === "string") {
            before += item;
            return [];
          }
          let inner = item.tokens;
          let opens = "";
          let closes = "";
          for (;;) {
            const [first] = inner;
            const last = inner.at(-1);
            let level = 0;
            const isWrapped =
              inner.length >= 2 &&
              first?.kind === "open" &&
              last?.kind === "close" &&
              inner.every((token, j) => {
                level +=
                  token.kind === "open" ? 1 : token.kind === "close" ? -1 : 0;
                return level > 0 || j === inner.length - 1;
              });
            if (!isWrapped) break;
            opens += first.raw;
            closes = last.raw + closes;
            inner = inner.slice(1, -1);
          }
          let text = "";
          let lead = "";
          let trail = "";
          for (const token of inner) {
            if (token.kind === "text") text += decode(token.raw);
            else if (token.kind === "void") {
              if (/\p{L}/u.test(text)) trail += token.raw;
              else lead += token.raw;
            }
          }
          const element = {
            opens,
            closes,
            lead,
            trail,
            text: text.trim(),
            isFirst: !/\p{L}/u.test(before),
            ask: ask(text),
          };
          before += text;
          return [element];
        });
        return {
          raw: piece.raw,
          space: [/^\s/.test(before) ? " " : "", /\s$/.test(before) ? " " : ""],
          full: ask(before),
          elements,
        };
      });
    });
    const translations =
      requests.length === 0 ? [] : await translatePlain(requests);
    if (translations != null)
      for (const [j, i] of plain.entries())
        value[i] = (layouts[j] ?? [])
          .map((piece) => {
            if (typeof piece === "string") return piece;
            if (piece.full === -1) return piece.raw;
            const full = (translations[piece.full] ?? "").trim();
            const lower = full.toLowerCase();
            const words = Array.from(
              lower.matchAll(/[\p{L}\p{N}]+/gu),
              (match) =>
                [match.index, match.index + match[0].length, match[0]] as const,
            );
            const claims: Array<
              [number, number, (typeof piece.elements)[number]]
            > = [];
            const isFree = (start: number, end: number) =>
              claims.every(([from, to]) => start >= to || end <= from);
            let head = "";
            let tail = "";
            let cursor = 0;
            for (const element of piece.elements) {
              const candidates = [
                element.ask === -1
                  ? ""
                  : (translations[element.ask] ?? "").trim(),
                element.text,
              ]
                .filter((candidate) => candidate !== "")
                .map((candidate) => candidate.toLowerCase());
              const exact = candidates.flatMap((candidate) =>
                [cursor, 0].flatMap((from) => {
                  let at = lower.indexOf(candidate, from);
                  while (at !== -1 && !isFree(at, at + candidate.length))
                    at = lower.indexOf(candidate, at + 1);
                  return at === -1 ? [] : [[at, at + candidate.length]];
                }),
              );
              const loose = candidates.flatMap((candidate) => {
                const hits = Array.from(
                  candidate.matchAll(/[\p{L}\p{N}]{3,}/gu),
                  ([word]) => {
                    const stem = word.slice(0, Math.max(4, word.length - 2));
                    const isFit = ([
                      start,
                      end,
                      other,
                    ]: (typeof words)[number]) =>
                      other.startsWith(stem) && isFree(start, end);
                    const hit =
                      words.find(
                        (entry) => entry[0] >= cursor && isFit(entry),
                      ) ?? words.find((entry) => isFit(entry));
                    return hit == null
                      ? null
                      : {
                          start: hit[0],
                          end: hit[1],
                          score: hit[2] === word ? 2 : 1,
                        };
                  },
                )
                  .filter((hit) => hit != null)
                  .toSorted((a, b) => a.start - b.start);
                const clusters: Array<{
                  start: number;
                  end: number;
                  score: number;
                }> = [];
                for (const hit of hits) {
                  const last = clusters.at(-1);
                  if (
                    last != null &&
                    hit.start - last.end <= 3 &&
                    isFree(last.end, hit.start)
                  )
                    Object.assign(last, {
                      end: hit.end,
                      score: last.score + hit.score,
                    });
                  else clusters.push({ ...hit });
                }
                const best = clusters.toSorted((a, b) => b.score - a.score)[0];
                return best == null ? [] : [[best.start, best.end]];
              });
              const [start, end] = exact[0] ?? loose[0] ?? [];
              if (start != null && end != null) {
                claims.push([start, end, element]);
                cursor = end;
              } else if (element.text === "") {
                const markup = `${element.opens}${element.lead}${element.trail}${element.closes}`;
                if (element.isFirst) head += markup;
                else tail += markup;
              }
            }
            let out = `${head}${piece.space[0] ?? ""}`;
            let position = 0;
            const ordered = claims.toSorted(([a], [b]) => a - b);
            for (const [from, to, element] of ordered) {
              out += `${escape(full.slice(position, from))}${element.opens}${element.lead}${escape(full.slice(from, to))}${element.trail}${element.closes}`;
              position = to;
            }
            return `${out}${escape(full.slice(position))}${piece.space[1] ?? ""}${tail}`;
          })
          .join("");
  }

  const rest = html.flatMap((_, i) => (value[i] == null ? [i] : []));
  if (rest.length > 0) {
    const texts = rest.map((i) => html[i] ?? "");
    let response: Result<Array<string>>;
    if (hasOffscreen) {
      await ensureOffscreen();
      response = await sendToExtension({
        to: "offscreen",
        type: "translate",
        source,
        target,
        html: texts,
      });
    } else
      response = {
        ok: true,
        value: await translate({ source, target, html: texts }),
      };
    if (!response.ok) return response;
    for (const [j, i] of rest.entries()) value[i] = response.value[j] ?? "";
  }
  return { ok: true as const, value: value.map((text) => text ?? "") };
}

const pricesItem = storage.defineItem<{
  fetched: number;
  rates: Record<string, Array<number>>;
} | null>("local:prices", { fallback: null });

const VENDORS: Partial<Record<ProviderId, string>> = {
  anthropic: "anthropic",
  openai: "openai",
  gemini: "google",
  mistral: "mistralai",
  deepseek: "deepseek",
  xai: "x-ai",
};

async function refine(
  message: Extract<BackgroundMessage, { type: "refine" }>,
  isPrivate: boolean,
) {
  const settings = await readSettings();
  const active = connection(settings);
  let tokens = 0;
  let isConsented = true;
  if (
    active != null &&
    active.provider !== "ollama" &&
    active.provider !== "lmstudio" &&
    browser.runtime.getURL("/").startsWith("moz-extension:")
  ) {
    try {
      isConsented = await browser.permissions.contains({
        data_collection: ["websiteContent"],
      } as Parameters<typeof browser.permissions.contains>[0]);
    } catch {}
  }
  if (active == null || !isConsented)
    return {
      texts: message.texts.map(() => null),
      terms: [],
      tokens,
      cost: null,
    };
  const model = `${active.provider}/${active.model}`;
  const { page } = message;
  const termsKey = ["terms", model, message.source, message.target, page.url];
  const [saved] = await recall([termsKey], false);
  const glossary = new Map(
    saved == null ? [] : (JSON.parse(saved) as Array<[string, string]>),
  );
  for (const [from, to] of page.terms)
    if (!glossary.has(from)) glossary.set(from, to);
  const learned = glossary.size;
  const parts = (text: string) => [
    "refined",
    model,
    message.source,
    message.target,
    text,
  ];
  const known = await recall(
    message.texts.map((text) => parts(text)),
    !isPrivate,
  );
  const texts = known.map((text, i) =>
    message.previous?.[i] == null ? text : null,
  );
  const missing = message.texts.flatMap((_, i) =>
    texts[i] == null ? [i] : [],
  );
  if (missing.length === 0)
    return { texts, terms: [...glossary], tokens, cost: 0 };
  let cost: number | null = 0;

  let rate: Array<number> | null = null;
  if (active.provider === "ollama" || active.provider === "lmstudio")
    rate = [0, 0, 0, 0];
  else if (settings.showCost) {
    let prices = await pricesItem.getValue();
    if (prices == null || Date.now() - prices.fetched > 86_400_000) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        const body = (await response.json()) as {
          data: Array<{
            id: string;
            pricing?: {
              prompt?: string;
              completion?: string;
              input_cache_read?: string;
              input_cache_write?: string;
            };
          }>;
        };
        prices = {
          fetched: Date.now(),
          rates: Object.fromEntries(
            body.data.map((model) => [
              model.id,
              [
                Number(model.pricing?.prompt ?? -1),
                Number(model.pricing?.completion ?? -1),
                Number(model.pricing?.input_cache_read ?? -1),
                Number(model.pricing?.input_cache_write ?? -1),
              ],
            ]),
          ),
        };
        await pricesItem.setValue(prices);
      } catch {}
    }
    const squash = (id: string) => id.toLowerCase().replaceAll(/[^a-z\d]/g, "");
    const wanted = squash(active.model);
    const vendor = VENDORS[active.provider];
    const rates = Object.entries(prices?.rates ?? {});
    let longest = 0;
    for (const [id, pair] of rates) {
      const [owner = "", name = ""] = id.split("/", 2);
      const key = squash(active.provider === "openrouter" ? id : name);
      if (
        (vendor == null || owner === vendor) &&
        key.length > longest &&
        wanted.startsWith(key) &&
        pair.slice(0, 2).every((price) => Number.isFinite(price) && price >= 0)
      ) {
        longest = key.length;
        rate = pair;
      }
    }
  }

  const context = [
    `Translate from ${sourceName(message.source, "en")} to ${languageName(message.target, "en")}.`,
    `These paragraphs come from one web page, titled "${page.title}", and reach you a few at a time as the reader scrolls. Keep names, terms, and labels consistent with the rest of the page.`,
    ...(page.headings.length === 0
      ? []
      : [
          `Page outline:\n${page.headings.map((heading) => `- ${heading}`).join("\n")}`,
        ]),
    ...(page.recurring.length === 0
      ? []
      : [
          `Phrases that recur on this page, each with text from around its first appearance:\n${page.recurring.map(([phrase, around]) => (around === "" ? `- ${phrase}` : `- ${phrase} (in: ${around})`)).join("\n")}`,
        ]),
  ].join("\n\n");
  const recurring = new Set(page.recurring.map(([phrase]) => phrase));

  const run = async (indices: Array<number>) => {
    const sample = indices
      .map((i) => message.texts[i] ?? "")
      .join("\n")
      .toLowerCase();
    const established = [...glossary]
      .filter(
        ([from]) => recurring.has(from) || sample.includes(from.toLowerCase()),
      )
      .slice(0, 200);
    const prompt = [
      ...(established.length === 0
        ? []
        : [
            `Established renderings on this page:\n${established.map(([from, to]) => `${from} → ${to}`).join("\n")}`,
          ]),
      JSON.stringify(
        indices.map((i) => ({
          id: String(i),
          text: message.texts[i],
          ...(message.previous?.[i] != null && {
            rejected: message.previous[i],
          }),
        })),
      ),
    ].join("\n\n");
    let result: Awaited<ReturnType<typeof complete>>;
    try {
      result = await complete(active, SYSTEM, context, prompt);
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      const text = error instanceof Error ? error.message : String(error);
      const code =
        typeof status === "number"
          ? ((
              {
                401: "key",
                402: "credits",
                403: "key",
                404: "model",
                429: "rate",
              } as Record<number, string>
            )[status] ??
            (/credit balance|insufficient.?(?:credits|funds|balance)/i.test(
              text,
            )
              ? "credits"
              : status === 408 || status >= 500
                ? "down"
                : null))
          : /fetch|network|connection|load failed/i.test(text)
            ? "offline"
            : null;
      if (code != null)
        throw new Error(providers[active.provider].name, { cause: code });
      let detail = text.replace(/^\d{3}\s+/, "");
      try {
        const body = JSON.parse(text.slice(text.indexOf("{"))) as {
          error?: string | { message?: string };
          message?: string;
        };
        detail =
          (typeof body.error === "string" ? body.error : body.error?.message) ??
          body.message ??
          detail;
      } catch {}
      throw new Error(detail.slice(0, 200));
    }
    const price = (index: number) => {
      const value = rate?.[index] ?? -1;
      return Number.isFinite(value) && value >= 0 ? value : (rate?.[0] ?? 0);
    };
    const spent =
      result.cost ??
      (rate == null
        ? null
        : (result.inputTokens - result.cachedTokens - result.writtenTokens) *
            price(0) +
          result.cachedTokens * price(2) +
          result.writtenTokens * price(3) +
          result.outputTokens * price(1));
    tokens += result.inputTokens + result.outputTokens;
    cost = cost == null || spent == null ? null : cost + spent;

    const month = new Date().toISOString().slice(0, 7);
    const usage = await usageItem.getValue();
    const entry = usage[model];
    const current =
      entry?.month === month
        ? entry
        : { month, inputTokens: 0, outputTokens: 0, cost: null };
    await usageItem.setValue({
      ...usage,
      [model]: {
        month,
        inputTokens: current.inputTokens + result.inputTokens,
        outputTokens: current.outputTokens + result.outputTokens,
        cost: spent == null ? current.cost : (current.cost ?? 0) + spent,
      },
    });

    for (const term of result.terms) {
      const from = term.source.trim();
      const to = term.target.trim();
      if (from !== "" && to !== "" && !glossary.has(from))
        glossary.set(from, to);
    }
    return new Map(
      result.translations.map(({ id, text }) => [Number(id), text]),
    );
  };

  const first = await run(missing);
  for (const i of missing) {
    const text = first.get(i);
    if (text != null && tagsMatch(message.texts[i] ?? "", text))
      texts[i] = text;
  }
  await Promise.all(
    missing
      .filter((i) => texts[i] == null)
      .map(async (i) => {
        let translations: Map<number, string>;
        try {
          translations = await run([i]);
        } catch {
          return;
        }
        const text = translations.get(i);
        if (text != null && tagsMatch(message.texts[i] ?? "", text))
          texts[i] = text;
      }),
  );
  const line = /^((?:<x\d+>)*)([^<]*)((?:<\/x\d+>)*)$/;
  for (const i of missing) {
    const translated = texts[i]?.split(/(<x\d+\/>)/);
    const original = (message.texts[i] ?? "").split(/(<x\d+\/>)/);
    if (
      translated?.length !== original.length ||
      original.some((part, j) => j % 2 === 1 && part !== translated[j])
    )
      continue;
    texts[i] = translated
      .map((part, j) => {
        const from = j % 2 === 0 ? line.exec(original[j] ?? "") : null;
        const to = line.exec(part);
        const word = to?.[2]?.trim() ?? "";
        const rendering =
          from == null ? undefined : glossary.get(from[2]?.trim() ?? "");
        if (
          from == null ||
          rendering == null ||
          to == null ||
          word === "" ||
          from[1] !== to[1] ||
          from[3] !== to[3]
        )
          return part;
        const initial = word.charAt(0);
        const fitted =
          initial === initial.toLowerCase()
            ? rendering
            : rendering.charAt(0).toUpperCase() + rendering.slice(1);
        return `${to[1]}${to[2]?.replace(word, () => fitted) ?? ""}${to[3]}`;
      })
      .join("");
  }
  if (!isPrivate)
    void remember(
      missing.flatMap((i) => {
        const text = texts[i];
        return text == null ? [] : [[parts(message.texts[i] ?? ""), text]];
      }),
    );
  if (!isPrivate && glossary.size > learned)
    void remember([[termsKey, JSON.stringify([...glossary].slice(0, 600))]]);
  return { texts, terms: [...glossary], tokens, cost };
}

async function handle(
  message: BackgroundMessage,
  isPrivate: boolean,
): Promise<Result<unknown>> {
  switch (message.type) {
    case "draft": {
      const { source, target } = message;
      const active = connection(await readSettings());
      const model =
        active == null ? null : `${active.provider}/${active.model}`;
      const [refined, drafted] = await Promise.all([
        model == null
          ? message.tagged.map(() => null)
          : recall(
              message.tagged.map((text) => [
                "refined",
                model,
                source,
                target,
                text,
              ]),
              !isPrivate,
            ),
        recall(
          message.html.map((text) => ["html", "device", source, target, text]),
          !isPrivate,
        ),
      ]);
      const missing = message.html.flatMap((_, i) =>
        refined[i] == null && drafted[i] == null ? [i] : [],
      );
      if (missing.length > 0) {
        const html = missing.map((i) => message.html[i] ?? "");
        const response = await draftOnDevice(source, target, html);
        if (!response.ok) return response;
        for (const [j, i] of missing.entries())
          drafted[i] = response.value[j] ?? "";
        if (!isPrivate)
          void remember(
            missing.map((i, j) => [
              ["html", "device", source, target, html[j] ?? ""],
              drafted[i] ?? "",
            ]),
          );
      }
      return {
        ok: true,
        value: message.html.map((_, i) => {
          const text = refined[i];
          return text == null
            ? { text: drafted[i] ?? "", isRefined: false }
            : { text, isRefined: true };
        }),
      };
    }
    case "refine": {
      return { ok: true, value: await refine(message, isPrivate) };
    }
    case "forget": {
      await forget();
      return { ok: true, value: null };
    }
    case "languages": {
      if (!hasOffscreen) return { ok: true, value: await languages() };
      await ensureOffscreen();
      return sendToExtension({ to: "offscreen", type: "languages" });
    }
    case "strings": {
      const { locale } = message;
      const inputs = new Proxy({}, { get: (_, name) => `{${String(name)}}` });
      return {
        ok: true,
        value: Object.fromEntries(
          Object.entries(strings).map(([key, render]) => [
            key,
            (
              render as (
                inputs: unknown,
                options: { locale: typeof locale },
              ) => string
            )(inputs, { locale }),
          ]),
        ),
      };
    }
    case "options": {
      await browser.runtime.openOptionsPage();
      return { ok: true, value: null };
    }
    case "detect": {
      return {
        ok: true,
        value: (await browser.runtime.sendNativeMessage("io.dragoman.app", {
          type: "detect",
          text: message.text,
        })) as Detection,
      };
    }
  }
}

export default defineBackground(() => {
  if (!hasOffscreen)
    (globalThis as { importScripts?: (url: string) => void }).importScripts?.(
      browser.runtime.getURL("/bergamot/bergamot-translator.js"),
    );

  browser.runtime.onMessage.addListener(
    (
      message: { to?: string },
      sender,
      sendResponse: (response: Result<unknown>) => void,
    ) => {
      if (message.to !== "background") return false;
      void (async () => {
        try {
          sendResponse(
            await handle(
              message as BackgroundMessage,
              sender.tab?.incognito === true,
            ),
          );
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            ...(error instanceof Error &&
              typeof error.cause === "string" && {
                code: error.cause as NonNullable<Status["error"]>["code"],
              }),
          });
        }
      })();
      return true;
    },
  );

  void (async () => {
    if (await storage.getItem<boolean>("session:awake")) return;
    await hiddenItem.removeValue();
    await storage.setItem("session:awake", true);
  })();

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install")
      void browser.tabs.create({
        url: browser.runtime.getURL("/options.html#welcome"),
      });
  });

  if (!Reflect.has(browser, "commands")) return;
  browser.commands.onCommand.addListener((command) => {
    if (command !== "toggle-translation") return;
    void (async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id == null) return;
      try {
        await browser.tabs.sendMessage(tab.id, {
          to: "content",
          type: "toggle",
        });
      } catch {}
    })();
  });
});
