<svelte:options css="injected" />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";

  let {
    anchor,
    prefer,
    label,
    tone = "card",
    children,
    onpointerenter,
    onpointerleave,
  }: {
    anchor: DOMRect;
    prefer: Array<"top" | "bottom" | "left" | "right">;
    label: string;
    tone?: "card" | "speech";
    children: Snippet;
    onpointerenter?: () => void;
    onpointerleave?: () => void;
  } = $props();

  let width = $state(0);
  let height = $state(0);

  const place = $derived.by(() => {
    const viewWidth = innerWidth.current ?? 0;
    const viewHeight = innerHeight.current ?? 0;
    const gap = tone === "speech" ? 8 : 12;
    const room = {
      top: anchor.top - gap - 8,
      bottom: viewHeight - anchor.bottom - gap - 8,
      left: anchor.left - gap - 8,
      right: viewWidth - anchor.right - gap - 8,
    };
    const side =
      prefer.find(
        (option) =>
          room[option] >=
          (option === "top" || option === "bottom" ? height : width),
      ) ??
      prefer.toSorted((a, b) => room[b] - room[a])[0] ??
      "top";
    const centerX = anchor.left + anchor.width / 2;
    const centerY = anchor.top + anchor.height / 2;
    const isVertical = side === "top" || side === "bottom";
    const x = Math.min(
      Math.max(
        8,
        side === "left"
          ? anchor.left - gap - width
          : side === "right"
            ? anchor.right + gap
            : centerX - width / 2,
      ),
      viewWidth - width - 8,
    );
    const y = Math.min(
      Math.max(
        8,
        side === "top"
          ? anchor.top - gap - height
          : side === "bottom"
            ? anchor.bottom + gap
            : centerY - height / 2,
      ),
      viewHeight - height - 8,
    );
    return {
      side,
      x,
      y,
      tail: isVertical
        ? Math.min(Math.max(18, centerX - x), width - 18)
        : Math.min(Math.max(18, centerY - y), height - 18),
    };
  });
</script>

<div
  class="float {tone}"
  role="dialog"
  tabindex="-1"
  aria-label={label}
  data-side={place.side}
  style:left="{place.x}px"
  style:top="{place.y}px"
  style:--tail="{place.tail}px"
  style:visibility={width === 0 ? "hidden" : null}
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  {onpointerenter}
  {onpointerleave}
>
  {@render children()}
</div>

<style>
  .float {
    --surface: #f6f5ef;
    --edge: #d9d2bf;
    position: fixed;
    z-index: 3;
    box-sizing: border-box;
    max-width: calc(100vw - 16px);
    border-radius: 16px;
    background: var(--surface);
    color: #18204a;
    border: 1px solid var(--edge);
    box-shadow:
      0 1px 0 #fff inset,
      0 22px 44px -18px rgb(15 22 54 / 0.55);
    pointer-events: auto;
    animation: rise 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .float::after {
    content: "";
    position: absolute;
    width: 12px;
    height: 12px;
    background: inherit;
    border: 1px solid var(--edge);
    rotate: 45deg;
  }
  [data-side="top"] {
    transform-origin: var(--tail) 100%;
  }
  [data-side="bottom"] {
    transform-origin: var(--tail) 0;
  }
  [data-side="left"] {
    transform-origin: 100% var(--tail);
  }
  [data-side="right"] {
    transform-origin: 0 var(--tail);
  }
  [data-side="top"]::after {
    top: calc(100% - 6px);
    left: calc(var(--tail) - 6px);
    border-top: 0;
    border-left: 0;
  }
  [data-side="bottom"]::after {
    bottom: calc(100% - 6px);
    left: calc(var(--tail) - 6px);
    border-bottom: 0;
    border-right: 0;
  }
  [data-side="left"]::after {
    left: calc(100% - 6px);
    top: calc(var(--tail) - 6px);
    border-bottom: 0;
    border-left: 0;
  }
  [data-side="right"]::after {
    right: calc(100% - 6px);
    top: calc(var(--tail) - 6px);
    border-top: 0;
    border-right: 0;
  }
  .speech {
    --surface: #fffdf6;
    --edge: #18204a;
    border-width: 2px;
    border-radius: 18px;
    box-shadow: 0 4px 0 rgb(24 32 74 / 0.18);
    animation: pop 0.34s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .speech::after {
    border-width: 2px;
  }
  .speech[data-side="top"]::after {
    top: calc(100% - 7px);
  }
  .speech[data-side="bottom"]::after {
    bottom: calc(100% - 7px);
  }
  .speech[data-side="left"]::after {
    left: calc(100% - 7px);
  }
  .speech[data-side="right"]::after {
    right: calc(100% - 7px);
  }
  @media (prefers-color-scheme: dark) {
    .float {
      --surface: #1b2350;
      --edge: #2c3670;
      color: #ece7da;
      box-shadow: 0 22px 44px -18px rgb(0 0 0 / 0.7);
    }
    .speech {
      --surface: #f6f0e2;
      --edge: #0f1636;
      color: #18204a;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 6px;
      scale: 0.97;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      scale: 0.6;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .float {
      animation: none;
    }
  }
</style>
