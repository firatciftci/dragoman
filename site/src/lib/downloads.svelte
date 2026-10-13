<script lang="ts">
  import Brand from "#lib/brand.svelte";
  import { m } from "#lib/messages.ts";
  import { getLocale } from "#lib/paraglide/runtime.js";
  import { reveal } from "#lib/reveal.ts";

  const locale = getLocale();
  const names = new Intl.DisplayNames([locale], { type: "language" });
  const size = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 0,
  });
  const MAX = 52;
  const pairs = [
    ["en", "tr", 15.1],
    ["en", "de", 25.7],
    ["fr", "en", 26.2],
    ["ja", "en", 48.6],
  ] as const;
  const pivot = [
    ["fr", "en", 26.2],
    ["en", "de", 25.7],
  ] as const;
</script>

<figure
  class="mt-6 rounded-2xl bg-raised p-4 ring-1 ring-line sm:p-6"
  {@attach reveal}
>
  <p class="text-[13.5px] font-semibold text-muted">{m.docs_viz_downloads()}</p>
  <ul class="mt-4 grid gap-3">
    {#each pairs as [from, to, megabytes], index (`${from}-${to}`)}
      <li
        class="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4"
      >
        <span class="text-[14.5px]"
          >{names.of(from)}
          <span class="inline-block text-muted rtl:-scale-x-100">→</span>
          {names.of(to)}</span
        >
        <span class="flex items-center gap-3">
          <span class="h-3 flex-1 rounded-full bg-sunk">
            <span
              class="bar block h-full rounded-full bg-gold"
              style:width="{(megabytes / MAX) * 100}%"
              style:--i={index}
            ></span>
          </span>
          <span
            class="w-14 shrink-0 text-end text-[14px] font-semibold tabular-nums"
            >{size.format(megabytes)}</span
          >
        </span>
      </li>
    {/each}
  </ul>
  <div class="mt-6 border-t border-line pt-5">
    <p
      class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-medium"
    >
      {names.of("fr")}
      <span class="inline-block text-muted rtl:-scale-x-100">→</span>
      <span class="rounded-md bg-sunk px-1.5 text-muted">{names.of("en")}</span>
      <span class="inline-block text-muted rtl:-scale-x-100">→</span>
      {names.of("de")}
    </p>
    <span class="mt-3 flex items-center gap-3">
      <span
        class="flex h-3 flex-1 gap-0.5 overflow-hidden rounded-full bg-sunk"
      >
        {#each pivot as [from, to, megabytes], index (`${from}-${to}`)}
          <span
            class={[
              "bar block h-full",
              { "bg-gold": index === 0, "bg-gold/60": index === 1 },
            ]}
            style:width="{(megabytes / MAX) * 100}%"
            style:--i={pairs.length + index}
            title="{names.of(from)} → {names.of(to)}"
          ></span>
        {/each}
      </span>
      <span
        class="w-14 shrink-0 text-end text-[14px] font-semibold tabular-nums"
        >{size.format(pivot[0][2] + pivot[1][2])}</span
      >
    </span>
    <p class="mt-3 text-[14.5px] text-muted">
      <Brand text={m.docs_viz_pivot()} />
    </p>
  </div>
  <figcaption class="mt-4 text-[13px] text-muted">
    {m.docs_viz_source()}
  </figcaption>
</figure>

<style>
  .bar {
    transform: scaleX(0);
    transform-origin: left;
  }
  :global(:dir(rtl)) .bar {
    transform-origin: right;
  }
  :global([data-shown]) .bar {
    animation: grow 0.9s var(--ease-quill) forwards;
    animation-delay: calc(var(--i) * 120ms + 100ms);
  }
  @keyframes grow {
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar,
    :global([data-shown]) .bar {
      transform: none;
      animation: none;
    }
  }
</style>
