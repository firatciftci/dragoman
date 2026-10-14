<script lang="ts">
  import type { Snippet } from "svelte";
  import { onNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { locales as names } from "@dragoman/brand/locales";
  import Tooltip from "@dragoman/brand/tooltip.svelte";
  import { Tooltip as Tooltips } from "bits-ui";
  import "#app.css";
  import Install from "#lib/install.svelte";
  import Language from "#lib/language.svelte";
  import { m } from "#lib/messages.ts";
  import Newsletter from "#lib/newsletter.svelte";
  import {
    deLocalizeHref,
    getLocale,
    locales,
    localizeHref,
  } from "#lib/paraglide/runtime.js";
  import { stores } from "#lib/stores.ts";

  let { children }: { children: Snippet } = $props();

  const path = $derived(deLocalizeHref(page.url.pathname));
  const isHome = $derived(path === "/");
  const home = localizeHref("/");
  const locale = getLocale();
  const url = $derived(`https://dragoman.io${localizeHref(path)}`);
  const meta = $derived(
    {
      "/docs": {
        title: `${m.docs_title()} | dragoman`,
        description: m.site_meta(),
      },
      "/privacy": {
        title: `${m.privacy_title()} | dragoman`,
        description: m.site_meta(),
      },
      "/maker": {
        title: `${m.maker_title()} | dragoman`,
        description: m.maker_meta(),
      },
    }[path] ?? { title: m.site_title(), description: m.site_meta() },
  );
  const links = [
    ["#how", m.site_nav_how()],
    ["#models", m.site_nav_models()],
    ["#cast", m.site_nav_cast()],
    ["#languages", m.site_nav_languages()],
  ] as const;

  onNavigate(async (navigation) => {
    if (
      !("startViewTransition" in document) ||
      navigation.from?.url.pathname === navigation.to?.url.pathname
    )
      return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <meta name="description" content={meta.description} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="dragoman" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content={meta.title} />
  <meta property="og:description" content={meta.description} />
  <meta property="og:locale" content={locale.replace("-", "_")} />
  <meta property="og:image" content="https://dragoman.io/og.jpg?v=2" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={m.site_title()} />
  <meta name="twitter:card" content="summary_large_image" />
  {#each locales as locale (locale)}
    <link
      rel="alternate"
      hreflang={locale}
      href="https://dragoman.io{localizeHref(path, { locale })}"
    />
  {/each}
  <link
    rel="alternate"
    hreflang="x-default"
    href="https://dragoman.io{localizeHref(path, { locale: 'en' })}"
  />
</svelte:head>

<Tooltips.Provider delayDuration={400}>
  <a
    href="#main"
    class="fixed start-4 top-4 z-50 -translate-y-24 rounded-xl bg-ink px-4 py-2.5 font-semibold text-tile transition-transform focus-visible:translate-y-0"
    >{m.site_skip()}</a
  >

  <header
    class={[
      "absolute inset-x-0 top-0 isolate z-30 [view-transition-name:header]",
      { "text-ink": isHome, "text-tile": !isHome },
    ]}
  >
    {#if isHome}
      <div
        class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-[#fbf4e8]/85 via-[#fbf4e8]/55 to-[#fbf4e8]/0 mask-b-from-45% backdrop-blur-[10px]"
        aria-hidden="true"
      ></div>
    {/if}
    <nav
      class="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 max-sm:gap-3"
    >
      <a
        href={home}
        class="flex shrink-0 items-center gap-2.5 font-brand text-[28px] leading-none"
      >
        <img src="/logo.webp" alt="" width="36" height="36" class="size-9" />
        <span class="max-[22.5rem]:sr-only">dragoman</span>
      </a>
      <Tooltip text={m.site_nav_meaning()}>
        {#snippet children({ props })}
          <a
            {...props}
            href="{home}#dragoman"
            class="-ms-3 grid size-7 shrink-0 place-items-center rounded-full font-display text-[17px] leading-none opacity-70 ring-1 ring-current/40 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 max-sm:ms-0"
            aria-label={m.site_nav_meaning()}>?</a
          >
        {/snippet}
      </Tooltip>
      <ul
        class="ms-auto hidden items-center gap-1 text-[15px] font-medium xl:flex"
      >
        {#each links as [hash, label] (hash)}
          <li>
            <a
              href="{home}{hash}"
              class="rounded-full px-3 py-1.5 opacity-80 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100"
              >{label}</a
            >
          </li>
        {/each}
      </ul>
      <a
        href={localizeHref("/docs")}
        class="ms-auto flex min-h-10 shrink-0 items-center rounded-full px-3 text-[15px] font-medium opacity-80 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 xl:ms-0"
      >
        <svg viewBox="0 0 20 20" class="size-5 md:hidden" aria-hidden="true">
          <path
            d="M2.5 4.6c2.5-1 5-.8 7.5.9 2.5-1.7 5-1.9 7.5-.9v10.8c-2.5-1-5-.8-7.5.9-2.5-1.7-5-1.9-7.5-.9ZM10 5.5v10.8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <span class="max-md:sr-only">{m.site_nav_docs()}</span>
      </a>
      <Language />
      <Tooltip text="GitHub">
        {#snippet children({ props })}
          <a
            {...props}
            href={stores.source}
            target="_blank"
            rel="noreferrer external"
            class="-ms-4 grid size-10 shrink-0 place-items-center rounded-full opacity-80 transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 max-lg:hidden"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 16 16" class="size-5" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0c4.42 0 8 3.58 8 8a8.01 8.01 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82a7.6 7.6 0 0 0-4 0c-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A8 8 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
              />
            </svg>
          </a>
        {/snippet}
      </Tooltip>
      <span class="hidden sm:block"><Install small /></span>
    </nav>
  </header>

  <main id="main" tabindex="-1" class="outline-none">
    {@render children()}
  </main>

  <footer class="relative bg-lapis text-tile/70">
    <svg
      class="absolute inset-x-0 top-0 h-6 w-full text-gold/30"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="footer-stars"
          width="36"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z"
            transform="translate(12 6) scale(0.6)"
            fill="currentColor"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#footer-stars)" />
    </svg>
    <div
      class="mx-auto grid max-w-7xl gap-x-12 gap-y-9 px-5 pt-16 pb-10 text-[15px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div>
        <a
          href={home}
          class="inline-flex items-center gap-3 font-brand text-[30px] leading-none text-tile"
        >
          <img src="/logo.webp" alt="" width="40" height="40" class="size-10" />
          dragoman
        </a>
        <p class="mt-4 max-w-xs leading-relaxed">
          {m.site_footer_license()}
        </p>
        <Newsletter />
      </div>
      <ul
        class="grid grid-cols-2 gap-x-6 border-t border-tile/10 pt-2 sm:flex sm:flex-wrap sm:gap-x-1 sm:border-0 sm:pt-0 md:justify-end"
      >
        <li>
          <a
            href={localizeHref("/docs")}
            class="flex min-h-11 items-center rounded-xl transition-colors hover:text-tile sm:px-3 sm:hover:bg-tile/8"
            >{m.site_nav_docs()}</a
          >
        </li>
        <li>
          <a
            href={localizeHref("/privacy")}
            class="flex min-h-11 items-center rounded-xl transition-colors hover:text-tile sm:px-3 sm:hover:bg-tile/8"
            >{m.privacy_title()}</a
          >
        </li>
        <li>
          <a
            href={localizeHref("/maker")}
            class="flex min-h-11 items-center rounded-xl transition-colors hover:text-tile sm:px-3 sm:hover:bg-tile/8"
            >{m.maker_title()}</a
          >
        </li>
        <li>
          <a
            href={stores.source}
            target="_blank"
            rel="noreferrer external"
            class="flex min-h-11 items-center gap-1.5 rounded-xl transition-colors hover:text-tile sm:px-3 sm:hover:bg-tile/8"
          >
            GitHub
            <svg
              viewBox="0 0 12 12"
              class="size-2.5 rtl:-scale-x-100"
              aria-hidden="true"
            >
              <path
                d="M3 9 9 3M4 3h5v5"
                stroke="currentColor"
                stroke-width="1.8"
                fill="none"
                stroke-linecap="round"
              />
            </svg>
          </a>
        </li>
      </ul>
    </div>
    <div class="border-t border-tile/10">
      <div
        class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-5 pb-10 text-[14px]"
      >
        <button
          type="button"
          popovertarget="languages"
          class="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full px-4 ring-1 ring-tile/20 transition-colors hover:bg-tile/8 hover:text-tile"
        >
          <svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="10" cy="10" r="7.6" />
              <path
                d="M2.6 10h14.8M10 2.4c2.2 2.2 3.2 4.8 3.2 7.6s-1 5.4-3.2 7.6c-2.2-2.2-3.2-4.8-3.2-7.6s1-5.4 3.2-7.6Z"
              />
            </g>
          </svg>
          <span class="sr-only">{m.site_language()}</span>{" "}<span
            lang={locale}>{names[locale]}</span
          >
        </button>
        <p dir="ltr">© {new Date().getFullYear()} Fırat Çiftçi</p>
      </div>
    </div>
  </footer>
</Tooltips.Provider>
