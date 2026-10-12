<svelte:options css="injected" />

<script lang="ts">
  import { rtl } from "@dragoman/brand/locales";
  import { untrack } from "svelte";
  import { on } from "svelte/events";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { browser } from "wxt/browser";
  import { languageName, sourceName } from "#lib/messages.ts";
  import type { Inspect } from "./view.svelte.ts";
  import Float from "./float.svelte";
  import Original from "./original.svelte";
  import Panel from "./panel.svelte";
  import Pet from "./pet.svelte";
  import Selection from "./selection.svelte";
  import Sheet from "./sheet.svelte";
  import { actions, hint, m, view } from "./view.svelte.ts";

  const RING = 2 * Math.PI * 37;
  const narrow = new MediaQuery("(max-width: 560px)");

  let root = $state<HTMLDivElement>();
  let anchor = $state<DOMRect | null>(null);
  let hovered = $state<Inspect | null>(null);
  let opened = $state<Inspect | null>(null);
  let spot = $state<DOMRect | null>(null);
  let tipWidth = $state(0);
  let isCardHovered = false;
  let isNudged = $state(true);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const isPet = $derived(view.isCompanion && !view.isHidden);
  const isBadge = $derived(
    !view.isCompanion &&
      !view.isHidden &&
      (view.phase === "offer" ||
        (view.isBadgeShown &&
          (view.phase === "active" || view.phase === "paused"))),
  );
  const card = $derived(opened ?? hovered);
  const done = $derived(view.near === 0 ? 1 : view.nearDone / view.near);
  const drafted = $derived(view.near === 0 ? 1 : view.nearDrafted / view.near);
  const progress = $derived(
    view.mode === "hybrid"
      ? m.badge_progress({
          drafted: view.translated,
          refined: view.refined,
          total: view.total,
        })
      : m.badge_translated({ done: view.translated, total: view.total }),
  );

  $effect(() => {
    const next = view.pointing;
    clearTimeout(timer);
    const current = untrack(() => hovered);
    if (next != null && next.key === current?.key) return;
    timer = setTimeout(
      () => {
        if (next != null || !isCardHovered) hovered = next;
      },
      next == null ? 320 : current == null ? 650 : 250,
    );
  });

  $effect(() => {
    if (!view.isUndoable) return;
    const timeout = setTimeout(() => (view.isUndoable = false), 6000);
    return () => clearTimeout(timeout);
  });

  $effect(() => {
    if (view.tapped == null) return;
    const timeout = setTimeout(() => (view.tapped = null), 6000);
    return () => clearTimeout(timeout);
  });

  $effect(() => {
    const current = card;
    if (current == null) {
      spot = null;
      return;
    }
    current.mark(true);
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = current.locate();
      if (
        rect == null ||
        rect.bottom < 0 ||
        rect.top > (innerHeight.current ?? 0)
      ) {
        if (opened === current) opened = null;
        else hovered = null;
        return;
      }
      spot = rect;
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    const offs = [
      on(window, "scroll", onScroll, { capture: true, passive: true }),
      on(window, "resize", onScroll, { passive: true }),
    ];
    return () => {
      current.mark(false);
      cancelAnimationFrame(frame);
      for (const off of offs) off();
    };
  });

  $effect(() => {
    if (view.phase === "hidden" || view.phase === "offer") opened = null;
  });

  $effect(() => {
    if (view.isPanelOpen) isNudged = false;
  });

  $effect(() => {
    if (view.phase !== "offer" || !isNudged) return;
    const start = scrollY;
    return on(
      window,
      "scroll",
      () => {
        if (Math.abs(scrollY - start) > window.innerHeight) isNudged = false;
      },
      { passive: true },
    );
  });
</script>

<svelte:window
  onkeydown={(event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    view.tip = null;
    view.selection = null;
    hovered = null;
    opened = null;
    view.isPanelOpen = false;
  }}
  onpointerdown={(event: PointerEvent) => {
    const host = (root?.getRootNode() as ShadowRoot | undefined)?.host;
    if (event.composedPath()[0] === host) return;
    if (!narrow.current) opened = null;
    if (view.isPanelOpen && !narrow.current) view.isPanelOpen = false;
    hovered = null;
  }}
