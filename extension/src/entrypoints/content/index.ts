import { mount, unmount } from "svelte";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { ContentMessage, Detection, Status } from "#lib/messages.ts";
import type { ProviderId } from "#lib/providers.ts";
import type { Settings } from "#lib/settings.ts";
import {
  languageKey,
  normalizeLanguage,
  sendToExtension,
} from "#lib/messages.ts";
import { getLocale, isLocale, setLocale } from "#lib/paraglide/runtime.js";
import { providers } from "#lib/providers.ts";
import {
  choices,
  connection,
  exclusion,
  hiddenItem,
  pick,
  readSettings,
  settingsItem,
} from "#lib/settings.ts";
import type { Inspect } from "./view.svelte.ts";
import Ui from "./ui.svelte";
import { actions, learn, view } from "./view.svelte.ts";

type Block = {
  parent: Element;
  original: Array<ChildNode>;
  nodes: Array<ChildNode>;
  elements: Array<Element>;
  children: Map<Element, Array<Node>>;
  texts: Map<Text, string>;
  pools: Map<Node, Array<Text>>;
  html: string;
  tagged: string;
  source: string;
  edges: [string, string];
  state: "pending" | "drafting" | "drafted" | "refining" | "done";
  translated: boolean;
  refined: boolean;
  near: boolean;
  pinned: boolean;
  distance: number;
  words: number | null;
  key: number;
  range: Range | null;
};

type Piece = string | { id: number; children: Array<Piece> };

const SKIP = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "pre",
  "textarea",
  "select",
  "svg",
  "math",
  "canvas",
  "video",
  "audio",
  "iframe",
  "object",
  "head",
  "dragoman-ui",
]);
const INVISIBLE = new Set([
  "link",
  "meta",
  "script",
  "style",
  "noscript",
  "template",
]);
const ATOMIC = new Set([
  ...INVISIBLE,
  "br",
  "wbr",
  "img",
  "svg",
  "math",
  "code",
  "kbd",
  "samp",
  "var",
  "picture",
  "input",
  "select",
  "textarea",
  "video",
  "audio",
  "canvas",
  "iframe",
  "object",
]);
const INLINE = new Set([
  ...ATOMIC,
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "data",
  "del",
  "dfn",
  "em",
  "font",
  "i",
  "ins",
  "label",
  "mark",
  "q",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
]);
const LITERAL = new Set(["code", "kbd", "samp", "var"]);
const ENGINE_INLINE = new Set([
  "a",
  "abbr",
  "b",
  "del",
  "em",
  "i",
  "ins",
  "mark",
  "q",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
]);
const BLOCK_SELECTOR =
  "address,article,aside,blockquote,button,details,dialog,dd,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,table,td,th,tr,ul";
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const HIGHLIGHT_CSS = `::highlight(dragoman-draft) { text-decoration: underline dotted rgb(224 172 62 / 0.85); text-decoration-thickness: 2px; text-underline-offset: 4px; }
::highlight(dragoman-focus) { background-color: rgb(224 172 62 / 0.24); }`;
const OBSERVED = { childList: true, subtree: true, characterData: true };

