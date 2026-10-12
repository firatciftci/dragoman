<script lang="ts">
  import { page } from "$app/state";
  import { locales as names } from "@dragoman/brand/locales";
  import Tooltip from "@dragoman/brand/tooltip.svelte";
  import { onMount } from "svelte";
  import { m } from "#lib/messages.ts";
  import {
    deLocalizeHref,
    getLocale,
    locales,
    localizeHref,
  } from "#lib/paraglide/runtime.js";

  const locale = getLocale();
  const path = $derived(deLocalizeHref(page.url.pathname));
  const local = new Intl.DisplayNames([locale], {
    type: "language",
    fallback: "none",
  });
  const english = new Intl.DisplayNames(["en"], {
    type: "language",
    fallback: "none",
  });
  const collator = new Intl.Collator(locale);
  const entries = locales
    .map((code) => {
      const native = names[code];
      const name = local.of(code);
      return {
        code,
        native,
        name: name === native ? undefined : name,
        search: [native, name, english.of(code), code]
          .join(" ")
          .normalize("NFD")
          .replaceAll(/\p{M}/gu, "")
          .toLocaleLowerCase(),
      };
    })
    .toSorted((a, b) => collator.compare(a.native, b.native));

  let query = $state("");
  let open = $state(false);
  let suggested: Array<string> = $state([]);
  let panel: HTMLElement | undefined = $state();
  let search: HTMLInputElement | undefined = $state();

  const needle = $derived(
    query.trim().normalize("NFD").replaceAll(/\p{M}/gu, "").toLocaleLowerCase(),
  );
  const shown = $derived(
    needle === ""
      ? entries
      : entries.filter((entry) => entry.search.includes(needle)),
  );
  const picks = $derived(
    needle === "" && suggested.some((code) => code !== locale)
      ? entries.filter((entry) => suggested.includes(entry.code))
      : [],
  );

  onMount(() => {
    suggested =
      document.documentElement.dataset.suggested?.split(" ").filter(Boolean) ??
      [];
  });
</script>