/>

<div
  class="root"
  bind:this={root}
  lang={view.locale}
  dir={rtl.has(view.locale) ? "rtl" : "ltr"}
>
  {#if isPet}
    <Pet
      bind:rect={anchor}
      onactivate={() => (view.isPanelOpen = !view.isPanelOpen)}
    />
  {:else if isBadge}
    <div class="corner">
      <button
        type="button"
        class="badge"
        class:idle={view.phase !== "active"}
        {@attach (node: HTMLButtonElement) => {
          const measure = () => (anchor = node.getBoundingClientRect());
          measure();
          return on(window, "resize", measure, { passive: true });
        }}
        aria-label={view.phase === "active" ? progress : m.badge_translate()}
        {@attach hint(() =>
          view.phase === "active" ? progress : m.badge_translate(),
        )}
        aria-expanded={view.isPanelOpen}
        onclick={() => (view.isPanelOpen = !view.isPanelOpen)}
      >
        <svg viewBox="0 0 82 82" aria-hidden="true">
          <circle class="track" cx="41" cy="41" r="37" />
          {#if view.mode === "hybrid"}
            <circle
              class="gold"
              cx="41"
              cy="41"
              r="37"
              stroke-dasharray={RING}
              stroke-dashoffset={RING * (1 - drafted)}
            />
          {/if}
          <circle
            class="turquoise"
            cx="41"
            cy="41"
            r="37"
            stroke-dasharray={RING}
            stroke-dashoffset={RING * (1 - done)}
          />
        </svg>
        <img
          src={browser.runtime.getURL(`/characters/${view.character}.png`)}
          alt=""
        />
      </button>
      <button
        type="button"
        class="hide"
        aria-label={m.hide_session()}
        {@attach hint(() => m.hide_session())}
        onclick={() => actions.hide(true)}>×</button
      >
    </div>
  {:else if view.isHidden && view.isUndoable}
    <div class="toast" role="status">
      <span>{m.hidden_session()}</span>
      <button type="button" onclick={() => actions.hide(false)}>
        {m.undo()}
      </button>
    </div>
  {/if}

  {#if view.phase === "active" && anchor != null && (isPet || isBadge)}
    {const isLeft = $derived(
      anchor.left + anchor.width / 2 < (innerWidth.current ?? 0) / 2,
    )}
    <div
      class="tray"
      style:left={isLeft ? `${anchor.right + 10}px` : null}
      style:right={isLeft
        ? null
        : `${(innerWidth.current ?? 0) - anchor.left + 10}px`}
      style:top="{Math.min(
        Math.max(24, anchor.top + anchor.height / 2),
        (innerHeight.current ?? 0) - 24,
      )}px"
    >
      {#if view.isShowCost && view.tokens > 0}
        <span class="cost">
          {view.cost == null
            ? m.cost_tokens({
                tokens: new Intl.NumberFormat(view.locale).format(view.tokens),
              })
            : new Intl.NumberFormat(view.locale, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: view.cost < 0.01 ? 4 : 2,
              }).format(view.cost)}
        </span>
      {/if}
      {#if !view.isWholePage}
        <button
          type="button"
          class="follow"
          role="switch"
          aria-checked={view.isFollowing}
          aria-label={m.follow_scroll()}
          {@attach hint(() => m.follow_scroll())}
          onclick={() => actions.follow(!view.isFollowing)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect
              x="6"
              y="2.5"
              width="8"
              height="12"
              rx="4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M10 5.5v2.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="m7.5 16.5 2.5 2 2.5-2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="knob"></span>
        </button>
      {/if}
    </div>
  {/if}

  {#if view.phase === "offer" && isNudged && !view.isPanelOpen && narrow.current && anchor != null && (isPet || isBadge)}
    {const isLeft = $derived(
      anchor.left + anchor.width / 2 < (innerWidth.current ?? 0) / 2,
    )}
    <div
      class="nudge"
      class:left={isLeft}
      style:left={isLeft ? `${anchor.right + 12}px` : null}
      style:right={isLeft
        ? null
        : `${(innerWidth.current ?? 0) - anchor.left + 12}px`}
      style:top="{Math.min(
        Math.max(48, anchor.top + anchor.height / 2),
        (innerHeight.current ?? 0) - 48,
      )}px"
    >
      <button type="button" class="ask" onclick={actions.translate}>
        <span class="about">
          {m.offer_title({
            language:
              view.source == null || view.source === "und"
                ? ""
                : sourceName(view.source),
          })}
        </span>
        <span class="act">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M2 3.5h7M5.5 2v1.5M7.5 3.5c-.6 2.6-2.5 4.6-5 5.6M4 6.2c.9 1.3 2.2 2.3 3.6 2.9M9 14l2.8-7 2.8 7M9.8 12h4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {m.offer_translate({
            language: languageName(view.target, view.locale),
          })}
        </span>
      </button>
      <button
        type="button"
        class="dismiss"
        aria-label={m.offer_close()}
        onclick={() => (isNudged = false)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="m4.5 4.5 7 7m0-7-7 7"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  {/if}

  {#if card != null && spot != null}
    {#if opened != null && narrow.current}
      <Sheet label={m.original()} onclose={() => (opened = null)}>
        <Original
          inspect={opened}
          onretried={() => (spot = opened?.locate() ?? null)}
          onclose={() => (opened = null)}
        />
      </Sheet>
    {:else}
      <Float
        anchor={spot}
        label={m.original()}
        prefer={["bottom", "top"]}
        onpointerenter={() => {
          isCardHovered = true;
          clearTimeout(timer);
        }}
        onpointerleave={() => {
          isCardHovered = false;
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (view.pointing?.key !== hovered?.key) hovered = null;
          }, 320);
        }}
      >
        <Original
          inspect={card}
          onretried={() => (spot = card.locate())}
          onclose={opened == null ? undefined : () => (opened = null)}
        />
      </Float>
    {/if}
  {/if}

  {#if view.isPanelOpen && view.phase !== "hidden" && !view.isHidden}
    {#if narrow.current}
      <Sheet label={m.character()} onclose={() => (view.isPanelOpen = false)}>
        <Panel onclose={() => (view.isPanelOpen = false)} />
      </Sheet>
    {:else if anchor != null}
      <Float
        {anchor}
        label={m.character()}
        prefer={anchor.top + anchor.height / 2 > (innerHeight.current ?? 0) / 2
          ? ["top", "left", "right", "bottom"]
          : ["bottom", "left", "right", "top"]}
      >
        <Panel onclose={() => (view.isPanelOpen = false)} />
      </Float>
    {/if}
  {/if}

  {#if view.selection != null && !view.isPanelOpen}
    <Selection
      language={view.selection.language}
      locate={view.selection.locate}
    />
  {/if}

  {#if view.tapped != null && opened == null}
    {const tapped = $derived(view.tapped)}
    <button
      type="button"
      class="chip"
      style:left="{Math.min(
        Math.max(8, tapped.x - 60),
        (innerWidth.current ?? 0) - 128,
      )}px"
      style:top="{Math.max(8, tapped.y - 58)}px"
      onclick={() => {
        opened = tapped.inspect;
        view.tapped = null;
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2 3.5h7M5.5 2v1.5M7.5 3.5c-.6 2.6-2.5 4.6-5 5.6M4 6.2c.9 1.3 2.2 2.3 3.6 2.9M9 14l2.8-7 2.8 7M9.8 12h4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {m.see_original()}
    </button>
  {/if}

  {#if view.tip != null}
    {const rect = $derived(view.tip.rect)}
    {const isBelow = $derived(rect.top < 48)}
    <div
      class="tip"
      aria-hidden="true"
      bind:offsetWidth={tipWidth}
      style:left="{Math.min(
        Math.max(8, rect.left + rect.width / 2 - tipWidth / 2),
        (innerWidth.current ?? 0) - tipWidth - 8,
      )}px"
      style:top={isBelow ? `${rect.bottom + 8}px` : null}
      style:bottom={isBelow
        ? null
        : `${(innerHeight.current ?? 0) - rect.top + 8}px`}
    >
      {view.tip.text()}
    </div>
  {/if}
</div>

<style>
  .root {
    font:
      14px/1.45 system-ui,
      sans-serif;
    color: #18204a;
  }
  @media print {
    .root {
      display: none;
    }
  }
  .tip {
    position: fixed;
    z-index: 6;
    box-sizing: border-box;
    max-width: min(260px, calc(100vw - 16px));
    padding: 6px 10px;
    border-radius: 8px;
    background: #18204a;
    color: #f6f5ef;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 10px 24px -10px rgb(15 22 54 / 0.55);
    pointer-events: none;
    animation: tip 0.14s ease-out;
  }
  button {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid #e0ac3e;
    outline-offset: 4px;
  }
  .corner,
  .toast {
    position: fixed;
    bottom: max(22px, calc(env(safe-area-inset-bottom) + 12px));
    inset-inline-end: 22px;
    z-index: 1;
  }
  .badge {
    position: relative;
    display: block;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: #2347a8;
    box-shadow:
      inset 0 -4px 0 rgb(15 22 54 / 0.35),
      0 14px 28px -10px rgb(15 22 54 / 0.6);
    pointer-events: auto;
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
    animation: arrive 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .hide {
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f6f5ef;
    color: #18204a;
    font:
      600 15px/1 system-ui,
      sans-serif;
    box-shadow:
      0 0 0 1.5px #18204a,
      0 3px 0 rgb(24 32 74 / 0.2);
    pointer-events: auto;
    opacity: 0;
    scale: 0.6;
    transition:
      opacity 0.15s,
      scale 0.2s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .hide:focus-visible {
    outline-offset: 2px;
  }
  .corner:hover .hide,
  .hide:focus-visible {
    opacity: 1;
    scale: 1;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: calc(100vw - 44px);
    box-sizing: border-box;
    padding-block: 6px;
    padding-inline: 14px 6px;
    border-radius: 999px;
    background: #18204a;
    color: #f6f5ef;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 10px 22px -10px rgb(15 22 54 / 0.7);
    pointer-events: auto;
    animation: arrive 0.35s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .toast button {
    padding: 6px 12px;
    border-radius: 999px;
    background: rgb(246 245 239 / 0.14);
    font-weight: 600;
  }
  .toast button:hover {
    background: rgb(246 245 239 / 0.22);
  }
  .badge:hover {
    transform: translateY(-3px) rotate(-3deg);
  }
  .badge:active {
    transform: translateY(1px);
  }
  .badge img {
    position: absolute;
    inset-inline-start: -6px;
    bottom: 0;
    width: 80px;
    height: 80px;
    pointer-events: none;
    clip-path: inset(-40px 6px 0 6px round 0 0 34px 34px);
  }
  .badge svg {
    position: absolute;
    inset: -7px;
    width: 82px;
    height: 82px;
    rotate: -90deg;
    overflow: visible;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  .idle svg {
    opacity: 0;
  }
  circle {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .track {
    stroke: rgb(24 32 74 / 0.18);
  }
  .gold {
    stroke: #e0ac3e;
  }
  .turquoise {
    stroke: #1e9c94;
  }
  .tray {
    position: fixed;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
    translate: 0 -50%;
    pointer-events: none;
  }
  .cost {
    padding: 4px 9px;
    border-radius: 999px;
    white-space: nowrap;
    background: #f6f5ef;
    font:
      600 12px/1.3 system-ui,
      sans-serif;
    font-variant-numeric: tabular-nums;
    box-shadow:
      0 0 0 1px #d9d2bf,
      0 8px 18px -10px rgb(15 22 54 / 0.6);
  }
  .follow {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 32px;
    padding-inline: 7px 5px;
    border-radius: 999px;
    background: #f6f5ef;
    color: #5d6385;
    box-shadow:
      0 0 0 1px #d9d2bf,
      0 8px 18px -10px rgb(15 22 54 / 0.6);
    pointer-events: auto;
    animation: arrive 0.5s cubic-bezier(0.3, 1.5, 0.5, 1) 0.2s backwards;
  }
  .follow svg {
    width: 18px;
    height: 18px;
  }
  .knob {
    position: relative;
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: rgb(24 32 74 / 0.18);
    transition: background-color 0.2s;
  }
  .knob::after {
    content: "";
    position: absolute;
    top: 2px;
    inset-inline-start: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgb(15 22 54 / 0.35);
    transition: translate 0.2s cubic-bezier(0.3, 1.4, 0.5, 1);
  }
  [aria-checked="true"] {
    color: #1e9c94;
  }
  [aria-checked="true"] .knob {
    background: #1e9c94;
  }
  [aria-checked="true"] .knob::after {
    translate: 12px;
  }
  [dir="rtl"] [aria-checked="true"] .knob::after {
    translate: -12px;
  }
  .chip {
    position: fixed;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 13px;
    border-radius: 999px;
    background: #18204a;
    color: #f6f5ef;
    font:
      600 14px/1 system-ui,
      sans-serif;
    box-shadow: 0 10px 22px -10px rgb(15 22 54 / 0.7);
    pointer-events: auto;
    animation: arrive 0.35s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .chip svg {
    width: 16px;
    height: 16px;
  }
  .nudge {
    position: fixed;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    max-width: calc(100vw - 124px);
    border-radius: 16px;
    background: #18204a;
    color: #f6f5ef;
    box-shadow: 0 14px 28px -12px rgb(15 22 54 / 0.75);
    translate: 0 -50%;
    pointer-events: auto;
    transform-origin: right center;
    animation: nudge 0.45s cubic-bezier(0.3, 1.4, 0.5, 1) 0.45s backwards;
  }
  .nudge.left {
    transform-origin: left center;
  }
  .nudge::after {
    content: "";
    position: absolute;
    top: 50%;
    right: -5px;
    width: 12px;
    height: 12px;
    border-radius: 0 3px 0 0;
    background: inherit;
    translate: 0 -50%;
    rotate: 45deg;
  }
  .nudge.left::after {
    right: auto;
    left: -5px;
  }
  .ask {
    display: grid;
    gap: 3px;
    min-width: 0;
    padding-block: 10px;
    padding-inline: 14px 4px;
    text-align: start;
  }
  .about {
    overflow: hidden;
    color: rgb(246 245 239 / 0.72);
    font-size: 12.5px;
    line-height: 1.25;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 6px;
    font:
      650 15px/1.2 system-ui,
      sans-serif;
  }
  .act svg {
    flex: none;
    width: 17px;
    height: 17px;
    color: #f0b44c;
  }
  .ask:active .act {
    opacity: 0.75;
  }
  .dismiss {
    flex: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    margin: 2px 2px 0 0;
    border-radius: 50%;
    color: rgb(246 245 239 / 0.6);
  }
  .dismiss svg {
    width: 15px;
    height: 15px;
  }
  @media (hover: none) {
    .hide {
      display: none;
    }
  }
  @media (max-width: 560px) {
    .corner,
    .toast {
      inset-inline-end: 16px;
      bottom: max(16px, calc(env(safe-area-inset-bottom) + 10px));
    }
  }
  @keyframes tip {
    from {
      opacity: 0;
    }
  }
  @media (prefers-color-scheme: dark) {
    .root {
      color: #ece7da;
    }
    .tip {
      background: #ece7da;
      color: #18204a;
    }
    .cost,
    .follow {
      background: #1b2350;
      color: #a3a9c8;
      box-shadow:
        0 0 0 1px #2c3670,
        0 8px 18px -10px rgb(0 0 0 / 0.6);
    }
    .knob {
      background: rgb(241 237 226 / 0.16);
    }
    [aria-checked="true"] {
      color: #3fc1b8;
    }
    .chip,
    .toast,
    .nudge {
      background: #f6f0e2;
      color: #18204a;
    }
    .about {
      color: rgb(24 32 74 / 0.66);
    }
    .act svg {
      color: #c8321f;
    }
    .dismiss {
      color: rgb(24 32 74 / 0.5);
    }
    .toast button {
      background: rgb(24 32 74 / 0.08);
    }
    .toast button:hover {
      background: rgb(24 32 74 / 0.14);
    }
  }
  @keyframes nudge {
    from {
      opacity: 0;
      scale: 0.7;
    }
  }
  @keyframes arrive {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.6);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .badge,
    .hide,
    .follow,
    .chip,
    .toast,
    .nudge,
    .tip {
      animation: none;
      transition: none;
    }
  }
</style>
