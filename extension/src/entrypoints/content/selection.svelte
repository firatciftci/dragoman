<svelte:options css="injected" />

<script lang="ts">
  import { on } from "svelte/events";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight } from "svelte/reactivity/window";
  import { browser } from "wxt/browser";
  import { languageName, sourceName } from "#lib/messages.ts";
  import Float from "./float.svelte";
  import { actions, m, view } from "./view.svelte.ts";

  let { language, locate }: { language: string; locate: () => DOMRect | null } =
    $props();

  const docked = new MediaQuery("(max-width: 560px), (pointer: coarse)");
  let anchor = $state<DOMRect | null>(null);

  $effect(() => {
    if (docked.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = locate();
      anchor =
        rect == null || rect.bottom < 0 || rect.top > (innerHeight.current ?? 0)
          ? null
          : rect;
    };
    const onMove = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    const offs = [
      on(window, "scroll", onMove, { capture: true, passive: true }),
      on(window, "resize", onMove, { passive: true }),
    ];
    return () => {
      cancelAnimationFrame(frame);
      for (const off of offs) off();
    };
  });
</script>

{#snippet menu()}
  <div
    class="menu"
    role="presentation"
    onmousedown={(event) => event.preventDefault()}
  >
    <p class="route">
      <img
        src={browser.runtime.getURL(`/characters/${view.character}.png`)}
        alt=""
      />
      <span>{sourceName(language)}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M3 8h9m-3.5-4 4 4-4 4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>{languageName(view.target, view.locale)}</span>
    </p>
    <div class="buttons">
      <button
        type="button"
        class="primary"
        onclick={actions.translateSelection}
      >
        {m.translate_selection()}
      </button>
      <button
        type="button"
        class="secondary"
        onclick={() => {
          view.selection = null;
          getSelection()?.removeAllRanges();
          if (view.phase === "active") actions.follow(true);
          else actions.translate();
        }}
      >
        {m.translate_page()}
      </button>
    </div>
  </div>
{/snippet}

{#if docked.current}
  <div class="dock" role="dialog" aria-label={m.translate_selection()}>
    {@render menu()}
  </div>
{:else if anchor != null}
  <Float {anchor} prefer={["top", "bottom"]} label={m.translate_selection()}>
    {@render menu()}
  </Float>
{/if}

<style>
  .menu {
    box-sizing: border-box;
    padding: 10px;
    font:
      14px/1.4 system-ui,
      sans-serif;
  }
  .route {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 2px 9px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .route span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .route img {
    width: 22px;
    height: 22px;
    flex: none;
    border-radius: 50%;
    background: #e9e4d4;
    object-fit: cover;
  }
  .route svg {
    width: 14px;
    height: 14px;
    flex: none;
    color: #2347a8;
  }
  :global([dir="rtl"]) .route svg {
    scale: -1 1;
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  button {
    flex: 1 1 auto;
    margin: 0;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button:focus-visible {
    outline: 2px solid #2347a8;
    outline-offset: 2px;
  }
  .primary {
    background: #c8321f;
    color: #f6f5ef;
    box-shadow: inset 0 -3px 0 #8e2214;
  }
  .primary:active {
    translate: 0 1px;
    box-shadow: inset 0 -1px 0 #8e2214;
  }
  .secondary {
    background: rgb(24 32 74 / 0.06);
    color: inherit;
    box-shadow: inset 0 -3px 0 rgb(24 32 74 / 0.12);
  }
  .secondary:active {
    translate: 0 1px;
  }
  .dock {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 5;
    box-sizing: border-box;
    max-width: 560px;
    margin-inline: auto;
    padding: 4px 8px max(8px, env(safe-area-inset-bottom));
    border-radius: 20px 20px 0 0;
    background: #f6f5ef;
    color: #18204a;
    box-shadow: 0 -14px 34px -14px rgb(15 22 54 / 0.45);
    pointer-events: auto;
    animation: slide 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .dock .buttons button {
    flex: 1 1 0;
    padding-block: 11px;
  }
  @media (prefers-color-scheme: dark) {
    .dock {
      background: #1b2350;
      color: #ece7da;
    }
    .route img {
      background: #2c3670;
    }
    .route svg {
      color: #9db4f5;
    }
    .secondary {
      background: rgb(236 231 218 / 0.08);
      box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.25);
    }
  }
  @keyframes slide {
    from {
      translate: 0 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dock {
      animation: none;
    }
  }
</style>
