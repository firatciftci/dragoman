<script lang="ts">
  import { onMount } from "svelte";
  import type { Browser, Family } from "#lib/agent.ts";
  import { detect } from "#lib/agent.ts";
  import Emblem from "#lib/emblem.svelte";
  import { m } from "#lib/messages.ts";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { stores } from "#lib/stores.ts";

  const groups = [
    [
      m.docs_group_start(),
      [
        ["install", m.docs_install_title()],
        ["first", m.docs_first_title()],
      ],
    ],
    [
      m.docs_group_models(),
      [
        ["model", m.docs_model_title()],
        ["local", m.docs_local_title()],
        ["cost", m.docs_cost_title()],
      ],
    ],
    [
      m.docs_group_help(),
      [
        ["privacy", m.docs_privacy_title()],
        ["help", m.docs_help_title()],
      ],
    ],
    [m.docs_group_develop(), [["develop", m.docs_develop_title()]]],
  ] as const;
  const families = [
    {
      id: "chromium",
      label: m.docs_tab_chromium(),
      mark: "Chrome",
      store: "Chrome Web Store",
      href: stores.chrome,
      platforms: m.platforms_chromium(),
    },
    {
      id: "firefox",
      label: "Firefox",
      mark: "Firefox",
      store: "Firefox Add-ons",
      href: stores.firefox,
      platforms: m.platforms_firefox(),
    },
    {
      id: "safari",
      label: "Safari",
      mark: "Safari",
      store: "App Store",
      href: stores.safari,
      platforms: m.platforms_safari(),
    },
  ] as const;
  const chromiums: Array<Browser> = [
    "Helium",
    "Chrome",
    "Edge",
    "Brave",
    "Arc",
    "Vivaldi",
    "Opera",
  ];
  const providers = [
    "Anthropic",
    "OpenAI",
    "Google Gemini",
    "OpenRouter",
    "Mistral",
    "DeepSeek",
    "Groq",
    "xAI",
    "Ollama",
    "LM Studio",
    m.docs_providers_compatible(),
  ];
  const ollama = `OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*,safari-web-extension://*" ollama serve`;
  const setup = `git clone https://github.com/firatciftci/dragoman.git
cd dragoman
pnpm install
pnpm dev:extension`;

  let agent = $state<ReturnType<typeof detect> | null>(null);
  let family = $state<Family>("chromium");
  let active = $state("install");
  let copied = $state<string | null>(null);
  let bar = $state<HTMLElement>();

  const offer = $derived.by(() => {
    if (agent == null) return null;
    const { name } = agent;
    if (name == null) return null;
    if (agent.family === "safari")
      return {
        detail:
          agent.isPhone && name !== "Safari"
            ? m.docs_detected_ios()
            : m.docs_detected_store({ browser: name }),
        href: stores.safari,
        label: m.get_on_app_store(),
        mark: "Safari" as Browser,
      };
    if (agent.family === "firefox")
      return {
        detail: m.docs_detected_store({ browser: name }),
        href: stores.firefox,
        label: m.add_to_firefox(),
        mark: "Firefox" as Browser,
      };
    if (agent.family === "chromium")
      return {
        detail: m.docs_detected_store({ browser: name }),
        href: stores.chrome,
        label: m.add_to_browser({ browser: name }),
        mark: name,
      };
    if (agent.isPhone)
      return {
        detail: m.docs_detected_android({ browser: name }),
        href: stores.firefox,
        label: m.add_to_firefox(),
        mark: "Firefox" as Browser,
      };
    return {
      detail: m.docs_detected_unsupported({ browser: name }),
      href: "#install",
      label: m.docs_choose(),
      mark: null,
    };
  });

  $effect(() => {
    const chip = bar?.querySelector<HTMLElement>(`[href="#${active}"]`);
    if (bar == null || chip == null) return;
    bar.scrollTo({
      left: chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  });

  onMount(() => {
    agent = detect();
    family = agent.family ?? (agent.isPhone ? "firefox" : "chromium");
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) active = entry.target.id;
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const section of document.querySelectorAll("article > section"))
      spy.observe(section);
    return () => spy.disconnect();
  });
