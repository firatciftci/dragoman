<script lang="ts">
  import { m } from "#lib/messages.ts";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { stores } from "#lib/stores.ts";

  const sections = [
    ["install", m.docs_install_title()],
    ["first", m.docs_first_title()],
    ["model", m.docs_model_title()],
    ["local", m.docs_local_title()],
    ["cost", m.docs_cost_title()],
    ["privacy", m.docs_privacy_title()],
    ["help", m.docs_help_title()],
  ] as const;
</script>

<svelte:head>
  <title>{m.docs_title()} | dragoman</title>
</svelte:head>

<div class="bg-cobalt text-tile">
  <div class="mx-auto max-w-6xl px-5 pt-32 pb-16">
    <h1 class="font-display text-[clamp(36px,6vw,76px)] leading-none">
      {m.docs_title()}
    </h1>
    <p class="mt-4 max-w-xl text-[18px] text-tile/80">{m.docs_intro()}</p>
  </div>
</div>

<div
  class="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-12 px-5 py-16 lg:grid-cols-[220px_minmax(0,1fr)]"
>
  <nav class="lg:sticky lg:top-8 lg:self-start" aria-label={m.docs_title()}>
    <ul class="flex flex-wrap gap-2 text-[15px] lg:flex-col lg:gap-0.5">
      {#each sections as [id, title] (id)}
        <li>
          <a
            href="#{id}"
            class="block rounded-lg px-3 py-1.5 text-muted hover:bg-sunk hover:text-text"
            >{title}</a
          >
        </li>
      {/each}
    </ul>
  </nav>

  <article class="max-w-[68ch] text-[17px] leading-[1.7]">
    <section id="install" class="scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_install_title()}
      </h2>
      <p class="mt-4">{m.docs_install_stores()}</p>
      <ul class="mt-6 grid gap-3 sm:grid-cols-2">
        {#each [["Chrome Web Store", m.docs_install_chromium(), stores.chrome], ["Edge Add-ons", "Microsoft Edge", stores.edge], ["Firefox Add-ons", m.platforms_firefox(), stores.firefox], ["App Store", m.platforms_safari(), stores.safari]] as [name, detail, href] (name)}
          <li>
            <a
              {href}
              class="flex h-full flex-col rounded-3xl bg-raised p-5 shadow-[inset_0_-4px_0_var(--line)] transition-[translate] hover:-translate-y-0.5"
            >
              <span class="font-display text-[22px] leading-tight">{name}</span>
              <span class="mt-1 text-[15px] text-muted">{detail}</span>
            </a>
          </li>
        {/each}
      </ul>
      <p class="mt-6">{m.docs_install_4()}</p>
      <h3 class="mt-10 text-[19px] font-semibold">
        {m.docs_install_github_title()}
      </h3>
      <p class="mt-3">{m.docs_install_github()}</p>
      <ol class="mt-5 grid gap-4">
        {#each [m.docs_install_unzip(), m.docs_install_2(), m.docs_install_3()] as step, index (step)}
          <li class="flex gap-4">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-semibold text-tile"
              >{index + 1}</span
            >
            <span class="pt-0.5">{step}</span>
          </li>
        {/each}
      </ol>
      <a
        href={stores.releases}
        class="mt-8 inline-flex h-12 items-center gap-2.5 rounded-2xl border-b-[5px] border-[#8e2214] bg-coral px-5 text-[16px] font-semibold text-tile transition-[translate,border-width] active:translate-y-0.5 active:border-b-2"
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
      <p class="mt-6 text-[15px] text-muted">{m.chrome_android_note()}</p>
    </section>

    <section id="first" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_first_title()}
      </h2>
      <p class="mt-4">{m.docs_first_detail()}</p>
      <p class="mt-4">{m.docs_first_mobile()}</p>
    </section>

    <section id="model" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_model_title()}
      </h2>
      <p class="mt-4">{m.docs_model_detail()}</p>
      <p class="mt-4">{m.docs_model_openrouter()}</p>
      <p class="mt-4">{m.docs_model_anthropic()}</p>
    </section>

    <section id="local" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_local_title()}
      </h2>
      <p class="mt-4">{m.docs_local_ollama()}</p>
      <pre
        class="mt-4 rounded-2xl bg-ink p-5 font-mono text-[14px] [overflow-wrap:anywhere] whitespace-pre-wrap text-tile"
        dir="ltr"><code
          >OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*,safari-web-extension://*" ollama serve</code
        ></pre>
      <p class="mt-4">{m.docs_local_lmstudio()}</p>
    </section>

    <section id="cost" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_cost_title()}
      </h2>
      <p class="mt-4">{m.docs_cost_detail()}</p>
    </section>

    <section id="privacy" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_privacy_title()}
      </h2>
      <p class="mt-4">{m.docs_privacy_sent()}</p>
      <p class="mt-4">
        <a
          href={localizeHref("/privacy")}
          class="font-medium text-accent underline decoration-gold decoration-2 underline-offset-4 hover:decoration-accent"
          >{m.docs_privacy_more()}</a
        >
      </p>
    </section>

    <section id="help" class="mt-16 scroll-mt-8">
      <h2 class="font-display text-[34px] leading-tight">
        {m.docs_help_title()}
      </h2>
      <dl
        class="mt-6 divide-y divide-line rounded-3xl bg-raised px-6 shadow-[inset_0_-4px_0_var(--line)]"
      >
        {#each [[m.docs_help_blocked(), m.docs_help_blocked_detail()], [m.docs_help_engine(), m.docs_help_engine_detail()], [m.docs_help_local(), m.docs_help_local_detail()], [m.docs_help_access(), m.docs_help_access_detail()], [m.docs_help_consent(), m.docs_help_consent_detail()]] as [question, answer] (question)}
          <div class="py-5">
            <dt class="font-semibold">{question}</dt>
            <dd class="mt-1.5 text-muted">{answer}</dd>
          </div>
        {/each}
      </dl>
    </section>
  </article>
</div>