function isSkipped(element: Element) {
  return (
    SKIP.has(element.localName) ||
    element.getAttribute("translate") === "no" ||
    element.classList.contains("notranslate") ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function isAtomic(element: Element) {
  return ATOMIC.has(element.localName) || isSkipped(element);
}

function isSpacer(element: Element) {
  return (
    element.childElementCount === 0 &&
    element.textContent !== "" &&
    element.textContent.trim() === ""
  );
}

function atomicText(element: Element) {
  if (element.localName === "br") return "\n";
  return INVISIBLE.has(element.localName) ? "" : element.textContent;
}

function isInline(element: Element) {
  return (
    (INLINE.has(element.localName) ||
      (element.localName.includes("-") &&
        ["inline", "contents"].includes(getComputedStyle(element).display))) &&
    (isAtomic(element) || element.querySelector(BLOCK_SELECTOR) == null)
  );
}

function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parse(text: string, format: "html" | "tagged"): Array<Piece> | null {
  const root: Array<Piece> = [];
  const stack: Array<{ id: number; children: Array<Piece> }> = [];
  const pattern =
    format === "tagged"
      ? /<(\/?)x(\d+)(\/?)>/g
      : /<(\/?)([a-z][\w-]*)([^\w>-][^>]*)?>/gi;
  let last = 0;
  const pushText = (raw: string) => {
    const decoded = raw.replaceAll(
      /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
      (entity, name: string) => {
        if (name.startsWith("#x") || name.startsWith("#X"))
          return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
        if (name.startsWith("#"))
          return String.fromCodePoint(Number(name.slice(1)));
        return ENTITIES[name.toLowerCase()] ?? entity;
      },
    );
    if (decoded !== "") (stack.at(-1)?.children ?? root).push(decoded);
  };
  for (const match of text.matchAll(pattern)) {
    pushText(text.slice(last, match.index));
    last = match.index + match[0].length;
    const [, closing, name = "", rest = ""] = match;
    if (closing === "/") {
      if (stack.pop() == null) return null;
      continue;
    }
    const id = Number(
      format === "tagged" ? name : (/data-x="(\d+)"/.exec(rest)?.[1] ?? ""),
    );
    const piece = { id, children: [] };
    (stack.at(-1)?.children ?? root).push(piece);
    const isSelfClosing =
      format === "tagged"
        ? rest === "/"
        : ["br", "img", "wbr"].includes(name.toLowerCase()) ||
          rest.endsWith("/");
    if (!isSelfClosing) stack.push(piece);
  }
  pushText(text.slice(last));
  return stack.length === 0 ? root : null;
}

function textLength(piece: Piece): number {
  if (typeof piece === "string") return piece.trim().length;
  let length = 0;
  for (const child of piece.children) length += textLength(child);
  return length;
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main(ctx) {
    let blocks: Array<Block> = [];
    let blocksByParent = new Map<Node, Array<Block>>();
    let owned = new WeakSet<Node>();
    let textBlocks = new WeakMap<Node, Block>();
    let isActive = false;
    let isEverything = false;
    let isSelective = false;
    let picked: Range | null = null;
    let selectionTimer: ReturnType<typeof setTimeout> | undefined;
    let session = 0;
    let keys = 0;
    let source: string | null = null;
    let target: string | null = null;
    let error: Status["error"] = null;
    let provider = "none";
    let isDraftUnavailable = false;
    let isDrafting = false;
    let refining = 0;
    let changeTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let lastY = window.scrollY;
    let direction = 1;
    let hovered: Block | null = null;
    let touched = 0;
    let tap: { x: number; y: number; time: number } | null = null;
    let spent: { tokens: number; cost: number | null } = { tokens: 0, cost: 0 };
    let ui: { host: HTMLElement; app: ReturnType<typeof mount> } | null = null;
    let segmenter: Intl.Segmenter | null = null;
    let learned = "";
    let isSeeded = false;
    let outline: {
      headings: Array<string>;
      recurring: Array<[string, string]>;
    } = { headings: [], recurring: [] };
    const drafts = new Highlight();
    const focus = new Highlight();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(HIGHLIGHT_CSS);
    const style = document.createElement("style");
    style.textContent = HIGHLIGHT_CSS;
    const cache = new Map<string, string>();
    const chosen = new Set<string>();
    const glossary = new Map<string, string>();
    const inflight = new Set<string>();
    const changedBlocks = new Set<Block>();
    const addedElements = new Set<Element>();
    const shadows = new Set<ShadowRoot>();
    const inView = new Set<Element>();

    const detect = async (text: string): Promise<Detection> => {
      const i18n = browser.i18n as Partial<typeof browser.i18n>;
      if (i18n.detectLanguage != null) return i18n.detectLanguage(text);
      const response = await sendToExtension({
        to: "background",
        type: "detect",
        text,
      });
      return response.ok
        ? response.value
        : { isReliable: false, languages: [] };
    };

    const span = (block: Block) => {
      const first = block.nodes[0];
      const last = block.nodes.at(-1);
      if (first?.parentNode == null || last?.parentNode == null) return null;
      const range = document.createRange();
      range.setStartBefore(first);
      range.setEndAfter(last);
      return range;
    };

    const isWanted = (block: Block) =>
      isActive &&
      (view.isWholePage ||
        chosen.has(block.source) ||
        (block.near && (view.isFollowing || block.pinned)));

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const block = textBlocks.get(record.target);
        if (block != null && record.target instanceof Text) {
          block.texts.set(record.target, record.target.data);
          changedBlocks.add(block);
        }
        for (const node of record.addedNodes) {
          const element = node instanceof Element ? node : node.parentElement;
          if (element != null && !owned.has(node)) addedElements.add(element);
        }
      }
      clearTimeout(changeTimer);
      changeTimer = setTimeout(processChanges, 150);
    });

    function measure(isEvery = false) {
      const ahead = innerHeight * 0.6;
      const behind = innerHeight * 0.15;
      const top = direction > 0 ? -behind : -ahead;
      const bottom = innerHeight + (direction > 0 ? ahead : behind);
      for (const block of blocks) {
        const range = isEvery || inView.has(block.parent) ? span(block) : null;
        const rect = range?.getBoundingClientRect();
        block.near =
          rect != null &&
          (rect.width > 0 || rect.height > 0) &&
          rect.bottom > top &&
          rect.top < bottom &&
          rect.right > 0 &&
          rect.left < innerWidth;
        block.distance =
          rect != null && block.near
            ? Math.abs((rect.top + rect.bottom) / 2 - innerHeight * 0.4)
            : Number.MAX_VALUE;
      }
    }

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target);
          else inView.delete(entry.target);
        }
        measure();
        schedule();
      },
      { rootMargin: "60% 0px" },
    );

    const onScroll = () => {
      if (!isActive || frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (window.scrollY !== lastY) {
          direction = Math.sign(window.scrollY - lastY);
          lastY = window.scrollY;
        }
        measure();
        schedule();
      });
    };

    const mutate = (change: () => void) => {
      change();
      observer.takeRecords();
    };

    const replaceRange = (block: Block, next: Array<ChildNode>) => {
      const anchor = block.nodes.find(
        (node) => node.parentNode === block.parent,
      );
      if (anchor == null) return;
      const marker = document.createComment("");
      block.parent.insertBefore(marker, anchor);
      for (const node of block.nodes) {
        if (node.parentNode === block.parent) node.remove();
      }
      marker.replaceWith(...next);
      block.nodes = next;
    };

    const reveal = (
      list: Array<Block>,
      kind: "draft" | "refine" | "restore",
    ) => {
      const isMotion =
        view.isAnimated &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches;
      let index = 0;
      for (const block of list) {
        if (block.range != null) drafts.delete(block.range);
        block.range = null;
        const range = span(block);
        if (range == null) continue;
        if (kind === "draft" && provider !== "none") {
          block.range = range;
          drafts.add(range);
        }
        if (
          !isMotion ||
          !block.near ||
          (blocksByParent.get(block.parent)?.length ?? 0) > 1
        )
          continue;
        block.parent.animate(
          kind === "refine"
            ? [
                { opacity: 0.45, filter: "blur(1.5px)" },
                { opacity: 1, filter: "blur(0)" },
              ]
            : [
                {
                  opacity: 0,
                  filter: "blur(5px)",
                  transform: "translateY(3px)",
                },
                { opacity: 1, filter: "blur(0)", transform: "none" },
              ],
          {
            duration: kind === "refine" ? 420 : 560,
            delay: Math.min(index * 45, 360),
            easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
            fill: "backwards",
          },
        );
        index++;
      }
    };

    const restore = (block: Block) => {
      if (!block.translated) return;
      block.translated = false;
      block.refined = false;
      for (const [element, children] of block.children)
        element.replaceChildren(...children);
      for (const [text, data] of block.texts) text.data = data;
      replaceRange(block, block.original);
    };

    const apply = (
      block: Block,
      translation: string,
      format: "html" | "tagged",
    ) => {
      const pieces = parse(translation.trim(), format);
      if (pieces == null) return false;

      const keepers = new Map<number, Piece>();
      const visit = (list: Array<Piece>) => {
        for (const piece of list) {
          if (typeof piece === "string") continue;
          const kept = keepers.get(piece.id);
          if (kept == null || textLength(piece) > textLength(kept))
            keepers.set(piece.id, piece);
          visit(piece.children);
        }
      };
      visit(pieces);

      const pools = new Map(
        Array.from(block.pools, ([parent, texts]) => [parent, [...texts]]),
      );
      const assignments: Array<[Element, Array<Node>]> = [];
      const build = (list: Array<Piece>, container: Node): Array<ChildNode> => {
        const out: Array<ChildNode> = [];
        for (const piece of list) {
          if (typeof piece === "string") {
            const text =
              pools.get(container)?.shift() ?? document.createTextNode("");
            text.data = piece;
            owned.add(text);
            out.push(text);
            continue;
          }
          const element = block.elements[piece.id - 1];
          if (element == null || keepers.get(piece.id) !== piece) {
            out.push(...build(piece.children, container));
            continue;
          }
          if (block.children.has(element))
            assignments.push([element, build(piece.children, element)]);
          out.push(element);
        }
        return out;
      };
      const top = build(pieces, block.parent);
      for (const [index, element] of block.elements.entries()) {
        if (!block.children.has(element) && !keepers.has(index + 1))
          top.push(element);
      }

      for (const [element, children] of assignments)
        element.replaceChildren(...children);
      for (const [index, edge] of block.edges.entries()) {
        if (edge === "") continue;
        const text = document.createTextNode(edge);
        owned.add(text);
        if (index === 0) top.unshift(text);
        else top.push(text);
      }
      replaceRange(block, top);
      block.translated = true;
      return true;
    };

    const addBlock = (parent: Element, nodes: Array<ChildNode>) => {
      if (nodes.some((node) => owned.has(node))) return;
      const block: Block = {
        parent,
        original: nodes,
        nodes,
        elements: [],
        children: new Map(),
        texts: new Map(),
        pools: new Map(),
        html: "",
        tagged: "",
        source: "",
        edges: ["", ""],
        state: "pending",
        translated: false,
        refined: false,
        near: false,
        pinned: false,
        distance: Number.MAX_VALUE,
        words: null,
        key: ++keys,
        range: null,
      };
      const encode = (list: Iterable<Node>, container: Node) => {
        let html = "";
        let tagged = "";
        let text = "";
        for (const node of list) {
          if (node instanceof Text) {
            block.texts.set(node, node.data);
            block.pools.set(container, [
              ...(block.pools.get(container) ?? []),
              node,
            ]);
            const collapsed = node.data.replaceAll(/\s+/g, " ");
            html += escape(collapsed);
            tagged += escape(collapsed);
            text += collapsed;
            continue;
          }
          if (!(node instanceof Element)) continue;
          if (isSpacer(node)) {
            html += " ";
            tagged += " ";
            text += " ";
            continue;
          }
          block.elements.push(node);
          const id = block.elements.length;
          if (isAtomic(node)) {
            const isLiteral = LITERAL.has(node.localName) && !isSkipped(node);
            const content = escape(atomicText(node).replaceAll(/\s+/g, " "));
            html += isLiteral
              ? `<span data-x="${id}">${content}</span>`
              : `<${node.localName === "br" ? "br" : "img"} data-x="${id}">`;
            tagged += isLiteral ? `<x${id}>${content}</x${id}>` : `<x${id}/>`;
            text += atomicText(node);
            continue;
          }
          block.children.set(node, [...node.childNodes]);
          const inner = encode(node.childNodes, node);
          const name = ENGINE_INLINE.has(node.localName)
            ? node.localName
            : "span";
          html += `<${name} data-x="${id}">${inner.html}</${name}>`;
          tagged += `<x${id}>${inner.tagged}</x${id}>`;
          text += inner.text;
        }
        return { html, tagged, text };
      };
      const encoded = encode(nodes, parent);
      if (!/\p{L}/u.test(encoded.text)) return;
      block.html = encoded.html.trim();
      block.tagged = encoded.tagged.trim();
      block.source = encoded.text.trim();
      block.edges = [
        /^\s/.test(encoded.text) ? " " : "",
        /\s$/.test(encoded.text) ? " " : "",
      ];

      for (const node of nodes) owned.add(node);
      for (const element of block.elements) owned.add(element);
      for (const text of block.texts.keys()) {
        owned.add(text);
        textBlocks.set(text, block);
      }
      blocks.push(block);
      blocksByParent.set(parent, [
        ...(blocksByParent.get(parent) ?? []),
        block,
      ]);
      intersection.unobserve(parent);
      intersection.observe(parent);
    };

    const enter = (host: Element) => {
      const shadow = host.shadowRoot;
      if (shadow == null || isSkipped(host)) return;
      try {
        if (!shadow.adoptedStyleSheets.includes(sheet))
          shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      } catch {
        if ([...shadow.children].every((child) => !child.isEqualNode(style))) {
          const copy = style.cloneNode(true);
          owned.add(copy);
          shadow.append(copy);
        }
      }
      if (!shadows.has(shadow)) {
        shadows.add(shadow);
        if (isActive) observer.observe(shadow, OBSERVED);
      }
      for (const child of shadow.children) collect(child);
    };

    function collect(root: Element) {
      if (isSkipped(root)) return;
      let run: Array<ChildNode> = [];
      const flush = () => {
        const content = run.filter(
          (node) =>
            node instanceof Element ||
            (node instanceof Text && node.data.trim() !== ""),
        );
        const [only] = content;
        if (
          content.length === 1 &&
          only instanceof Element &&
          !isAtomic(only) &&
          !isSpacer(only)
        )
          collect(only);
        else if (run.length > 0) addBlock(root, run);
        run = [];
      };
      for (const child of root.childNodes) {
        if (child instanceof Text || child instanceof Comment) {
          run.push(child);
        } else if (child instanceof Element && isInline(child)) {
          run.push(child);
          for (const element of [child, ...child.querySelectorAll("*")])
            enter(element);
        } else if (child instanceof Element) {
          flush();
          collect(child);
        }
      }
      flush();
      enter(root);
    }

    const forget = (block: Block) => {
      if (block.range != null) drafts.delete(block.range);
      blocks = blocks.filter((other) => other !== block);
      const siblings = (blocksByParent.get(block.parent) ?? []).filter(
        (other) => other !== block,
      );
      blocksByParent.set(block.parent, siblings);
      for (const node of block.nodes) owned.delete(node);
      for (const node of block.original) owned.delete(node);
      for (const element of block.elements) owned.delete(element);
      for (const text of block.texts.keys()) owned.delete(text);
    };

    function processChanges() {
      if (!isActive) return;
      for (const block of blocks) {
        if (!block.parent.isConnected) forget(block);
      }
      for (const block of changedBlocks) {
        mutate(() => {
          restore(block);
        });
        forget(block);
        collect(block.parent);
      }
      changedBlocks.clear();
      for (const element of addedElements) {
        if (!element.isConnected) continue;
        let root = element;
        while (
          (owned.has(root) || isInline(root)) &&
          root.parentElement != null
        )
          root = root.parentElement;
        collect(root);
      }
      addedElements.clear();
      measure();
      schedule();
    }

    const take = (
      candidates: Array<Block>,
      maxChars: number,
      maxCount: number,
    ) => {
      const batch: Array<Block> = [];
      let chars = 0;
      for (const block of candidates) {
        if (
          batch.length >= maxCount ||
          (batch.length > 0 && chars + block.html.length > maxChars)
        )
          break;
        batch.push(block);
        chars += block.html.length;
      }
      return batch;
    };

    const isAlreadyInTarget = async (block: Block) => {
      if (block.source.length < 40) return false;
      const result = await detect(block.source);
      const [top, ...others] = result.languages;
      return (
        result.isReliable &&
        others.length === 0 &&
        top != null &&
        normalizeLanguage(top.language) === normalizeLanguage(target ?? "")
      );
    };

    const cacheKey = (kind: "html" | "tagged", text: string) =>
      [
        kind,
        kind === "tagged" ? `${provider}/${view.model}` : "device",
        source,
        target,
        text,
      ].join("\u{0}");

    const describe = () => ({
      url: location.origin + location.pathname,
      title: document.title,
      ...outline,
      terms: [...glossary],
    });

    const adopt = (terms: Array<[string, string]>) => {
      for (const [from, to] of terms)
        if (!glossary.has(from)) glossary.set(from, to);
    };

    const charge = (value: { tokens: number; cost: number | null }) => {
      spent = {
        tokens: spent.tokens + value.tokens,
        cost:
          spent.cost == null || value.cost == null
            ? null
            : spent.cost + value.cost,
      };
    };

    const draft = async (
      batch: Array<Block>,
      from: string,
      to: string,
      current: number,
    ) => {
      for (const block of batch) block.state = "drafting";
      const skips = await Promise.all(
        batch.map(async (block) => isAlreadyInTarget(block)),
      );
      if (current !== session) return;
      for (const [i, block] of batch.entries())
        if (skips[i] === true) block.state = "done";
      const todo = batch.filter((block) => block.state === "drafting");
      const uncached = todo.filter(
        (block) =>
          !cache.has(cacheKey("tagged", block.tagged)) &&
          !cache.has(cacheKey("html", block.html)),
      );
      if (uncached.length > 0) {
        const response = await sendToExtension({
          to: "background",
          type: "draft",
          source: from,
          target: to,
          html: uncached.map((block) => block.html),
          tagged: uncached.map((block) => block.tagged),
        });
        if (current !== session) return;
        if (!response.ok) {
          for (const block of todo) block.state = "pending";
          throw new Error(response.error);
        }
        for (const [i, block] of uncached.entries()) {
          const value = response.value[i];
          if (value?.isRefined === true)
            cache.set(cacheKey("tagged", block.tagged), value.text);
          else cache.set(cacheKey("html", block.html), value?.text ?? "");
        }
      }
      const drafted: Array<Block> = [];
      const known: Array<Block> = [];
      mutate(() => {
        for (const block of todo) {
          const refined = cache.get(cacheKey("tagged", block.tagged));
          if (refined != null && apply(block, refined, "tagged")) {
            block.refined = true;
            block.state = "done";
            known.push(block);
            continue;
          }
          const html = cache.get(cacheKey("html", block.html));
          if (html == null) {
            block.state = "done";
            continue;
          }
          apply(block, html, "html");
          block.state = "drafted";
          drafted.push(block);
        }
      });
      reveal(drafted, "draft");
      reveal(known, "refine");
      sync();
    };

    const pumpDrafts = async () => {
      if (
        isDrafting ||
        !isActive ||
        isDraftUnavailable ||
        source == null ||
        target == null
      )
        return;
      isDrafting = true;
      const [from, to, current] = [source, target, session];
      try {
        for (;;) {
          const batch = take(
            blocks
              .filter((block) => block.state === "pending" && isWanted(block))
              .toSorted((a, b) => a.distance - b.distance),
            3000,
            24,
          );
          if (batch.length === 0) break;
          await draft(batch, from, to, current);
          if (current !== session) break;
          void pumpRefines();
        }
      } catch (draftError) {
        isDraftUnavailable = true;
        if (provider === "none")
          error = {
            code: "no-engine",
            detail:
              draftError instanceof Error
                ? draftError.message
                : String(draftError),
          };
      } finally {
        isDrafting = false;
        void pumpRefines();
        sync();
      }
    };

    async function pumpRefines() {
      if (!isActive || provider === "none" || source == null || target == null)
        return;
      const current = session;
      while (refining < (isSeeded ? 3 : 1)) {
        const seen = new Set(inflight);
        const candidates: Array<Block> = [];
        const ready = blocks
          .filter(
            (block) =>
              isWanted(block) &&
              (block.state === "drafted" ||
                (isDraftUnavailable && block.state === "pending")),
          )
          .toSorted((a, b) => a.distance - b.distance);
        for (const block of ready) {
          if (seen.has(block.tagged)) continue;
          seen.add(block.tagged);
          candidates.push(block);
        }
        const batch = take(candidates, 2500, 8);
        if (batch.length === 0) return;
        for (const block of batch) block.state = "refining";
        const uncached = batch.filter(
          (block) => !cache.has(cacheKey("tagged", block.tagged)),
        );
        for (const block of uncached) inflight.add(block.tagged);
        refining++;
        void (async () => {
          const response =
            uncached.length === 0
              ? {
                  ok: true as const,
                  value: { texts: [], terms: [], tokens: 0, cost: 0 },
                }
              : await sendToExtension({
                  to: "background",
                  type: "refine",
                  source,
                  target,
                  page: describe(),
                  texts: uncached.map((block) => block.tagged),
                });
          refining--;
          if (current !== session) return;
          isSeeded = true;
          for (const block of uncached) inflight.delete(block.tagged);
          if (response.ok) {
            charge(response.value);
            adopt(response.value.terms);
            for (const [i, block] of uncached.entries()) {
              const text = response.value.texts[i];
              if (text != null)
                cache.set(cacheKey("tagged", block.tagged), text);
            }
          } else {
            error = { code: response.code ?? "failed", detail: response.error };
          }
          mutate(() => {
            for (const block of batch) {
              const text = cache.get(cacheKey("tagged", block.tagged));
              if (text != null && apply(block, text, "tagged"))
                block.refined = true;
              block.state = "done";
            }
          });
          reveal(
            batch.filter((block) => block.refined),
            "refine",
          );
          schedule();
        })();
      }
    }

    function schedule() {
      void pumpDrafts();
      void pumpRefines();
      sync();
    }

    const retranslate = async (block: Block) => {
      if (
        source == null ||
        target == null ||
        block.state === "drafting" ||
        block.state === "refining"
      )
        return;
      const current = session;
      const previous = block.translated
        ? block.nodes.map((node) => node.textContent).join("")
        : null;
      block.state = "refining";
      sync();
      const response = await sendToExtension({
        to: "background",
        type: "refine",
        source,
        target,
        page: describe(),
        texts: [block.tagged],
        previous: [previous],
      });
      if (current !== session || !blocks.includes(block)) return;
      const text = response.ok ? response.value.texts[0] : null;
      if (response.ok) {
        charge(response.value);
        adopt(response.value.terms);
      } else
        error = { code: response.code ?? "failed", detail: response.error };
      if (text != null) {
        cache.set(cacheKey("tagged", block.tagged), text);
        mutate(() => {
          if (apply(block, text, "tagged")) block.refined = true;
        });
        reveal([block], "refine");
      }
      block.state = "done";
      sync();
    };

    const inspect = (block: Block): Inspect => ({
      key: block.key,
      text: block.source,
      locate: () =>
        block.translated && blocks.includes(block)
          ? (span(block)?.getBoundingClientRect() ?? null)
          : null,
      mark: (isOn) => {
        focus.clear();
        const range = isOn ? span(block) : null;
        if (range != null) focus.add(range);
      },
      retry: provider === "none" ? null : async () => retranslate(block),
    });

    function sync() {
      let translated = 0;
      let refined = 0;
      let words = 0;
      let near = 0;
      let nearDrafted = 0;
      let nearDone = 0;
      let isBusy = false;
      for (const block of blocks) {
        const isDone =
          block.state === "done" ||
          (block.state === "drafted" && provider === "none");
        if (block.translated) {
          translated++;
          if (block.words == null) {
            segmenter ??= new Intl.Segmenter(source ?? undefined, {
              granularity: "word",
            });
            block.words = 0;
            for (const part of segmenter.segment(block.source))
              if (part.isWordLike === true) block.words++;
          }
          words += block.words;
        }
        if (block.refined) refined++;
        if (block.near) {
          near++;
          if (block.translated) nearDrafted++;
          if (isDone) nearDone++;
        }
        if (
          block.state === "drafting" ||
          block.state === "refining" ||
          (!isDone && isWanted(block))
        )
          isBusy = true;
      }
      Object.assign(view, {
        source,
        total: blocks.length,
        translated,
        refined,
        words,
        near,
        nearDrafted,
        nearDone,
        isBusy: isActive && error == null && isBusy,
        tokens: spent.tokens,
        cost: spent.cost,
        error,
      });
      if (view.phase === "hidden" && !view.isCompanion) return;
      if (ui == null) {
        const host = document.createElement("dragoman-ui");
        host.setAttribute(
          "style",
          "all: initial !important; display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; overflow: visible !important; z-index: 2147483646 !important; pointer-events: none !important;",
        );
        ui = {
          host,
          app: mount(Ui, { target: host.attachShadow({ mode: "closed" }) }),
        };
      }
      if (!ui.host.isConnected) document.documentElement.append(ui.host);
    }

    const configure = async (settings: Settings) => {
      if (isLocale(settings.interfaceLanguage))
        void setLocale(settings.interfaceLanguage, { reload: false });
      const locale = getLocale();
      if (locale !== learned) {
        const response = await sendToExtension({
          to: "background",
          type: "strings",
          locale,
        });
        if (response.ok) {
          learn(response.value);
          learned = locale;
        }
      }
      Object.assign(view, {
        locale,
        character: settings.character,
        isCompanion: settings.companion,
        isBadgeShown: settings.showBadge,
        isAnimated: settings.animate,
        isShowCost: settings.showCost,
        isShowOriginal: settings.showOriginalOnHover,
        isWholePage: (settings.wholePage && !isSelective) || isEverything,
        choices: choices(settings).map(({ provider, model }) => ({
          value: `${provider}/${model}`,
          model,
          provider: providers[provider].name,
          logo: provider,
        })),
        choice:
          settings.provider === "none"
            ? ""
            : `${settings.provider}/${settings.models[settings.provider] ?? ""}`,
        isDeviceOnly: settings.deviceOnly,
        host: location.hostname,
        neverSites: settings.neverSites,
      });
    };

    const onPoint = (event: MouseEvent) => {
      const origin = event.composedPath()[0];
      if (ui != null && origin === ui.host) return;
      const { pointerType } = event as Partial<PointerEvent>;
      const isTouch = pointerType != null && pointerType !== "mouse";
      if (event.type === "pointerup") {
        if (!isTouch) return;
        touched = event.timeStamp;
      } else if (event.timeStamp - touched < 1000) return;
      const isTap =
        tap != null &&
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10 &&
        event.timeStamp - tap.time < 600;
      tap = null;
      let block: Block | null = null;
      if (isActive && view.isShowOriginal && origin instanceof Node) {
        const lookup = document as {
          caretPositionFromPoint?: Document["caretPositionFromPoint"];
          caretRangeFromPoint?: Document["caretRangeFromPoint"];
        };
        const caret =
          lookup.caretPositionFromPoint?.(event.clientX, event.clientY, {
            shadowRoots: [...shadows],
          })?.offsetNode ??
          lookup.caretRangeFromPoint?.(event.clientX, event.clientY)
            ?.startContainer;
        const point = caret != null && origin.contains(caret) ? caret : origin;
        for (
          let node: Node | null = point;
          node != null && block == null;
          node = node.parentNode
        ) {
          block =
            blocksByParent
              .get(node)
              ?.find((candidate) =>
                candidate.nodes.some((child) => child.contains(point)),
              ) ?? null;
        }
      }
      if (isTouch) {
        const element =
          origin instanceof Element
            ? origin
            : origin instanceof Node
              ? origin.parentElement
              : null;
        view.tapped =
          isTap &&
          block?.translated === true &&
          getSelection()?.isCollapsed !== false &&
          element?.closest(
            "a, button, input, select, textarea, label, summary, [role=button], [role=link], [contenteditable]",
          ) == null
            ? { inspect: inspect(block), x: event.clientX, y: event.clientY }
            : null;
        return;
      }
      if (block === hovered) return;
      hovered = block;
      view.pointing = block?.translated === true ? inspect(block) : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      tap =
        event.pointerType === "mouse"
          ? null
          : { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };

    function stop() {
      session++;
      isActive = false;
      observer.disconnect();
      intersection.disconnect();
      inView.clear();
      hovered = null;
      view.pointing = null;
      view.tapped = null;
      focus.clear();
      const shown = blocks.filter((block) => block.translated);
      mutate(() => {
        for (const block of blocks) restore(block);
      });
      reveal(shown, "restore");
      drafts.clear();
      blocks = [];
      blocksByParent = new Map();
      owned = new WeakSet();
      textBlocks = new WeakMap();
      changedBlocks.clear();
      addedElements.clear();
      shadows.clear();
      error = null;
      isDraftUnavailable = false;
      isSeeded = false;
      glossary.clear();
      inflight.clear();
      sync();
    }

    async function start(nextTarget: string, scope?: Range | "same") {
      if (scope == null) {
        isSelective = false;
        chosen.clear();
      }
      stop();
      const current = session;
      const settings = await readSettings();
      await configure(settings);
      if (current !== session) return;
      const active = connection(settings);
      provider = active == null ? "none" : settings.provider;
      isDraftUnavailable = !settings.draftLocally && provider !== "none";
      view.mode =
        provider === "none"
          ? "device"
          : settings.draftLocally
            ? "hybrid"
            : "cloud";
      view.model = active?.model ?? "";
      CSS.highlights.set("dragoman-draft", drafts);
      CSS.highlights.set("dragoman-focus", focus);
      try {
        if (!document.adoptedStyleSheets.includes(sheet))
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      } catch {
        if (!style.isConnected) document.head.append(style);
      }
      target = nextTarget;
      view.target = nextTarget;
      collect(document.body);
      const counts = new Map<string, number>();
      const firsts = new Map<string, Block>();
      for (const block of blocks)
        for (const line of block.tagged.split(/<x\d+\/>/)) {
          const phrase = line
            .replaceAll(/<\/?x\d+>/g, "")
            .replaceAll(/\s+/g, " ")
            .trim();
          if (
            phrase.length > 1 &&
            phrase.length <= 60 &&
            /\p{L}/u.test(phrase)
          ) {
            counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
            if (!firsts.has(phrase)) firsts.set(phrase, block);
          }
        }
      outline = {
        headings: Array.from(
          document.querySelectorAll("h1, h2, h3"),
          (heading) => heading.textContent.replaceAll(/\s+/g, " ").trim(),
        )
          .filter((heading) => heading !== "" && heading.length <= 120)
          .slice(0, 40),
        recurring: [...counts]
          .filter(([, count]) => count > 1)
          .toSorted(([, a], [, b]) => b - a)
          .slice(0, 80)
          .map(([phrase]) => {
            let element = firsts.get(phrase)?.parent ?? null;
            let around = "";
            for (let depth = 0; element != null && depth < 4; depth++) {
              around = element.textContent.replaceAll(/\s+/g, " ").trim();
              if (around.length > phrase.length + 12) break;
              element = element.parentElement;
            }
            return [
              phrase,
              around.length > phrase.length + 12 ? around.slice(0, 160) : "",
            ];
          }),
      };
      if (scope instanceof Range) {
        isSelective = true;
        view.isFollowing = false;
        view.isWholePage = isEverything;
        for (const block of blocks)
          if (block.nodes.some((node) => scope.intersectsNode(node)))
            chosen.add(block.source);
      }
      let sample = "";
      for (const block of blocks) {
        if (sample.length > 4000) break;
        if (!isSelective || chosen.has(block.source))
          sample += `${block.source}\n`;
      }
      const detected = await detect(sample);
      if (current !== session) return;
      const top = detected.languages[0]?.language;
      const declared = document.documentElement.lang;
      const detectedSource = normalizeLanguage(
        (detected.isReliable ? top : undefined) ?? (declared || top) ?? "und",
      );
      if (detectedSource === normalizeLanguage(nextTarget)) {
        stop();
        source = detectedSource;
        error = { code: "same-language", detail: nextTarget };
        sync();
        return;
      }
      source = detectedSource;
      isActive = true;
      view.phase = "active";
      view.isPanelOpen = false;
      measure(true);
      for (const block of blocks) block.pinned = !isSelective && block.near;
      schedule();
      observer.observe(document.documentElement, OBSERVED);
      for (const shadow of shadows) observer.observe(shadow, OBSERVED);
    }

    const pause = () => {
      stop();
      view.phase = "paused";
      sync();
    };

    const save = async (next: Partial<Settings>) =>
      settingsItem.setValue({ ...(await settingsItem.getValue()), ...next });

    const languageOf = async (text: string) => {
      const detected = await detect(text);
      const top = detected.languages[0]?.language;
      return top == null ? source : normalizeLanguage(top);
    };

    Object.assign(actions, {
      translate: () => void start(view.target),
      translateSelection: () => {
        const range = picked;
        picked = null;
        view.selection = null;
        getSelection()?.removeAllRanges();
        if (range == null) return;
        if (!isActive) {
          void start(view.target, range);
          return;
        }
        for (const block of blocks)
          if (block.nodes.some((node) => range.intersectsNode(node)))
            chosen.add(block.source);
        schedule();
      },
      restore: pause,
      hide: (isHidden: boolean) => {
        Object.assign(view, { isHidden, isUndoable: isHidden });
        if (isHidden) view.isPanelOpen = false;
        void hiddenItem.setValue(isHidden);
      },
      follow: (isOn: boolean) => {
        view.isFollowing = isOn;
        measure();
        schedule();
      },
      translateAll: () => {
        isEverything = true;
        view.isWholePage = true;
        schedule();
      },
      openSettings: () =>
        void sendToExtension({ to: "background", type: "options" }),
      always: () => {
        if (view.source == null) return;
        void readSettings().then(async (settings) =>
          save({
            alwaysLanguages: [...settings.alwaysLanguages, view.source ?? ""],
          }),
        );
        void start(view.target);
      },
      known: () => {
        const code = view.source;
        view.isPanelOpen = false;
        view.phase = "hidden";
        sync();
        if (code == null) return;
        void readSettings().then(async (settings) =>
          save({ knownLanguages: [...settings.knownLanguages, code] }),
        );
      },
      exclude: (neverSites: Array<string>) => void save({ neverSites }),
      pick: (value: string) => {
        const index = value.indexOf("/");
        void readSettings().then(async (settings) => {
          await save(
            pick(
              settings,
              value.slice(0, index) as ProviderId,
              value.slice(index + 1),
            ),
          );
          if (isActive) await start(view.target, "same");
        });
      },
      deviceOnly: (isOn: boolean) =>
        void save({ deviceOnly: isOn }).then(async () => {
          if (isActive) await start(view.target, "same");
        }),
      languageOf,
      translateText: async (text: string) => {
        const settings = await readSettings();
        const to = target ?? settings.targetLanguage;
        const from = await languageOf(text);
        if (from == null || languageKey(from) === languageKey(to)) return null;
        const flat = (pieces: Array<Piece> | null): string =>
          (pieces ?? [])
            .map((piece) =>
              typeof piece === "string" ? piece : flat(piece.children),
            )
            .join("");
        if (connection(settings) != null) {
          const isSamePair = isActive && from === source && to === target;
          const response = await sendToExtension({
            to: "background",
            type: "refine",
            source: from,
            target: to,
            page: { ...describe(), ...(!isSamePair && { terms: [] }) },
            texts: [escape(text)],
          });
          const value = response.ok ? response.value.texts[0] : null;
          if (response.ok) {
            charge(response.value);
            if (isSamePair) adopt(response.value.terms);
          }
          if (value != null)
            return { text: flat(parse(value, "tagged")), language: from };
        }
        const response = await sendToExtension({
          to: "background",
          type: "draft",
          source: from,
          target: to,
          html: [escape(text)],
          tagged: [escape(text)],
        });
        const value = response.ok ? response.value[0] : null;
        return value == null
          ? null
          : {
              text: flat(
                parse(value.text, value.isRefined ? "tagged" : "html"),
              ),
              language: from,
            };
      },
    });

    const onSelection = () => {
      clearTimeout(selectionTimer);
      const selection = getSelection();
      if (selection == null || selection.isCollapsed) {
        selectionTimer = setTimeout(() => {
          picked = null;
          view.selection = null;
        }, 300);
        return;
      }
      selectionTimer = setTimeout(() => {
        void (async () => {
          if (selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0).cloneRange();
          const text = range.toString().trim();
          const container = range.commonAncestorContainer;
          const element =
            container instanceof Element ? container : container.parentElement;
          const isOpen =
            /\p{L}/u.test(text) &&
            element != null &&
            element !== ui?.host &&
            element.closest(
              "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
            ) == null &&
            (!isActive ||
              blocks.some(
                (block) =>
                  block.state === "pending" &&
                  !isWanted(block) &&
                  block.nodes.some((node) => range.intersectsNode(node)),
              ));
          const language = isOpen
            ? await languageOf(
                (text.length < 120 ? element.textContent : text)
                  .trim()
                  .slice(0, 2000),
              )
            : null;
          if (selection.toString().trim() !== text) return;
          if (
            language == null ||
            language === "und" ||
            languageKey(language) === languageKey(view.target)
          ) {
            picked = null;
            view.selection = null;
            return;
          }
          picked = range;
          view.selection = {
            language,
            locate: () => picked?.getBoundingClientRect() ?? null,
          };
        })();
      }, 350);
    };

    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("mouseover", onPoint, { passive: true });
    document.addEventListener("pointerup", onPoint, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onScroll, { passive: true });
    const unwatches = [
      settingsItem.watch(() => {
        void readSettings().then(async (settings) => {
          await configure(settings);
          if (
            view.phase === "offer" &&
            exclusion(location.hostname, settings.neverSites).site != null
          ) {
            view.isPanelOpen = false;
            view.phase = "hidden";
            sync();
          }
          schedule();
        });
      }),
      hiddenItem.watch((isHidden) => {
        view.isHidden = isHidden;
        if (!isHidden) view.isUndoable = false;
      }),
    ];

    browser.runtime.onMessage.addListener(
      (
        message: { to?: string },
        _sender,
        sendResponse: (response: Status) => void,
      ) => {
        if (message.to !== "content") return;
        const request = message as ContentMessage;
        switch (request.type) {
          case "translate": {
            void start(request.target);
            break;
          }
          case "restore": {
            pause();
            break;
          }
          case "toggle": {
            if (isActive) {
              pause();
              break;
            }
            void (async () => {
              const settings = await readSettings();
              await start(target ?? settings.targetLanguage);
            })();
            break;
          }
          case "status": {
            break;
          }
        }
        sync();
        sendResponse({
          state:
            error != null
              ? "error"
              : !isActive
                ? "idle"
                : view.isBusy
                  ? "translating"
                  : "translated",
          host: location.hostname,
          source,
          target,
          blocks: view.total,
          drafted: view.translated,
          refined: view.refined,
          tokens: spent.tokens,
          cost: spent.cost,
          isFollowing: view.isFollowing,
          isWholePage: view.isWholePage,
          error,
        });
      },
    );

    void (async () => {
      const current = session;
      const [settings, isHidden, detected] = await Promise.all([
        readSettings(),
        hiddenItem.getValue(),
        detect(
          [...document.querySelectorAll("h1, h2, h3, p, li")]
            .filter(
              (element) =>
                element.closest(
                  "nav, header, footer, aside, [role='navigation']",
                ) == null,
            )
            .map((element) =>
              element.textContent.replaceAll(/\s+/g, " ").trim(),
            )
            .filter((text) => text !== "")
            .join("\n")
            .slice(0, 4000),
        ),
      ]);
      await configure(settings);
      if (current !== session) return;
      view.target = settings.targetLanguage;
      view.isHidden = isHidden;
      const top = detected.languages[0]?.language;
      const declared = document.documentElement.lang;
      const isReliable =
        detected.isReliable ||
        (top != null &&
          declared !== "" &&
          languageKey(normalizeLanguage(declared)) ===
            languageKey(normalizeLanguage(top)));
      source = normalizeLanguage(
        (isReliable ? top : undefined) ?? (declared || top) ?? "und",
      );
      const code = source;
      const isAlways = settings.alwaysLanguages
        .map((always) => languageKey(always))
        .includes(languageKey(code));
      const isExcluded =
        exclusion(location.hostname, settings.neverSites).site != null;
      if (
        isAlways &&
        !isExcluded &&
        languageKey(code) !== languageKey(settings.targetLanguage) &&
        document.querySelector('input[type="password"]') == null
      ) {
        await start(settings.targetLanguage);
        return;
      }
      if (
        isReliable &&
        !isExcluded &&
        settings.offerTranslation &&
        languageKey(code) !== languageKey(settings.targetLanguage) &&
        !settings.knownLanguages
          .map((known) => languageKey(known))
          .includes(languageKey(code))
      ) {
        view.phase = "offer";
        view.isAlwaysTranslated = isAlways;
        view.isPanelOpen =
          !isHidden && !matchMedia("(max-width: 560px)").matches;
      }
      sync();
    })();

    ctx.onInvalidated(() => {
      stop();
      for (const unwatch of unwatches) unwatch();
      clearTimeout(selectionTimer);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("mouseover", onPoint);
      document.removeEventListener("pointerup", onPoint);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      if (ui != null) {
        void unmount(ui.app);
        ui.host.remove();
      }
      CSS.highlights.delete("dragoman-draft");
      CSS.highlights.delete("dragoman-focus");
      style.remove();
    });
  },
});
