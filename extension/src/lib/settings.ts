import { storage } from "wxt/utils/storage";
import type { Connection, ProviderId } from "#lib/providers.ts";
import { normalizeLanguage } from "#lib/messages.ts";
import { providers } from "#lib/providers.ts";

export const characters = [
  "grand",
  "envoy",
  "apprentice",
  "scholar",
  "kira",
  "calligrapher",
] as const;

export type Settings = {
  targetLanguage: string;
  interfaceLanguage: string;
  provider: ProviderId | "none";
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
  shortlist: Partial<Record<ProviderId, Array<string>>>;
  deviceOnly: boolean;
  baseUrls: Partial<Record<ProviderId, string>>;
  anthropicWorkspaceId: string;
  character: (typeof characters)[number];
  showOriginalOnHover: boolean;
  showBadge: boolean;
  animate: boolean;
  alwaysLanguages: Array<string>;
  neverSites: Array<string>;
  offerTranslation: boolean;
  knownLanguages: Array<string>;
  showCost: boolean;
  draftLocally: boolean;
  wholePage: boolean;
  companion: boolean;
};

export type Usage = Record<
  string,
  {
    month: string;
    inputTokens: number;
    outputTokens: number;
    cost: number | null;
  }
>;

export const settingsItem = storage.defineItem<Partial<Settings>>(
  "local:settings",
  { fallback: {} },
);

export const petItem = storage.defineItem<{
  edge: "top" | "bottom" | "left" | "right";
  offset: number;
  greeted: number;
}>("local:pet", { fallback: { edge: "bottom", offset: 0.06, greeted: 0 } });

export const hiddenItem = storage.defineItem<boolean>("local:hidden", {
  fallback: false,
});

export const usageItem = storage.defineItem<Usage>("local:usage", {
  fallback: {},
});

export async function readSettings(): Promise<Settings> {
  return {
    targetLanguage: navigator.language.split("-", 1)[0] ?? "en",
    interfaceLanguage: "auto",
    provider: "none",
    keys: {},
    models: {},
    shortlist: {},
    deviceOnly: false,
    baseUrls: {},
    anthropicWorkspaceId: "",
    character: "grand",
    showOriginalOnHover: true,
    showBadge: true,
    animate: true,
    alwaysLanguages: [],
    neverSites: [],
    offerTranslation: true,
    knownLanguages: [
      ...new Set(navigator.languages.map((code) => normalizeLanguage(code))),
    ],
    showCost: false,
    draftLocally: true,
    wholePage: false,
    companion: false,
    ...(await settingsItem.getValue()),
  };
}

export function connection(settings: Settings): Connection | null {
  if (settings.provider === "none" || settings.deviceOnly) return null;
  const model = settings.models[settings.provider] ?? "";
  if (model === "") return null;
  return {
    provider: settings.provider,
    key: settings.keys[settings.provider] ?? "",
    model,
    baseUrl:
      settings.baseUrls[settings.provider] ??
      providers[settings.provider].baseUrl,
    workspace: settings.anthropicWorkspaceId,
  };
}

export function choices(settings: Settings) {
  return (Object.keys(providers) as Array<ProviderId>).flatMap((provider) =>
    (providers[provider].keyPattern != null &&
      (settings.keys[provider] ?? "") === "") ||
    (settings.baseUrls[provider] ?? providers[provider].baseUrl) === ""
      ? []
      : [
          ...new Set([
            settings.models[provider] ?? "",
            ...(settings.shortlist[provider] ?? []),
          ]),
        ]
          .filter((model) => model !== "")
          .map((model) => ({ provider, model })),
  );
}

export function pick(
  settings: Settings,
  provider: ProviderId,
  model: string,
): Partial<Settings> {
  return {
    provider,
    models: { ...settings.models, [provider]: model },
    shortlist: {
      ...settings.shortlist,
      [provider]: choices(settings)
        .filter((choice) => choice.provider === provider)
        .map((choice) => choice.model),
    },
    deviceOnly: false,
  };
}

const isCovered = (site: string, host: string) =>
  host === site || host.endsWith(`.${site}`);

export function exclusion(host: string, neverSites: Array<string>) {
  const name = host.toLowerCase();
  const bare = name.replace(/^www\./, "");
  const labels = bare.split(".");
  const isAddress = /^[\d.]+$/.test(bare) || bare.includes(":");
  const isShared =
    labels.at(-1)?.length === 2 &&
    /^(?:ac|co|com|edu|gob|go|gouv|gov|ltd|mil|ne|net|nic|or|org|plc)$/.test(
      labels.at(-2) ?? "",
    );
  const domain =
    isAddress || labels.length < 3
      ? bare
      : labels.slice(isShared ? -3 : -2).join(".");
  const site = neverSites.find((entry) => isCovered(entry, name)) ?? null;
  const first = site == null || site === domain ? bare : site;
  const scopes: [string, ...Array<string>] =
    first === domain ? [domain] : [first, domain];
  return {
    scopes,
    site,
    choose: (scope: string | null) => [
      ...neverSites.filter(
        (site) =>
          !isCovered(site, name) && (scope == null || !isCovered(scope, site)),
      ),
      ...(scope == null ? [] : [scope]),
    ],
  };
}