</script>

<svelte:head>
  <title>{m.docs_title()} | dragoman</title>
</svelte:head>

{#snippet heading(id: string, title: string)}
  <h2
    class="group font-display text-[clamp(28px,3.4vw,36px)] leading-tight text-balance"
  >
    <a href="#{id}" class="decoration-gold decoration-2 underline-offset-8">
      {title}
      <span
        class="ms-1 align-middle text-[0.6em] text-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true">#</span
      >
    </a>
  </h2>
{/snippet}

{#snippet code(text: string)}
  <div class="mt-5 rounded-2xl bg-ink text-tile ring-1 ring-white/5" dir="ltr">
    <div class="flex justify-end px-2 pt-2">
      <button
        type="button"
        class="rounded-lg px-2.5 py-1 text-[13px] font-medium text-tile/70 transition-colors hover:bg-white/10 hover:text-tile"
        onclick={async () => {
          await navigator.clipboard.writeText(text);
          copied = text;
          setTimeout(() => {
            if (copied === text) copied = null;
          }, 1600);
        }}
      >
        <span aria-live="polite"
          >{copied === text ? m.docs_copied() : m.docs_copy()}</span
        >
      </button>
    </div>
    <pre
      class="px-5 pb-5 font-mono text-[14px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap"><code
        >{text}</code
      ></pre>
  </div>
{/snippet}

{#snippet steps(list: Array<string>)}
  <ol class="mt-5 grid gap-4">
    {#each list as step, index (step)}
      <li class="flex gap-4">
        <span
          class="grid size-8 shrink-0 place-items-center rounded-full bg-text font-display text-[16px] text-surface"
          >{index + 1}</span
        >
        <span class="pt-0.5">{step}</span>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet note(text: string)}
  <p
    class="mt-5 flex gap-3 rounded-2xl bg-sunk px-4 py-3.5 text-[15.5px] leading-relaxed"
  >
    <svg
      viewBox="0 0 20 20"
      class="mt-0.5 size-5 shrink-0 text-gold"
      aria-hidden="true"
    >
      <path
        d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z"
        fill="currentColor"
      />
    </svg>
    <span>{text}</span>
  </p>
{/snippet}

{#snippet release()}
  <a
    href={stores.releases}
    class="mt-6 inline-flex min-h-11 items-center gap-2.5 rounded-xl bg-text px-4 text-[15px] font-semibold text-surface transition-opacity hover:opacity-90"
  >
    <svg viewBox="0 0 20 20" class="size-5" aria-hidden="true">
      <path
        d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {m.docs_releases()}
  </a>
{/snippet}

<div class="relative overflow-hidden bg-cobalt text-tile">
  <svg
    class="absolute inset-x-0 bottom-0 h-6 w-full text-gold/30"
    aria-hidden="true"
  >
    <defs>
      <pattern
        id="docs-stars"
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
    <rect width="100%" height="100%" fill="url(#docs-stars)" />
  </svg>
  <div
    class="mx-auto grid max-w-6xl items-end gap-10 px-5 pt-32 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
  >
    <div>
      <h1 class="font-display text-[clamp(40px,6vw,76px)] leading-none">
        {m.docs_title()}
      </h1>
      <p class="mt-5 max-w-xl text-[18px] leading-relaxed text-tile/80">
        {m.docs_intro()}
      </p>
    </div>
    <div class="min-h-56">
      {#if agent != null}
        <div
          class="appear rounded-[28px] bg-raised p-6 text-text shadow-[0_30px_60px_-30px_rgb(10_15_40/0.8)]"
        >
          {#if agent.name != null && offer != null}
            <div class="flex items-center gap-3.5">
              <Emblem name={agent.name} class="size-11" />
              <p class="font-display text-[24px] leading-tight">
                {m.docs_detected({ browser: agent.name })}
              </p>
            </div>
            <p class="mt-3 text-[15.5px] leading-relaxed text-muted">
              {offer.detail}
            </p>
            <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href={offer.href}
                class="inline-flex min-h-12 items-center gap-2.5 rounded-xl border-b-4 border-[#8e2214] bg-coral px-5 text-[16px] font-semibold text-tile transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2"
              >
                {#if offer.mark != null}
                  <Emblem name={offer.mark} isPlain class="size-5" />
                {/if}
                {offer.label}
              </a>
              {#if offer.mark != null}
                <a
                  href="#install"
                  class="text-[15px] font-medium text-accent underline decoration-gold decoration-2 underline-offset-4 hover:decoration-accent"
                  >{m.docs_other_ways()}</a
                >
              {/if}
            </div>
          {:else}
            <div class="flex items-center gap-3.5">
              <svg
                viewBox="0 0 24 24"
                class="size-11 shrink-0 text-muted"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <path
                  d="M2 12h20M12 2c3 3.2 3 16.8 0 20M12 2c-3 3.2-3 16.8 0 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
              </svg>
              <p class="font-display text-[24px] leading-tight">
                {m.docs_detected_unknown()}
              </p>
            </div>
            <p class="mt-3 text-[15.5px] leading-relaxed text-muted">
              {m.docs_detected_unknown_detail()}
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              {#each families as option (option.id)}
                <a
                  href="#install"
                  class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sunk px-3.5 text-[15px] font-semibold transition-colors hover:bg-line"
                  onclick={() => (family = option.id)}
                >
                  <Emblem name={option.mark} class="size-5" />
                  {option.label}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<nav
  bind:this={bar}
  class="sticky top-0 z-20 flex [scrollbar-width:none] gap-1.5 overflow-x-auto border-b border-line bg-surface/85 px-5 py-2.5 backdrop-blur-md lg:hidden"
  aria-label={m.docs_on_page()}
>
  {#each groups as [, sections] (sections)}
    {#each sections as [id, title] (id)}
      <a
        href="#{id}"
        aria-current={active === id ? "true" : undefined}
        class={[
          "shrink-0 rounded-full px-3.5 py-1.5 text-[14.5px] font-medium whitespace-nowrap transition-colors",
          {
            "bg-text text-surface": active === id,
            "text-muted hover:bg-sunk hover:text-text": active !== id,
          },
        ]}>{title}</a
      >
    {/each}
  {/each}
</nav>

<div
  class="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-14 px-5 pt-12 pb-24 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:pt-16"
>
  <nav
    class="hidden lg:sticky lg:top-10 lg:block lg:self-start"
    aria-label={m.docs_on_page()}
  >
    {#each groups as [group, sections] (group)}
      <p class="mt-7 mb-2 ps-3 text-[13px] font-semibold text-muted first:mt-0">
        {group}
      </p>
      <ul class="grid gap-0.5 border-s border-line">
        {#each sections as [id, title] (id)}
          <li>
            <a
              href="#{id}"
              aria-current={active === id ? "true" : undefined}
              class={[
                "-ms-px block border-s-2 py-1.5 ps-3 text-[15px] transition-colors",
                {
                  "border-gold font-semibold text-text": active === id,
                  "border-transparent text-muted hover:text-text":
                    active !== id,
                },
              ]}>{title}</a
            >
          </li>
        {/each}
      </ul>
    {/each}
  </nav>

  <article class="max-w-[68ch] text-[17px] leading-[1.7]">
    <section id="install" class="scroll-mt-20 lg:scroll-mt-10">
      {@render heading("install", m.docs_install_title())}
      <p class="mt-4">{m.docs_install_stores()}</p>
      <div
        role="tablist"
        aria-label={m.docs_choose()}
        tabindex="-1"
        class="mt-9 grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1"
        onkeydown={(event: KeyboardEvent) => {
          const list = event.currentTarget as HTMLElement;
          const index = families.findIndex(({ id }) => id === family);
          const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
          if (step == null) return;
          event.preventDefault();
          const isRtl = getComputedStyle(list).direction === "rtl";
          const next =
            (index + (isRtl ? -step : step) + families.length) %
            families.length;
          family = families[next]?.id ?? family;
          list.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
        }}
      >
        {#each families as option (option.id)}
          {const isActive = $derived(option.id === family)}
          <button
            type="button"
            role="tab"
            id="family-{option.id}"
            aria-selected={isActive}
            aria-controls="panel-{option.id}"
            tabindex={isActive ? 0 : -1}
            class={[
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[14.5px] leading-tight font-semibold transition-[background-color,color,box-shadow] sm:flex-row sm:gap-2.5 sm:text-[15.5px]",
              {
                "bg-raised text-text shadow-[0_6px_16px_-10px_rgb(24_32_74/0.6)]":
                  isActive,
                "text-muted hover:text-text": !isActive,
              },
            ]}
            onclick={() => (family = option.id)}
          >
            <Emblem name={option.mark} class="size-5" />
            {option.label}
            {#if agent?.family === option.id}
              <span
                class="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-good px-2 py-px text-[11.5px] font-semibold whitespace-nowrap text-surface"
                >{m.docs_yours()}</span
              >
            {/if}
          </button>
        {/each}
      </div>

      {#each families as option (option.id)}
        <div
          role="tabpanel"
          id="panel-{option.id}"
          aria-labelledby="family-{option.id}"
          hidden={option.id !== family}
          class="pt-6"
        >
          <a
            href={option.href}
            class="group flex items-center gap-5 rounded-3xl bg-raised p-5 shadow-[inset_0_-4px_0_var(--line)] ring-1 ring-line transition-[translate] hover:-translate-y-0.5 sm:p-6"
          >
            <Emblem name={option.mark} class="size-12" />
            <span class="min-w-0 flex-1">
              <span class="block font-display text-[24px] leading-tight"
                >{option.store}</span
              >
              <span class="mt-0.5 block text-[15px] text-muted"
                >{option.platforms}</span
              >
            </span>
            <svg
              viewBox="0 0 20 20"
              class="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
              aria-hidden="true"
            >
              <path
                d="M7 4l6 6-6 6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>

          {#if option.id === "chromium"}
            <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span class="flex -space-x-1.5 rtl:space-x-reverse">
                {#each chromiums as name (name)}
                  <span
                    class="grid size-8 place-items-center rounded-full bg-raised ring-2 ring-surface"
                    title={name}
                  >
                    <Emblem {name} class="size-5" />
                  </span>
                {/each}
              </span>
              <span class="text-[15px] text-muted"
                >{m.docs_install_chromium()}</span
              >
            </div>
            {@render note(m.docs_install_edge())}
          {:else if option.id === "firefox"}
            <p class="mt-5">{m.docs_firefox_detail()}</p>
          {:else}
            <p class="mt-5">{m.docs_safari_detail()}</p>
            <h3 class="mt-8 text-[19px] font-semibold">
              {m.docs_safari_title()}
            </h3>
            <ul class="mt-4 grid gap-3">
              {#each [m.docs_safari_mac(), m.docs_safari_ios()] as line (line)}
                <li class="flex gap-3">
                  <svg
                    viewBox="0 0 20 20"
                    class="mt-1.5 size-4 shrink-0 text-good"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 10.5l4 4 8-9"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span>{line}</span>
                </li>
              {/each}
            </ul>
            <p class="mt-4">{m.docs_safari_allow()}</p>
          {/if}

          {#if option.id !== "safari"}
            <details
              class="group mt-6 rounded-3xl bg-raised px-5 ring-1 ring-line open:pb-6 sm:px-6"
            >
              <summary
                class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden"
              >
                {m.docs_manual_title()}
                <svg
                  viewBox="0 0 20 20"
                  class="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    d="M5 8l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </summary>
              <p class="text-[16px] text-muted">{m.docs_manual_detail()}</p>
              {@render steps(
                option.id === "chromium"
                  ? [
                      m.docs_install_unzip(),
                      m.docs_install_2(),
                      m.docs_install_3(),
                    ]
                  : [
                      m.docs_firefox_zip(),
                      m.docs_firefox_debugging(),
                      m.docs_firefox_select(),
                    ],
              )}
              {@render release()}
            </details>
          {/if}
        </div>
      {/each}

      <p class="mt-8">{m.docs_install_4()}</p>
      {@render note(m.chrome_android_note())}
    </section>

    <section id="first" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("first", m.docs_first_title())}
      <p class="mt-4">{m.docs_first_detail()}</p>
      <div
        class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-sunk px-5 py-4"
      >
        <span class="flex items-center gap-1.5" dir="ltr">
          {#each ["Alt", "Shift", "T"] as key (key)}
            <kbd
              class="min-w-9 rounded-lg bg-raised px-2 py-1 text-center font-sans text-[14px] font-semibold shadow-[inset_0_-2px_0_var(--line)] ring-1 ring-line"
              >{key}</kbd
            >
          {/each}
          <span class="mx-1.5 text-muted">/</span>
          {#each ["⌥", "⇧", "T"] as key (key)}
            <kbd
              class="min-w-9 rounded-lg bg-raised px-2 py-1 text-center font-sans text-[14px] font-semibold shadow-[inset_0_-2px_0_var(--line)] ring-1 ring-line"
              >{key}</kbd
            >
          {/each}
        </span>
        <span class="text-[15.5px] text-muted">{m.docs_shortcut()}</span>
      </div>

      <h3 class="mt-10 text-[19px] font-semibold">{m.docs_legend()}</h3>
      <dl class="mt-4 grid gap-3">
        <div class="rounded-2xl bg-raised p-5 ring-1 ring-line">
          <dt class="text-[13.5px] font-semibold text-muted">
            {m.site_step_draft()}
          </dt>
          <dd class="mt-1.5">
            <span
              class="underline decoration-gold decoration-dotted decoration-2 underline-offset-[5px]"
              >{m.demo_cat_more_draft()}</span
            >
          </dd>
        </div>
        <div class="rounded-2xl bg-raised p-5 ring-1 ring-line">
          <dt class="text-[13.5px] font-semibold text-muted">
            {m.site_step_refine()}
          </dt>
          <dd class="mt-1.5">{m.demo_cat_more_refined()}</dd>
        </div>
        <div class="rounded-2xl bg-raised p-5 ring-1 ring-line">
          <dt class="text-[13.5px] font-semibold text-muted">
            {m.site_step_hover()}
          </dt>
          <dd class="mt-1.5 text-muted">{m.site_step_hover_detail()}</dd>
        </div>
      </dl>
      <p class="mt-6">{m.docs_first_mobile()}</p>
    </section>

    <section id="model" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("model", m.docs_model_title())}
      <p class="mt-4">{m.docs_model_detail()}</p>
      <h3 class="mt-8 text-[15px] font-semibold text-muted">
        {m.docs_providers()}
      </h3>
      <ul class="mt-3 flex flex-wrap gap-2">
        {#each providers as provider (provider)}
          <li
            class="rounded-full bg-raised px-3.5 py-1.5 text-[15px] font-medium ring-1 ring-line"
          >
            {provider}
          </li>
        {/each}
      </ul>
      <p class="mt-6">{m.docs_model_openrouter()}</p>
      {@render note(m.docs_model_anthropic())}
    </section>

    <section id="local" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("local", m.docs_local_title())}
      <p class="mt-4">{m.docs_local_ollama()}</p>
      {@render code(ollama)}
      <p class="mt-6">{m.docs_local_lmstudio()}</p>
    </section>

    <section id="cost" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("cost", m.docs_cost_title())}
      <p class="mt-4">{m.docs_cost_detail()}</p>
    </section>

    <section id="privacy" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("privacy", m.docs_privacy_title())}
      <p class="mt-4">{m.docs_privacy_sent()}</p>
      <p class="mt-4">
        <a
          href={localizeHref("/privacy")}
          class="font-medium text-accent underline decoration-gold decoration-2 underline-offset-4 hover:decoration-accent"
          >{m.docs_privacy_more()}</a
        >
      </p>
    </section>

    <section id="help" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("help", m.docs_help_title())}
      <div class="mt-6 grid gap-2.5">
        {#each [[m.docs_help_blocked(), m.docs_help_blocked_detail()], [m.docs_help_engine(), m.docs_help_engine_detail()], [m.docs_help_local(), m.docs_help_local_detail()], [m.docs_help_access(), m.docs_help_access_detail()], [m.docs_help_consent(), m.docs_help_consent_detail()]] as [question, answer] (question)}
          <details
            class="group rounded-2xl bg-raised px-5 ring-1 ring-line open:pb-5"
          >
            <summary
              class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden"
            >
              {question}
              <svg
                viewBox="0 0 20 20"
                class="size-5 shrink-0 text-muted transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                <path
                  d="M10 4v12M4 10h12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </summary>
            <p class="text-[16px] text-muted">{answer}</p>
          </details>
        {/each}
      </div>
    </section>

    <section id="develop" class="mt-20 scroll-mt-20 lg:scroll-mt-10">
      {@render heading("develop", m.docs_develop_title())}
      <p class="mt-4">{m.docs_develop_detail()}</p>
      {@render code(setup)}
      <p class="mt-8">{m.docs_develop_browsers()}</p>
      <div
        class="mt-4 divide-y divide-line rounded-2xl bg-raised ring-1 ring-line"
      >
        {#each [{ mark: "Chrome", label: m.docs_tab_chromium(), command: "pnpm build", output: ".output/chrome-mv3", extra: "" }, { mark: "Firefox", label: "Firefox", command: "pnpm build:firefox", output: ".output/firefox-mv3", extra: "" }, { mark: "Safari", label: "Safari", command: "pnpm build:safari", output: ".output/safari-mv3", extra: m.docs_develop_safari() }] as const as row (row.command)}
          <div
            class="grid gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]"
          >
            <span class="flex items-center gap-2.5 font-semibold">
              <Emblem name={row.mark} class="size-5" />
              {row.label}
            </span>
            <span class="text-[15px]">
              <code
                class="rounded-md bg-sunk px-1.5 py-0.5 font-mono text-[14px]"
                dir="ltr">{row.command}</code
              >
              <span class="whitespace-nowrap text-muted" dir="ltr">
                → {row.output}</span
              >
              {#if row.extra !== ""}
                <span class="mt-1 block text-muted">{row.extra}</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
      <p class="mt-8">{m.docs_develop_layout()}</p>
      <dl class="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
        {#each [["extension/", m.docs_repo_extension()], ["site/", m.docs_repo_site()], ["brand/", m.docs_repo_brand()], ["messages/", m.docs_repo_messages()]] as [path, detail] (path)}
          <dt class="font-mono text-[15px] font-medium" dir="ltr">{path}</dt>
          <dd class="text-muted max-sm:mb-2">{detail}</dd>
        {/each}
      </dl>
      <div class="mt-8 flex flex-wrap gap-3">
        <a
          href="{stores.source}/blob/main/CONTRIBUTING.md"
          class="inline-flex min-h-11 items-center rounded-xl bg-text px-4 text-[15px] font-semibold text-surface transition-opacity hover:opacity-90"
          >{m.docs_develop_contribute()}</a
        >
        <a
          href={stores.source}
          class="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold ring-1 ring-line transition-colors hover:bg-sunk"
          >{m.docs_develop_source()}</a
        >
      </div>
    </section>
  </article>
</div>

<style>
  .appear {
    animation: appear 0.4s var(--ease-quill) both;
  }

  @keyframes appear {
    from {
      opacity: 0;
      translate: 0 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .appear {
      animation: none;
    }
  }
</style>
