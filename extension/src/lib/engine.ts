import { browser } from "wxt/browser";
import type { Languages } from "#lib/messages.ts";

type Vector<T> = {
  push_back: (value: T) => void;
  size: () => number;
  get: (index: number) => T;
  delete: () => void;
};
type AlignedMemory = { getByteArrayView: () => Uint8Array };
type TranslationModel = { delete: () => void };
type ResponseOptions = {
  qualityScores: boolean;
  alignment: boolean;
  html: boolean;
};
type TranslationResponse = { getTranslatedText: () => string };
type Bergamot = {
  AlignedMemory: new (size: number, alignment: number) => AlignedMemory;
  AlignedMemoryList: new () => Vector<AlignedMemory>;
  TranslationModel: new (
    from: string,
    to: string,
    config: string,
    model: AlignedMemory,
    lex: AlignedMemory | null,
    vocabs: Vector<AlignedMemory>,
    quality: null,
  ) => TranslationModel;
  BlockingService: new (options: { cacheSize: number }) => {
    translate: (
      model: TranslationModel,
      messages: Vector<string>,
      options: Vector<ResponseOptions>,
    ) => Vector<TranslationResponse>;
    translateViaPivoting: (
      first: TranslationModel,
      second: TranslationModel,
      messages: Vector<string>,
      options: Vector<ResponseOptions>,
    ) => Vector<TranslationResponse>;
  };
  VectorString: new () => Vector<string>;
  VectorResponseOptions: new () => Vector<ResponseOptions>;
};
type FileType =
  | "model"
  | "lexicalShortlist"
  | "vocab"
  | "srcVocab"
  | "trgVocab";
type ModelFile = { path: string; uncompressedHash?: string };
type Registry = {
  baseUrl: string;
  models: Record<
    string,
    Array<{
      releaseStatus: string | null;
      files: Partial<Record<FileType, ModelFile>>;
    }>
  >;
};

declare global {
  function loadBergamot(module: {
    wasmBinary: ArrayBuffer;
    print: (text: string) => void;
    printErr: (text: string) => void;
    onAbort: (reason: unknown) => void;
    onRuntimeInitialized: () => void;
  }): Bergamot;
}

const REGISTRY_URL =
  "https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/db/models.json";
const RELEASED = new Set(["Release", "Release Desktop"]);
const REGISTRY_CODES: Record<string, string> = {
  "zh-Hans": "zh",
  "zh-Hant": "zh_hant",
};
const FILE_TYPES = [
  "model",
  "lexicalShortlist",
  "vocab",
  "srcVocab",
  "trgVocab",
] as const;
const ALIGNMENTS: Record<FileType, number> = {
  model: 256,
  lexicalShortlist: 64,
  vocab: 64,
  srcVocab: 64,
  trgVocab: 64,
};

const pending: {
  engine?: Promise<{
    bergamot: Bergamot;
    service: InstanceType<Bergamot["BlockingService"]>;
  }>;
  registry?: Promise<Registry>;
} = {};

async function loadEngine() {
  if (!("loadBergamot" in globalThis))
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = browser.runtime.getURL("/bergamot/bergamot-translator.js");
      script.addEventListener("load", resolve);
      script.addEventListener("error", reject);
      document.head.append(script);
    });
  const response = await fetch(
    browser.runtime.getURL("/bergamot/bergamot-translator.wasm"),
  );
  const wasmBinary = await response.arrayBuffer();
  const bergamot = await new Promise<Bergamot>((resolve, reject) => {
    const module = loadBergamot({
      wasmBinary,
      print: () => {},
      printErr: () => {},
      onAbort: reject,
      onRuntimeInitialized: () => {
        resolve(module);
      },
    });
  });
  return { bergamot, service: new bergamot.BlockingService({ cacheSize: 0 }) };
}

async function getEngine() {
  pending.engine ??= loadEngine();
  try {
    return await pending.engine;
  } catch (error) {
    delete pending.engine;
    throw error;
  }
}

const models = new Map<string, Promise<TranslationModel | null>>();

