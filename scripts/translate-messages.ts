import Anthropic from "@anthropic-ai/sdk";
import { locales as names } from "@dragoman/brand/locales";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { parseEnv } from "node:util";
import { z } from "zod";

const MODEL = "claude-opus-5-5";
const PRICE = {
  input: 2 / 1_000_000,
  cacheWrite: 4 / 1_000_000,
  cacheRead: 0.1 / 1_000_000,
  output: 10 / 1_000_000,
};

const env = parseEnv(
  readFileSync(`${homedir()}/.config/dragoman/.env`, "utf8"),
);
const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  defaultHeaders:
    env.ANTHROPIC_WORKSPACE_ID == null
      ? {}
      : { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID },
});

const source = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  string
>;
const { $schema, ...english } = source;
const PROTECTED =
  /\{\w+\}|dragoman\.io|dragoman|Helium|Chromium|Chrome|Edge|Brave|Arc|Bergamot|Firefox Translations|Firefox Add-ons|Firefox|Safari|App Store|Apple|Windows|Mac|Linux|Android|iPhone|iPad|Mozilla|Anthropic|OpenAI|Gemini|OpenRouter|Ollama|LM Studio|Claude|MIT|CORS|OLLAMA_ORIGINS|gemma3|helium:\/\/extensions|chrome:\/\/extensions|Alt\+Shift\+T|Option\+Shift\+T|localhost|chat completions|API|AI/g;
const Output = z.object({
  translations: z.array(z.object({ key: z.string(), text: z.string() })),
});
const placeholders = (text: string) =>
  text
    .matchAll(/\{(\w+)\}/g)
    .map((match) => match[1] ?? "")
    .toArray()
    .toSorted((a, b) => a.localeCompare(b))
    .join(",");

const SYSTEM = `You translate the user interface and website of dragoman, a browser extension that translates web pages in place. A local engine drafts each paragraph on the device, then an AI model the user chooses refines it. The brand draws on the dragomans, interpreters of the Ottoman court.

Translate every value of the JSON object you receive into the requested language. Return one entry per key, using the same keys.

Rules:
- Write the way a skilled native localizer would for a polished consumer product: natural, warm, concise, plain. Never translate word for word. Keep sentence case, and match the length of the English where you can.
- Keep every placeholder in curly braces exactly as written, untranslated, and keep every one of them.
- Never translate or inflect these: dragoman (always lowercase), Helium, Chrome, Chromium, Edge, Brave, Arc, Bergamot, Firefox Translations, Firefox, Safari, Mozilla, Anthropic, Anthropic Console, OpenAI, Google Gemini, OpenRouter, Ollama, LM Studio, Claude, Gemini, MIT, CORS, OLLAMA_ORIGINS, gemma3, dragoman.zip, localhost:1234, helium://extensions, chrome://extensions, Alt+Shift+T, Option+Shift+T, ⌥⇧T. Keep "dil oğlanı" as is in Latin-script languages, and write it in the target script otherwise.
- Translate the names of interface elements consistently: "Translate page", "Show original", "Settings", "Load unpacked", "Developer mode", "Connect with OpenRouter", "Usage", "Workspaces". For browser UI such as "Load unpacked" and "Developer mode", use the wording Chromium itself uses in that language, and for "Pin to Toolbar" the wording Firefox uses.
- The six dragoman characters are equals, and each name is a title for one person, never an abstract noun, a group or an institution. In languages with grammatical gender, match how each figure is drawn: The Grand Dragoman and The Apprentice are men; The Envoy, The Kira and The Calligrapher are women; The Scholar is drawn as neither, so use a noun or construction that is not gendered and reads naturally (for example a common-gender or grammatically neuter noun, or no article), and avoid stilted fixes such as adding a word for person, gender stars or slashes. Never make one sound senior to the others.
- Language names stay as written in the source, except that you write them the way speakers of the target language name them.
- Keys starting with demo_ show a foreign web page being translated into the target language. Each key ending in _draft is a deliberately stiff, word-for-word machine draft: keep it understandable but awkward, with literal word order and clumsy phrasing typical of a quick on-device engine in the target language. Its partner ending in _refined says the same thing naturally and idiomatically, as a native editor would. The two must always read clearly differently.
- Brand names such as Chrome, Firefox, Safari, Edge, Brave, Arc, Android, iPhone, iPad, Mac, Windows and Linux stay as they are.
- language_bcms names the one language shared by Bosnians, Croats, Montenegrins and Serbs: give the four names as the target language usually writes them, joined by slashes without spaces and in that language's alphabetical order, never as Serbo-Croatian or any single name.
- Script and variety: Ottoman Turkish (ota) in Ottoman Arabic script with period-appropriate vocabulary, writing kef as ك (U+0643) for both the k and g sounds, never ک or گ; Kurmanji (kmr) in Latin script; Sorani (ckb) in Arabic script; Serbian (sr) in Cyrillic; Uzbek (uz), Azerbaijani (az) and Turkmen (tk) in Latin; Kazakh (kk) and Mongolian (mn) in Cyrillic; Punjabi (pa) in Gurmukhi; zh-CN in Simplified and zh-TW in Traditional Chinese with Taiwan usage; pt-BR and pt-PT each with their own usage; nb is Norwegian Bokmål.`;

