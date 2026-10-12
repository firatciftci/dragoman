<svelte:options css="injected" />

<script lang="ts">
  import { sourceName } from "#lib/messages.ts";
  import type { Inspect } from "./view.svelte.ts";
  import { hint, m, view } from "./view.svelte.ts";

  let {
    inspect,
    onretried,
    onclose,
  }: { inspect: Inspect; onretried: () => void; onclose?: () => void } =
    $props();

  let isRetrying = $state(false);
  let isCopied = $state(false);
</script>

<div class="original">
  <div class="head">
    <p>
      {view.source == null || view.source === "und"
        ? m.original()
        : m.original_in({ language: sourceName(view.source) })}
    </p>
    {#if inspect.retry != null}
      <button
        type="button"
        aria-label={m.retranslate()}
        {@attach hint(() => m.retranslate())}
        disabled={isRetrying}
        class:spinning={isRetrying}
        onclick={async () => {
          isRetrying = true;
          await inspect.retry?.();
          isRetrying = false;
          onretried();
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M13.2 6.4A5.3 5.3 0 0 0 3.4 5M2.8 9.6A5.3 5.3 0 0 0 12.6 11M13.4 2.6v3.8H9.6M2.6 13.4V9.6h3.8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {/if}
    <button
      type="button"
      aria-label={isCopied ? m.copied() : m.copy()}
      {@attach hint(() => (isCopied ? m.copied() : m.copy()))}
      onclick={async () => {
        await navigator.clipboard.writeText(inspect.text);
        isCopied = true;
        setTimeout(() => (isCopied = false), 1600);
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {#if isCopied}
          <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {:else}
          <path
            d="M5.5 5.5V3.2c0-.4.3-.7.7-.7h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7h-2.3M3.2 5.5h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7H3.2a.7.7 0 0 1-.7-.7V6.2c0-.4.3-.7.7-.7Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        {/if}
      </svg>
    </button>
    {#if onclose != null}
      <button
        type="button"
        aria-label={m.close()}
        {@attach hint(() => m.close())}
        onclick={onclose}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="m4 4 8 8m0-8-8 8"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    {/if}
  </div>
  <p class="text" dir="auto" lang={view.source ?? undefined}>{inspect.text}</p>
</div>

<style>
  .original {
    box-sizing: border-box;
    width: max-content;
    max-width: min(460px, calc(100vw - 32px));
    padding: 9px 10px 11px 14px;
    font:
      14px/1.55 system-ui,
      sans-serif;
  }
  :global(.sheet) .original {
    width: auto;
    max-width: none;
    padding: 0 20px 12px;
    font-size: 16px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 200px;
  }
  .head p {
    flex: 1;
    margin: 0;
    margin-inline-end: 8px;
    font-size: 11.5px;
    font-weight: 600;
    color: #2347a8;
  }
  button {
    all: unset;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: #5d6385;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button:hover {
    background: rgb(24 32 74 / 0.07);
    color: #18204a;
  }
  button:focus-visible {
    outline: 2px solid #e0ac3e;
  }
  button:disabled {
    cursor: progress;
  }
  svg {
    width: 16px;
    height: 16px;
  }
  .spinning svg {
    animation: spin 0.9s linear infinite;
  }
  .text {
    max-height: 40vh;
    margin: 2px 0 0;
    overflow-y: auto;
    padding-inline-end: 4px;
    white-space: pre-line;
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
  }
  @media (prefers-color-scheme: dark) {
    .head p {
      color: #e0ac3e;
    }
    button {
      color: #a3a9c8;
    }
    button:hover {
      background: rgb(241 237 226 / 0.08);
      color: #ece7da;
    }
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
</style>
