<svelte:options css="injected" />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { cubicIn } from "svelte/easing";
  import { fade } from "svelte/transition";

  let {
    label,
    onclose,
    children,
  }: { label: string; onclose: () => void; children: Snippet } = $props();

  let pull = $state(0);
  let origin = $state<number | null>(null);
  let isClosing = false;

  const close = () => {
    if (!isClosing) onclose();
  };

  function sink(node: HTMLElement) {
    isClosing = true;
    node.inert = true;
    const from = pull;
    const distance = node.offsetHeight;
    return {
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 260,
      easing: cubicIn,
      css: (t: number) =>
        `translate: 0 ${from + (1 - t) * (distance - from)}px`,
    };
  }
</script>

<svelte:window
  onkeydown={(event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  }}
/>

<div
  class="backdrop"
  aria-hidden="true"
  onclick={close}
  out:fade|global={{ duration: 220 }}
></div>
<div
  class="sheet"
  role="dialog"
  aria-modal="true"
  aria-label={label}
  style:translate="0 {pull}px"
  class:held={origin != null}
  out:sink|global
>
  <div
    class="grip"
    aria-hidden="true"
    onpointerdown={(event) => {
      origin = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onpointermove={(event) => {
      if (origin != null) pull = Math.max(0, event.clientY - origin);
    }}
    onpointerup={() => {
      origin = null;
      if (pull > 80) close();
      else pull = 0;
    }}
    onpointercancel={() => {
      origin = null;
      pull = 0;
    }}
  >
    <span></span>
  </div>
  {@render children()}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 4;
    background: rgb(15 22 54 / 0.32);
    pointer-events: auto;
    animation: fade 0.25s ease-out;
  }
  .sheet {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 5;
    box-sizing: border-box;
    max-width: 560px;
    max-height: 82vh;
    margin-inline: auto;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 22px 22px 0 0;
    background: #f6f5ef;
    color: #18204a;
    box-shadow: 0 -18px 40px -16px rgb(15 22 54 / 0.5);
    pointer-events: auto;
    transition: translate 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    animation: slide 0.38s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .held {
    transition: none;
  }
  .grip {
    display: grid;
    place-items: center;
    height: 26px;
    touch-action: none;
    cursor: grab;
  }
  .grip span {
    width: 40px;
    height: 5px;
    border-radius: 3px;
    background: #d9d2bf;
  }
  @media (prefers-color-scheme: dark) {
    .sheet {
      background: #1b2350;
      color: #ece7da;
    }
    .grip span {
      background: #2c3670;
    }
  }
  @keyframes slide {
    from {
      translate: 0 100%;
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sheet,
    .backdrop {
      animation: none;
    }
  }
</style>
