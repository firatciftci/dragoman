import type { Attachment } from "svelte/attachments";
import { on } from "svelte/events";
import type { Status } from "#lib/messages.ts";
import type { Settings } from "#lib/settings.ts";
import type { strings } from "#lib/strings.ts";

export type Inspect = {
  key: number;
  text: string;
  locate: () => DOMRect | null;
  mark: (isOn: boolean) => void;
  retry: (() => Promise<void>) | null;
};

const templates = $state<Record<string, string>>({});

export const learn = (next: Record<string, string>) => {
  Object.assign(templates, next);
};

const initial: {
  character: Settings["character"];
  mode: "device" | "cloud" | "hybrid";
  phase: "hidden" | "offer" | "active" | "paused";
} = { character: "grand", mode: "device", phase: "hidden" };

export const view = $state({
  ...initial,
  locale: "en",
  isCompanion: false,
  isHidden: false,
  isUndoable: false,
  isBadgeShown: true,
  isAnimated: true,
  isShowCost: false,
  isShowOriginal: true,
  model: "",
  choices: [] as Array<{
    value: string;
    model: string;
    provider: string;
    logo: string;
  }>,
  choice: "",
  isDeviceOnly: false,
  source: null as string | null,
  target: "en",
  isAlwaysTranslated: false,
  isPanelOpen: false,
  isFollowing: true,
  isWholePage: false,
  total: 0,
  translated: 0,
  refined: 0,
  words: 0,
  near: 0,
  nearDrafted: 0,
  nearDone: 0,
  isBusy: false,
  tokens: 0,
  cost: null as number | null,
  error: null as Status["error"],
  pointing: null as Inspect | null,
  tapped: null as { inspect: Inspect; x: number; y: number } | null,
  selection: null as { language: string; locate: () => DOMRect | null } | null,
  tip: null as { node: HTMLElement; text: () => string; rect: DOMRect } | null,
});

const recent = { hidden: 0 };

export const hint =
  (text: () => string): Attachment<HTMLElement> =>
  (node) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        view.tip = { node, text, rect: node.getBoundingClientRect() };
      }, delay);
    };
    const hide = () => {
      clearTimeout(timer);
      if (view.tip?.node !== node) return;
      view.tip = null;
      recent.hidden = Date.now();
    };
    const offs = [
      on(node, "pointerenter", (event) => {
        if (event.pointerType === "mouse")
          show(Date.now() - recent.hidden < 400 ? 0 : 500);
      }),
      on(node, "pointerleave", hide),
      on(node, "pointerdown", hide),
      on(node, "focus", () => {
        if (node.matches(":focus-visible")) show(0);
      }),
      on(node, "blur", hide),
      on(globalThis, "scroll", hide, { capture: true, passive: true }),
    ];
    return () => {
      hide();
      for (const off of offs) off();
    };
  };

export const actions = {} as {
  translate: () => void;
  translateSelection: () => void;
  restore: () => void;
  hide: (isHidden: boolean) => void;
  follow: (isOn: boolean) => void;
  translateAll: () => void;
  openSettings: () => void;
  always: () => void;
  known: () => void;
  pick: (value: string) => void;
  deviceOnly: (isOn: boolean) => void;
  languageOf: (text: string) => Promise<string | null>;
  translateText: (
    text: string,
  ) => Promise<{ text: string; language: string } | null>;
};

export const m = new Proxy({} as typeof strings, {
  get:
    (_, key) =>
    (inputs: Record<string, unknown> = {}) =>
      (templates[String(key)] ?? "").replaceAll(
        /\{(\w+)\}/g,
        (match, name: string) => String(inputs[name] ?? match),
      ),
});
