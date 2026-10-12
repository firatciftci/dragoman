<script lang="ts">
  import type { Snippet } from "svelte";
  import { locales as names } from "@dragoman/brand/locales";
  import type { Page } from "#lib/pages.ts";
  import { m } from "#lib/messages.ts";
  import { getLocale } from "#lib/paraglide/runtime.js";

  let {
    kind,
    page,
    popup = false,
    pressed = false,
    children,
  }: {
    kind: "desktop" | "android" | "iphone";
    page: Page;
    popup?: boolean;
    pressed?: boolean;
    children: Snippet;
  } = $props();

  const language = names[getLocale()];
</script>

{#snippet lock()}
  <svg viewBox="0 0 12 14" class="h-[1.1em] shrink-0" aria-hidden="true">
    <rect x="1.5" y="6" width="9" height="7" rx="1.6" fill="currentColor" />
    <path
      d="M3.6 6V4.4a2.4 2.4 0 0 1 4.8 0V6"
      stroke="currentColor"
      stroke-width="1.5"
      fill="none"
    />
  </svg>
{/snippet}

<div class="frame size-full" dir="ltr">
  {#if kind === "desktop"}
    <div
      class="chrome flex size-full flex-col overflow-hidden rounded-[calc(var(--u)*1.8)] bg-[#dfe3ee] text-[#3a4266]"
    >
      <div
        class="flex h-[calc(var(--u)*6.4)] shrink-0 items-end gap-[calc(var(--u)*1)] px-[calc(var(--u)*2)]"
      >
        <span
          class="mb-[calc(var(--u)*2.3)] flex gap-[calc(var(--u)*0.9)]"
          aria-hidden="true"
        >
          {#each ["#f0605a", "#f5be4f", "#58c75a"] as color (color)}
            <span
              class="size-[calc(var(--u)*1.3)] rounded-full"
              style:background={color}
            ></span>
          {/each}
        </span>
        <span
          class="ms-[calc(var(--u)*1.6)] flex h-[calc(var(--u)*4.4)] w-[calc(var(--u)*34)] items-center gap-[calc(var(--u)*1)] rounded-t-[calc(var(--u)*1.2)] bg-[#f5f6fa] px-[calc(var(--u)*1.6)] text-[length:calc(var(--u)*1.7)]"
        >
          <span
            class="grid size-[calc(var(--u)*2.2)] shrink-0 place-items-center rounded-[calc(var(--u)*0.5)] text-[length:calc(var(--u)*1.4)] font-bold text-white"
            style:background={page.accent}
            aria-hidden="true">{page.site.slice(0, 1)}</span
          >
          <span class="truncate" lang={page.lang}>{page.site}</span>
          <span class="ms-auto opacity-50" aria-hidden="true">×</span>
        </span>
      </div>
      <div
        class="flex h-[calc(var(--u)*5.6)] shrink-0 items-center gap-[calc(var(--u)*1.6)] bg-[#f5f6fa] px-[calc(var(--u)*2)]"
      >
        <svg
          viewBox="0 0 48 16"
          class="w-[calc(var(--u)*7)] shrink-0 opacity-60"
          aria-hidden="true"
        >
          <path
            d="M8 3 3 8l5 5M3 8h10M24 3l5 5-5 5M29 8H19M44 5a6 6 0 1 0 1 5M45 2v4h-4"
            stroke="currentColor"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span
          class="flex h-[calc(var(--u)*3.8)] min-w-0 flex-1 items-center gap-[calc(var(--u)*1)] rounded-full bg-[#e6e9f2] px-[calc(var(--u)*1.8)] text-[length:calc(var(--u)*1.8)]"
        >
          {@render lock()}
          <span class="truncate"
            ><span class="text-[#18204a]">{page.host}</span><span
              class="text-ink/70">{page.path}</span
            ></span
          >
        </span>
        <span
          class="extension relative grid size-[calc(var(--u)*3.8)] shrink-0 place-items-center rounded-full transition-[background-color,scale] duration-200"
          class:pressed
          data-target="extension"
        >
          <img src="/logo.webp" alt="" class="size-[calc(var(--u)*2.8)]" />
        </span>
      </div>
      <div class="relative min-h-0 flex-1 bg-white">
        {@render children()}
        {#if popup}
          <div
            class="popup absolute end-[calc(var(--u)*1.6)] top-[calc(var(--u)*0.8)] z-20 w-[calc(var(--u)*36)] rounded-[calc(var(--u)*1.6)] bg-tile p-[calc(var(--u)*2)] text-ink shadow-[0_calc(var(--u)*2.4)_calc(var(--u)*5)_calc(var(--u)*-1.6)_rgb(15_22_54/0.55)] ring-1 ring-[#d9d2bf]"
          >
            <span class="flex items-center gap-[calc(var(--u)*1.2)]">
              <img src="/logo.webp" alt="" class="size-[calc(var(--u)*3.6)]" />
              <span
                class="font-brand text-[length:calc(var(--u)*2.8)] leading-none"
                >dragoman</span
              >
            </span>
            <span
              class="mt-[calc(var(--u)*2)] block text-[length:calc(var(--u)*1.6)] text-[#5d6385]"
              >{m.translate_into()}</span
            >
            <span
              class="mt-[calc(var(--u)*0.6)] flex h-[calc(var(--u)*4.4)] items-center justify-between rounded-[calc(var(--u)*1)] bg-white px-[calc(var(--u)*1.4)] text-[length:calc(var(--u)*1.9)] ring-1 ring-[#d9d2bf]"
              class:font-hand={getLocale() === "ota"}
            >
              {language}
              <svg
                viewBox="0 0 10 6"
                class="w-[calc(var(--u)*1.4)]"
                aria-hidden="true"
              >
                <path
                  d="m1 1 4 4 4-4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  fill="none"
                />
              </svg>
            </span>
            <span
              class="mt-[calc(var(--u)*1.6)] grid h-[calc(var(--u)*4.8)] place-items-center rounded-[calc(var(--u)*1.2)] border-b-[calc(var(--u)*0.5)] border-[#8e2214] bg-coral text-[length:calc(var(--u)*1.9)] font-semibold text-tile"
              data-target="translate">{m.translate_page()}</span
            >
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div
      class="relative size-full rounded-[13cqi] bg-[#1b1f33] p-[3.2cqi] shadow-[inset_0_0_0_0.8cqi_#3a4060,inset_0_0_0_1.4cqi_#11142a]"
    >
      <div
        class="relative flex size-full flex-col overflow-hidden rounded-[10cqi] bg-white text-[#3a4266]"
      >
        <div
          class="flex h-[11cqi] shrink-0 items-center justify-between px-[8cqi] pt-[2cqi] text-[4cqi] font-semibold text-[#18204a]"
          class:bg-[#f9f9fb]={kind === "android"}
        >
          <span>9:41</span>
          {#if kind === "iphone"}
            <span
              class="absolute start-1/2 top-[2.6cqi] h-[7.6cqi] w-[28cqi] -translate-x-1/2 rounded-full bg-[#0a0c18]"
              aria-hidden="true"
            ></span>
          {/if}
          <svg viewBox="0 0 40 12" class="w-[13cqi]" aria-hidden="true">
            <path
              d="M2 10h2V8H2zm4 0h2V6H6zm4 0h2V4h-2zm4 0h2V2h-2z"
              fill="currentColor"
            />
            <rect
              x="22"
              y="2"
              width="15"
              height="8"
              rx="2"
              fill="none"
              stroke="currentColor"
            />
            <rect
              x="24"
              y="4"
              width="10"
              height="4"
              rx="1"
              fill="currentColor"
            />
          </svg>
        </div>
        {#if kind === "android"}
          <div
            class="flex h-[13cqi] shrink-0 items-center gap-[2.4cqi] bg-[#f9f9fb] px-[3.6cqi]"
          >
            <span
              class="flex h-[9cqi] min-w-0 flex-1 items-center gap-[1.6cqi] rounded-full bg-[#ececf2] px-[3.6cqi] text-[3.6cqi]"
            >
              {@render lock()}
              <span class="truncate text-[#18204a]">{page.host}</span>
            </span>
            <span
              class="grid size-[5.6cqi] place-items-center rounded-[1.2cqi] border-[0.5cqi] border-current text-[3cqi] font-bold"
              aria-hidden="true">1</span
            >
            <span
              class="flex flex-col gap-[0.8cqi] opacity-70"
              aria-hidden="true"
            >
              {#each [0, 1, 2] as dot (dot)}
                <span class="size-[1.1cqi] rounded-full bg-current"></span>
              {/each}
            </span>
          </div>
        {/if}
        <div class="relative min-h-0 flex-1">
          {@render children()}
        </div>
        {#if kind === "iphone"}
          <div class="shrink-0 bg-[#f6f6f8] px-[4cqi] pt-[2.6cqi] pb-[5cqi]">
            <span
              class="flex h-[10cqi] items-center gap-[2cqi] rounded-[3.4cqi] bg-white px-[3.6cqi] text-[3.6cqi] shadow-[0_0.6cqi_2.4cqi_rgb(24_32_74/0.14)]"
            >
              <span class="font-semibold" aria-hidden="true">aA</span>
              <span
                class="mx-auto flex min-w-0 items-center gap-[1.4cqi] text-[#18204a]"
              >
                {@render lock()}
                <span class="truncate">{page.host}</span>
              </span>
              <svg viewBox="0 0 16 16" class="w-[4cqi]" aria-hidden="true">
                <path
                  d="M13 6a5.5 5.5 0 1 0 .4 4.4M13.6 2v4h-4"
                  stroke="currentColor"
                  stroke-width="1.6"
                  fill="none"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span
              class="mx-auto mt-[4cqi] block h-[1.4cqi] w-[34cqi] rounded-full bg-[#18204a]"
              aria-hidden="true"
            ></span>
          </div>
        {:else}
          <span
            class="mx-auto my-[3cqi] block h-[1.2cqi] w-[30cqi] shrink-0 rounded-full bg-[#18204a]/70"
            aria-hidden="true"
          ></span>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .frame {
    container-type: inline-size;
  }

  .chrome {
    --u: 1cqi;
  }

  @container (width < 560px) {
    .chrome {
      --u: 1.75cqi;
    }
  }

  .extension.pressed {
    background: rgb(35 71 168 / 0.16);
    scale: 0.9;
  }

  .popup {
    transform-origin: top right;
    animation: open 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes open {
    from {
      opacity: 0;
      scale: 0.92;
      translate: 0 calc(var(--u) * -2);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .popup {
      animation: none;
    }
  }
</style>
