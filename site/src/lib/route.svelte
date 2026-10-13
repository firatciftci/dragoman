<script lang="ts">
  import Brand from "#lib/brand.svelte";
  import Emblem from "#lib/emblem.svelte";
  import { m } from "#lib/messages.ts";
  import { reveal } from "#lib/reveal.ts";
</script>

{#snippet track(isDashed: boolean, count: number)}
  <span class="relative h-6 min-w-10 flex-1" aria-hidden="true">
    <span
      class={[
        "absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2",
        { "border-line": !isDashed, "border-dashed border-gold/70": isDashed },
      ]}
    ></span>
    {#each { length: count }, index (index)}
      <span
        class={[
          "dot absolute top-1/2 size-2 -translate-y-1/2 rounded-full",
          { "bg-muted": !isDashed, "bg-gold": isDashed },
        ]}
        style:--delay="{(index / count) * (isDashed ? 4.8 : 2.4)}s"
        style:--speed="{isDashed ? 4.8 : 2.4}s"
      ></span>
    {/each}
  </span>
{/snippet}

{#snippet cloud(name: string)}
  <span
    class="flex min-w-28 shrink-0 items-center justify-center gap-2 rounded-full bg-sunk px-3 py-1.5 text-[14px] font-medium"
  >
    <svg viewBox="0 0 20 20" class="size-4 text-muted" aria-hidden="true">
      <path
        d="M5.5 15.5a3.5 3.5 0 0 1-.4-7 5 5 0 0 1 9.6-.8 3.9 3.9 0 0 1-.2 7.8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
    {name}
  </span>
{/snippet}

<figure
  class="mt-6 rounded-2xl bg-raised p-4 ring-1 ring-line sm:p-6"
  {@attach reveal}
>
  <p class="text-[13.5px] font-semibold text-muted">{m.docs_viz_route()}</p>
  <div
    class="mt-4 grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[8rem_minmax(0,1fr)]"
  >
    {#each [["Chrome", "Google"], ["Edge", "Microsoft"]] as const as [browser, company] (browser)}
      <span class="flex items-center gap-2 text-[15px] font-semibold">
        <Emblem name={browser} class="size-5" />
        {browser}
      </span>
      <span class="flex items-center gap-2">
        {@render track(false, 3)}
        {@render cloud(company)}
      </span>
    {/each}
    <span
      class="flex items-center gap-2 border-t border-line pt-3 text-[15px] font-semibold"
    >
      <img src="/logo.webp" alt="" class="size-5" />
      <Brand text="dragoman" />
    </span>
    <span class="flex items-center gap-2 border-t border-line pt-3">
      <span class="relative h-6 w-10 shrink-0" aria-hidden="true">
        <span
          class="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-turquoise/50"
        ></span>
      </span>
      <span
        class="device flex shrink-0 items-center gap-2 rounded-full bg-turquoise/14 px-3 py-1.5 text-[14px] font-semibold text-good"
      >
        <svg viewBox="0 0 20 20" class="size-4" aria-hidden="true">
          <path
            d="M3 4.5h14v8.5H3zM1.5 15.5h17"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
        {m.docs_viz_device()}
      </span>
    </span>
    <span
      class="col-span-2 -mt-3 flex items-center ps-2 sm:col-span-1 sm:col-start-2 sm:ps-[4.2rem]"
    >
      <span class="self-stretch" aria-hidden="true">
        <span
          class="block h-1/2 w-4 rounded-es-lg border-s-2 border-b-2 border-dashed border-gold/70"
        ></span>
      </span>
      {@render track(true, 1)}
      <span
        class="my-2 flex min-w-0 shrink items-center gap-2.5 rounded-2xl py-2 ps-3.5 pe-5 text-[14px] ring-1 ring-gold/60 ring-inset"
      >
        <svg
          viewBox="0 0 20 20"
          class="size-4 shrink-0 text-gold"
          aria-hidden="true"
        >
          <path
            d="M10 2.5 11.6 8.4 17.5 10l-5.9 1.6L10 17.5l-1.6-5.9L2.5 10l5.9-1.6Z"
            fill="currentColor"
          />
        </svg>
        <span class="min-w-0">
          <span class="font-medium">{m.docs_viz_provider()}</span>
          <span class="block text-[12.5px] leading-tight text-muted"
            >{m.docs_viz_provider_detail()}</span
          >
        </span>
      </span>
    </span>
  </div>
</figure>

<style>
  .dot {
    inset-inline-start: 0;
    opacity: 0;
  }
  :global([data-shown]) .dot {
    animation: travel var(--speed) linear infinite;
    animation-delay: var(--delay);
  }
  :global([data-shown]) .device {
    animation: glow 2.4s ease-in-out infinite;
  }
  @keyframes travel {
    0% {
      inset-inline-start: 0;
      opacity: 0;
    }
    12%,
    88% {
      opacity: 1;
    }
    100% {
      inset-inline-start: calc(100% - 0.5rem);
      opacity: 0;
    }
  }
  @keyframes glow {
    50% {
      box-shadow: 0 0 0 5px rgb(30 156 148 / 0.14);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global([data-shown]) .dot,
    :global([data-shown]) .device {
      animation: none;
    }
    .dot {
      opacity: 1;
      inset-inline-start: 50%;
    }
  }
</style>