function isAcceptable(locale: string, key: string, text: string) {
  const original = english[key];
  if (
    original == null ||
    text.trim() === "" ||
    placeholders(text) !== placeholders(original)
  )
    return false;
  const stripped = text.replaceAll(PROTECTED, " ");
  if (
    stripped
      .split(/\s+/)
      .some(
        (word) =>
          /\p{Script=Latin}/u.test(word) && /\p{Script=Arabic}/u.test(word),
      )
  )
    return false;
  const letters = stripped.replaceAll(/\P{L}/gu, "");
  const latin = letters.replaceAll(/\P{Script=Latin}/gu, "").length;
  return (
    locale !== "ota" || letters.length < 8 || latin / letters.length < 0.25
  );
}

const requested = process.argv.slice(2).filter((arg) => arg !== "--");
const targets = Object.keys(names).filter(
  (locale) =>
    locale !== "en" && (requested.length === 0 || requested.includes(locale)),
);
const states = targets.map((locale) => {
  const path = `messages/${locale}.json`;
  const saved = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, string>)
    : {};
  return {
    locale,
    path,
    existing: Object.fromEntries(
      Object.entries(saved).filter(([key]) => key !== "$schema"),
    ),
  };
});
const missingFrom = (existing: Record<string, string>) =>
  Object.keys(english).filter((key) => existing[key] == null);
const totals = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };

for (let round = 1; round <= 3; round++) {
  const pending = states.filter(
    ({ existing }) => missingFrom(existing).length > 0,
  );
  if (pending.length === 0) break;
  const batch = await client.messages.batches.create({
    requests: pending.map(({ locale, existing }) => {
      const reference = Object.fromEntries(
        Object.entries(existing).slice(0, 40),
      );
      const input = Object.fromEntries(
        missingFrom(existing).map((key) => [key, english[key] ?? ""]),
      );
      return {
        custom_id: locale,
        params: {
          model: MODEL,
          max_tokens: 32_000,
          system: [
            {
              type: "text",
              text: SYSTEM,
              cache_control: { type: "ephemeral", ttl: "1h" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `Target language: ${(names as Record<string, string>)[locale] ?? locale} (${locale})\n\n${Object.keys(reference).length === 0 ? "" : `Existing translations in this language. Match their script, terminology and tone:\n${JSON.stringify(reference, null, 2)}\n\nTranslate these:\n`}${JSON.stringify(input, null, 2)}`,
            },
          ],
          output_config: {
            effort: "low",
            format: { type: "json_schema", schema: z.toJSONSchema(Output) },
          },
        },
      };
    }),
  });
  process.stdout.write(
    `Round ${round}: batch ${batch.id} for ${pending.length} locales\n`,
  );
  let status = batch;
  while (status.processing_status !== "ended") {
    await sleep(30_000);
    status = await client.messages.batches.retrieve(batch.id);
    process.stdout.write(
      `  ${pending.length - status.request_counts.processing} of ${pending.length} finished\n`,
    );
  }
  const results = await client.messages.batches.results(batch.id);
  for await (const { custom_id, result } of results) {
    const state = states.find(({ locale }) => locale === custom_id);
    if (state == null) continue;
    if (result.type !== "succeeded") {
      console.error(`${custom_id}: ${result.type}`);
      continue;
    }
    const { message } = result;
    totals.input += message.usage.input_tokens;
    totals.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
    totals.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    totals.output += message.usage.output_tokens;
    if (message.stop_reason !== "end_turn") {
      console.error(
        `${custom_id} stopped early: ${message.stop_reason ?? "unknown"}`,
      );
      continue;
    }
    let text = "";
    for (const block of message.content)
      if (block.type === "text") text += block.text;
    try {
      const { translations } = Output.parse(JSON.parse(text));
      for (const translation of translations)
        if (isAcceptable(custom_id, translation.key, translation.text))
          state.existing[translation.key] =
            custom_id === "ota"
              ? translation.text.replaceAll(/[کگ]/gu, "ك")
              : translation.text;
    } catch (error) {
      console.error(
        `${custom_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

const failures: Array<string> = [];
for (const { locale, path, existing } of states) {
  const ordered: Record<string, string> = { $schema: $schema ?? "" };
  for (const key of Object.keys(english))
    if (existing[key] != null) ordered[key] = existing[key];
  writeFileSync(path, `${JSON.stringify(ordered, null, 2)}\n`);
  const missing = missingFrom(existing).length;
  if (missing > 0) failures.push(`${locale} (${missing})`);
}
process.stdout.write(
  `\n${targets.length} locales, ${totals.input} input, ${totals.cacheWrite} cache write, ${totals.cacheRead} cache read and ${totals.output} output tokens, about $${(totals.input * PRICE.input + totals.cacheWrite * PRICE.cacheWrite + totals.cacheRead * PRICE.cacheRead + totals.output * PRICE.output).toFixed(2)}\n`,
);
if (failures.length > 0)
  process.stdout.write(`Incomplete: ${failures.join("; ")}\n`);