async function fetchRegistry() {
  const cache = await caches.open("dragoman-models");
  try {
    const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Registry returned ${response.status}`);
    await cache.put(REGISTRY_URL, response.clone());
    return (await response.json()) as Registry;
  } catch (error) {
    const cached = await cache.match(REGISTRY_URL);
    if (cached == null) throw error;
    return (await cached.json()) as Registry;
  }
}

async function getRegistry() {
  pending.registry ??= fetchRegistry();
  try {
    return await pending.registry;
  } catch (error) {
    delete pending.registry;
    throw error;
  }
}

async function fetchFile(url: string, file: ModelFile) {
  const cache = await caches.open("dragoman-models");
  const cached = await cache.match(url);
  if (cached != null) return cached.arrayBuffer();
  const response = await fetch(url);
  if (!response.ok || response.body == null)
    throw new Error(`Couldn't download ${file.path} (${response.status})`);
  const bytes = await new Response(
    response.body.pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
  if (file.uncompressedHash != null) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (hash !== file.uncompressedHash)
      throw new Error(`Checksum mismatch for ${file.path}`);
  }
  await cache.put(url, new Response(bytes));
  return bytes;
}

async function loadModel(
  from: string,
  to: string,
): Promise<TranslationModel | null> {
  const { baseUrl, models: registry } = await getRegistry();
  const entry = registry[
    `${REGISTRY_CODES[from] ?? from}-${REGISTRY_CODES[to] ?? to}`
  ]?.find((candidate) => RELEASED.has(candidate.releaseStatus ?? ""));
  if (entry == null) return null;

  const { bergamot } = await getEngine();
  const memory = new Map<FileType, AlignedMemory>();
  for (const fileType of FILE_TYPES) {
    const file = entry.files[fileType];
    if (file == null) continue;
    const bytes = new Uint8Array(
      await fetchFile(`${baseUrl}/${file.path}`, file),
    );
    const aligned = new bergamot.AlignedMemory(
      bytes.byteLength,
      ALIGNMENTS[fileType],
    );
    aligned.getByteArrayView().set(bytes);
    memory.set(fileType, aligned);
  }

  const model = memory.get("model");
  const vocabs = new bergamot.AlignedMemoryList();
  for (const fileType of ["vocab", "srcVocab", "trgVocab"] as const) {
    const vocab = memory.get(fileType);
    if (vocab != null) vocabs.push_back(vocab);
  }
  if (model == null || vocabs.size() === 0)
    throw new Error(`Incomplete model files for ${from}→${to}`);

  const config = Object.entries({
    "beam-size": "1",
    normalize: "1.0",
    "word-penalty": "0",
    "max-length-break": "128",
    "mini-batch-words": "1024",
    workspace: "128",
    "max-length-factor": "2.0",
    "skip-cost": "true",
    "cpu-threads": "0",
    quiet: "true",
    "quiet-translation": "true",
    "gemm-precision":
      entry.files.model?.path.includes("intgemm8.") === true
        ? "int8shiftAll"
        : "int8shiftAlphaAll",
    alignment: "soft",
  })
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return new bergamot.TranslationModel(
    from,
    to,
    config,
    model,
    memory.get("lexicalShortlist") ?? null,
    vocabs,
    null,
  );
}

async function getModel(from: string, to: string) {
  const key = `${from}-${to}`;
  let model = models.get(key);
  if (model == null) {
    model = loadModel(from, to);
    models.set(key, model);
  }
  try {
    return await model;
  } catch (error) {
    models.delete(key);
    throw error;
  }
}

export async function languages(): Promise<Languages> {
  const { models: registry } = await getRegistry();
  const codes = Object.fromEntries(
    Object.entries(REGISTRY_CODES).map(([code, registryCode]) => [
      registryCode,
      code,
    ]),
  );
  const sources = new Set(["en"]);
  const targets = new Set(["en"]);
  for (const [pair, entries] of Object.entries(registry)) {
    if (entries.every((entry) => !RELEASED.has(entry.releaseStatus ?? "")))
      continue;
    const [from = "", to = ""] = pair.split("-", 2);
    if (to === "en") sources.add(codes[from] ?? from);
    if (from === "en") targets.add(codes[to] ?? to);
  }
  return {
    sources: [...sources].toSorted((a, b) => a.localeCompare(b)),
    targets: [...targets].toSorted((a, b) => a.localeCompare(b)),
  };
}

export async function translate({
  source,
  target,
  html,
}: {
  source: string;
  target: string;
  html: Array<string>;
}) {
  const { bergamot, service } = await getEngine();
  const direct = await getModel(source, target);
  const [first, second] =
    direct == null && source !== "en" && target !== "en"
      ? await Promise.all([getModel(source, "en"), getModel("en", target)])
      : [null, null];
  const run =
    direct != null
      ? (messages: Vector<string>, options: Vector<ResponseOptions>) =>
          service.translate(direct, messages, options)
      : first != null && second != null
        ? (messages: Vector<string>, options: Vector<ResponseOptions>) =>
            service.translateViaPivoting(first, second, messages, options)
        : null;
  if (run == null) throw new Error(`No local model for ${source}→${target}`);

  const messages = new bergamot.VectorString();
  const options = new bergamot.VectorResponseOptions();
  for (const text of html) {
    messages.push_back(text);
    options.push_back({ qualityScores: false, alignment: true, html: true });
  }
  const responses = run(messages, options);
  const translations = Array.from({ length: responses.size() }, (_, i) =>
    responses.get(i).getTranslatedText(),
  );
  messages.delete();
  options.delete();
  responses.delete();
  return translations;
}