{#snippet row(entry: (typeof entries)[number])}
  <li>
    <a
      href={localizeHref(path, { locale: entry.code })}
      hreflang={entry.code}
      data-sveltekit-reload
      aria-current={entry.code === locale ? "page" : undefined}
      class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[16px] transition-colors hover:bg-ink/6 focus-visible:bg-ink/6 focus-visible:outline-offset-0 aria-[current=page]:font-semibold"
    >
      <span class="min-w-0 flex-1 truncate"
        ><bdi lang={entry.code}>{entry.native}</bdi></span
      >
      {#if entry.name != null}
        <span class="max-w-[45%] truncate text-[14px] text-ink/70"
          >{entry.name}</span
        >
      {/if}
      <svg
        viewBox="0 0 16 16"
        class={[
          "size-4 shrink-0 text-cobalt",
          { invisible: entry.code !== locale },
        ]}
        aria-hidden="true"
      >
        <path
          d="m3 8.5 3.2 3L13 4.5"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </a>
  </li>
{/snippet}

<Tooltip text={m.site_language_choose()}>
  {#snippet children({ props })}
    <button
      {...props}
      type="button"
      popovertarget="languages"
      aria-expanded={open}
      class="flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-[15px] font-medium opacity-80 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 aria-expanded:bg-current/10 aria-expanded:opacity-100"
    >
      <svg viewBox="0 0 20 20" class="size-5 shrink-0" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="10" cy="10" r="7.6" />
          <path
            d="M2.6 10h14.8M10 2.4c2.2 2.2 3.2 4.8 3.2 7.6s-1 5.4-3.2 7.6c-2.2-2.2-3.2-4.8-3.2-7.6s1-5.4 3.2-7.6Z"
          />
        </g>
      </svg>
      <span class="sr-only">{m.site_language()}</span>{" "}<span
        lang={locale}
        class="max-lg:sr-only">{names[locale]}</span
      >
      <svg
        viewBox="0 0 12 12"
        class="size-3 shrink-0 max-lg:hidden"
        aria-hidden="true"
      >
        <path
          d="m3 4.5 3 3 3-3"
          stroke="currentColor"
          stroke-width="1.6"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  {/snippet}
</Tooltip>

<div
  id="languages"
  popover
  role="dialog"
  tabindex="-1"
  aria-label={m.site_language_choose()}
  bind:this={panel}
  class="picker flex-col overflow-hidden rounded-3xl bg-tile text-ink shadow-[0_30px_60px_-20px_rgb(15_22_54/0.55)] ring-1 ring-ink/10"
  ontoggle={(event) => {
    open = event.newState === "open";
    if (!open) {
      query = "";
      return;
    }
    if (matchMedia("(pointer: fine)").matches) search?.focus();
    else panel?.querySelector<HTMLElement>('a[aria-current="page"]')?.focus();
  }}
  onkeydown={(event) => {
    const links = [
      ...(panel?.querySelectorAll<HTMLAnchorElement>("a[hreflang]") ?? []),
    ];
    const index = links.findIndex((link) => link === document.activeElement);
    let next: HTMLElement | undefined;
    if (event.key === "Escape") {
      event.preventDefault();
      panel?.hidePopover();
      return;
    }
    if (event.key === "ArrowDown") next = links[index + 1];
    else if (event.key === "ArrowUp")
      next = index > 0 ? links[index - 1] : index === 0 ? search : undefined;
    else if (event.key === "Home" && index !== -1) next = links[0];
    else if (event.key === "End" && index !== -1) next = links.at(-1);
    else if (event.key === "Enter" && index === -1 && needle !== "") {
      event.preventDefault();
      links[0]?.click();
      return;
    } else if (
      index !== -1 &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    )
      search?.focus();
    if (next == null) return;
    event.preventDefault();
    next.focus();
  }}
>
  <div class="border-b border-ink/10 p-3">
    <label class="relative block">
      <span class="sr-only">{m.site_language_search()}</span>
      <svg
        viewBox="0 0 16 16"
        class="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink/50"
        aria-hidden="true"
      >
        <g fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="7" cy="7" r="4.8" />
          <path d="m10.6 10.6 3.4 3.4" stroke-linecap="round" />
        </g>
      </svg>
      <input
        bind:this={search}
        bind:value={query}
        type="search"
        autocomplete="off"
        spellcheck="false"
        enterkeyhint="go"
        aria-controls="languages-list"
        placeholder={m.site_language_search()}
        class="min-h-11 w-full rounded-2xl bg-ink/6 ps-10 pe-3 text-[16px] placeholder:text-ink/65 focus-visible:outline-offset-0"
      />
    </label>
  </div>
  <div id="languages-list" class="overflow-y-auto overscroll-contain p-2">
    {#if picks.length > 0}
      <p
        id="languages-suggested"
        class="px-3 pt-2 pb-1 text-[13px] font-semibold text-ink/75"
      >
        {m.site_language_suggested()}
      </p>
      <ul aria-labelledby="languages-suggested">
        {#each picks as entry (entry.code)}
          {@render row(entry)}
        {/each}
      </ul>
      <p
        id="languages-all"
        class="mt-2 border-t border-ink/10 px-3 pt-3 pb-1 text-[13px] font-semibold text-ink/75"
      >
        {m.site_language_all()}
      </p>
    {/if}
    <ul aria-labelledby={picks.length > 0 ? "languages-all" : undefined}>
      {#each shown as entry (entry.code)}
        {@render row(entry)}
      {/each}
    </ul>
    <p role="status" class={["px-3", { "py-3": shown.length === 0 }]}>
      {#if shown.length === 0}{m.site_language_none({
          query: query.trim(),
        })}{/if}
    </p>
  </div>
</div>

<style>
  .picker {
    margin: 0;
    inset-block: 4.5rem auto;
    inset-inline: auto max(1rem, calc((100vw - 80rem) / 2 + 1.25rem));
    width: min(24rem, calc(100vw - 2rem));
    max-height: min(34rem, calc(100dvh - 6rem));
    transition:
      opacity 0.18s,
      translate 0.18s var(--ease-quill, ease-out),
      overlay 0.18s allow-discrete,
      display 0.18s allow-discrete;
  }

  .picker:popover-open {
    display: flex;
  }

  .picker:not(:popover-open) {
    opacity: 0;
    translate: 0 -8px;
  }

  @starting-style {
    .picker:popover-open {
      opacity: 0;
      translate: 0 -8px;
    }
  }

  .picker::backdrop {
    background: transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    .picker {
      transition: none;
    }
  }
</style>
