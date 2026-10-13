<script lang="ts">
  import { locales as names } from "@dragoman/brand/locales";
  import Logo from "@dragoman/brand/logo.svelte";
  import Tooltip from "@dragoman/brand/tooltip.svelte";
  import { mergeProps, RadioGroup, Tabs, Tooltip as Tooltips } from "bits-ui";
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";
  import type { Languages } from "#lib/messages.ts";
  import type { Model, ProviderId } from "#lib/providers.ts";
  import type { Settings, Usage } from "#lib/settings.ts";
  import {
    languageName,
    normalizeLanguage,
    sendToExtension,
  } from "#lib/messages.ts";
  import { m } from "#lib/paraglide/messages.js";
  import { getLocale, locales } from "#lib/paraglide/runtime.js";
  import {
    connectOpenRouter,
    listModels,
    pickModel,
    providers,
  } from "#lib/providers.ts";
  import {
    characters,
    choices,
    exclusion,
    readSettings,
    settingsItem,
    usageItem,
  } from "#lib/settings.ts";
  import Select from "#lib/ui/select.svelte";
  import Switch from "#lib/ui/switch.svelte";

  let settings = $state<Settings | null>(null);
  let languages = $state<Languages | null>(null);
  let usage = $state<Usage>({});
  let tab = $state("model");
  let isKeyVisible = $state(false);
  let isConnecting = $state(false);
  let isWelcome = $state(false);
  let isForgotten = $state(false);
  let isMobile = $state(false);
  let hasAccess = $state(true);
  let isConsented = $state(true);
  let shortcut = $state("");
  let draft = $state("");
  let check = $state<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok"; models: Array<Model> }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const locale = getLocale();
  const ids = Object.keys(providers) as Array<ProviderId>;
  const isLocal = (id: ProviderId) => id === "ollama" || id === "lmstudio";
  const ready = $derived(
    new Set(
      settings == null
        ? []
        : choices(settings)
            .map((choice) => choice.provider)
            .filter(
              (id) => !(check.state === "error" && id === settings?.provider),
            ),
    ),
  );
  const candidate = $derived.by(() => {
    const text = draft.trim().toLowerCase();
    if (text === "" || settings == null) return null;
    try {
      const site = new URL(
        text.includes("://") ? text : `https://${text}`,
      ).hostname.replace(/^www\./, "");
      const rule = exclusion(site, settings.neverSites);
      return site.includes(".") && rule.site == null ? rule.choose(site) : null;
    } catch {
      return null;
    }
  });
  const numbers = new Intl.NumberFormat(locale);
  const dollars = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  });
  const month = new Date().toISOString().slice(0, 7);
  const scheme = new URL(browser.runtime.getURL("/")).protocol;
  const isFirefox = scheme === "moz-extension:";
  const isSafari = scheme === "safari-web-extension:";
  const consent = { data_collection: ["websiteContent"] } as Parameters<
    typeof browser.permissions.contains
  >[0];

  const provider = $derived(settings?.provider ?? "none");
  const recommended = $derived(
    provider === "none" || check.state !== "ok"
      ? ""
      : pickModel(provider, check.models),
  );
  const models = $derived(
    check.state === "ok"
      ? check.models.map((model) => ({
          value: model.id,
          label: model.name,
          detail: model.name === model.id ? undefined : model.id,
          badge: model.id === recommended ? m.recommended() : undefined,
        }))
      : [],
  );
  const targets = $derived(
    [...new Set([...Object.keys(names), ...(languages?.targets ?? [])])]
      .map((code) => ({
        value: code,
        label: languageName(code, locale),
        detail:
          (names as Record<string, string>)[code] ?? languageName(code, code),
        badge:
          languages == null || languages.targets.includes(code)
            ? undefined
            : m.ai_only(),
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label, locale)),
  );
  const sources = $derived(
    [
      ...new Map(
        targets.map((item) => {
          const code = normalizeLanguage(item.value);
          return [
            code,
            {
              value: code,
              label: languageName(code, locale),
              detail: languageName(code, code),
            },
          ];
        }),
      ).values(),
    ].toSorted((a, b) => a.label.localeCompare(b.label, locale)),
  );
  const interfaces = [
    { value: "auto", label: m.match_browser() },
    ...locales.map((code: (typeof locales)[number]) => ({
      value: code,
      label: names[code],
      detail: languageName(code, locale),
    })),
  ];
  const rows = $derived(
    Object.entries(usage).filter(([, entry]) => entry.month === month),
  );

  $effect(() => {
    if (settings != null) void settingsItem.setValue($state.snapshot(settings));
  });

  $effect(() => {
    if (!isFirefox || provider === "none" || isLocal(provider)) {
      isConsented = true;
      return;
    }
    void browser.permissions.contains(consent).then(
      (isGranted) => (isConsented = isGranted),
      () => (isConsented = true),
    );
  });

  $effect(() => {
    if (settings == null || settings.provider === "none") {
      check = { state: "idle" };
      return;
    }
    const id = settings.provider;
    const active = {
      provider: id,
      key: settings.keys[id] ?? "",
      model: "",
      baseUrl: settings.baseUrls[id] ?? providers[id].baseUrl,
      workspace: settings.anthropicWorkspaceId,
    };
    if (
      (providers[id].keyPattern != null && active.key === "") ||
      active.baseUrl === ""
    ) {
      check = { state: "idle" };
      return;
    }
    let isStale = false;
    check = { state: "checking" };
    const timer = setTimeout(() => {
      void listModels(active).then(
        (list) => {
          if (isStale || settings == null) return;
          check = { state: "ok", models: list };
        },
        (error: unknown) => {
          const text = error instanceof Error ? error.message : String(error);
          if (!isStale)
            check = {
              state: "error",
              message:
                /"message":\s*"((?:[^"\\]|\\.)*)"/.exec(text)?.[1] ?? text,
            };
        },
      );
    }, 450);
    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  });

  onMount(() => {
    isWelcome = location.hash === "#welcome";
    void (async () => {
      const [platform, isGranted] = await Promise.all([
        browser.runtime.getPlatformInfo(),
        browser.permissions.contains({ origins: ["*://*/*"] }),
      ]);
      isMobile = ["android", "ios"].includes(String(platform.os));
      const commands =
        Reflect.has(browser, "commands") && !isMobile
          ? await browser.commands.getAll()
          : [];
      hasAccess = isGranted;
      const keys =
        commands.find((command) => command.name === "toggle-translation")
          ?.shortcut ?? "";
      shortcut = navigator.userAgent.includes("Mac")
        ? keys
            .replace(/(?:Alt|Option)\+/, "⌥")
            .replace(/(?:MacCtrl|Ctrl)\+/, "⌃")
            .replace(/(?:Command|Cmd)\+/, "⌘")
            .replace("Shift+", "⇧")
        : keys;
    })();
    void (async () => {
      settings = await readSettings();
      usage = await usageItem.getValue();
      const response = await sendToExtension({
        to: "background",
        type: "languages",
      });
      if (response.ok) languages = response.value;
    })();
    return usageItem.watch((next) => (usage = next));
  });
</script>

{#snippet step(index: number, title: string, isDone: boolean)}
  <h3 class="flex items-center gap-3 text-[15px] font-semibold">
    <span
      class="grid size-7 shrink-0 place-items-center rounded-full border-2 text-[13px] transition-colors"
      class:border-turquoise={isDone}
      class:bg-turquoise={isDone}
      class:text-tile={isDone}
      class:border-line={!isDone}
      class:text-muted={!isDone}
    >
      {#if isDone}
        <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
          <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        {index}
      {/if}
    </span>
    {title}
  </h3>
{/snippet}

{#snippet field(
  label: string,
  value: string,
  onchange: (next: string) => void,
  { type = "text", placeholder = "" } = {},
)}
  <label class="mt-3 block">
    <span class="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
    <input
      {type}
      {value}
      {placeholder}
      spellcheck="false"
      autocomplete="off"
      class="h-11 w-full rounded-xl border border-line bg-raised px-3.5 font-mono text-[14px] shadow-[inset_0_-2px_0_var(--line)] outline-none placeholder:font-sans placeholder:text-muted focus:border-accent"
      oninput={(event) => onchange(event.currentTarget.value.trim())}
    />
  </label>
{/snippet}

{#snippet chip(label: string, onremove: () => void)}
  <li
    class="flex h-9 items-center gap-1 rounded-full border border-line bg-surface ps-3.5 pe-1 text-[14px]"
  >
    {label}
    <Tooltip text={m.remove_item({ item: label })} side="top">
      {#snippet children({ props })}
        <button
          {...mergeProps(props, { onclick: onremove })}
          type="button"
          aria-label={m.remove_item({ item: label })}
          class="grid size-7 cursor-pointer place-items-center rounded-full text-muted hover:bg-sunk hover:text-text"
        >
          <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
            <path
              d="m4.5 4.5 7 7m0-7-7 7"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      {/snippet}
    </Tooltip>
  </li>
{/snippet}

{#snippet picks()}
  {#if settings != null && provider !== "none"}
    {const id = $derived<ProviderId>(provider)}
    {const main = $derived<string>(settings.models[id] ?? "")}
    {const chosen = $derived<Array<string>>(
      [...new Set([main, ...(settings.shortlist[id] ?? [])])].filter(
        (model) => model !== "",
      ),
    )}
    {#if chosen.length > 0}
      <ul class="mb-3 flex flex-wrap gap-2">
        {#each chosen as model (model)}
          {@render chip(
            models.find((item) => item.value === model)?.label ?? model,
            () => {
              if (settings == null) return;
              const rest = chosen.filter((other) => other !== model);
              settings.shortlist[id] = rest;
              if (model === main) settings.models[id] = rest[0] ?? "";
            },
          )}
        {/each}
      </ul>
    {/if}
    {#key chosen.length}
      <Select
        items={models.filter((item) => !chosen.includes(item.value))}
        bind:value={
          () => "",
          (next: string) => {
            if (settings == null || next === "") return;
            settings.shortlist[id] = [...chosen, next];
            if (main === "") settings.models[id] = next;
          }
        }
        label={m.step_model()}
        placeholder={m.add_model()}
      />
    {/key}
    <p class="mt-2 text-[13px] text-muted">{m.models_detail()}</p>
  {/if}
{/snippet}

{#snippet status()}
  <p
    class="mt-2.5 flex min-h-5 items-center gap-2 text-[13px]"
    aria-live="polite"
  >
    {#if check.state === "checking"}
      <span
        class="size-3.5 animate-spin rounded-full border-2 border-line border-t-accent"
      ></span>
      <span class="text-muted">{m.key_checking()}</span>
    {:else if check.state === "ok" && provider !== "none"}
      <span class="size-2 rounded-full bg-good"></span>
      <span class="text-good">
        {isLocal(provider)
          ? m.server_ok({ count: check.models.length })
          : m.key_ok({ count: check.models.length })}
      </span>
    {:else if check.state === "error" && provider !== "none"}
      <span class="size-2 shrink-0 rounded-full bg-bad"></span>
      <span class="text-bad">
        {isLocal(provider) || provider === "custom"
          ? m.server_unreachable({
              address:
                settings?.baseUrls[provider] ?? providers[provider].baseUrl,
              message: check.message,
            })
          : m.key_rejected({
              provider: providers[provider].name,
              message: check.message,
            })}
      </span>
    {/if}
  </p>
{/snippet}

<Tooltips.Provider delayDuration={400}>
  <div class="min-h-dvh bg-surface pb-24">
    <header class="relative overflow-hidden bg-cobalt text-tile">
      <svg class="absolute inset-0 size-full opacity-[0.12]" aria-hidden="true">
        <defs>
          <pattern
            id="girih"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M22 3 27 17 41 22 27 27 22 41 17 27 3 22 17 17Z"
              fill="none"
              stroke="#f6f5ef"
              stroke-width="1.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih)" />
      </svg>
      <div
        class="relative mx-auto flex max-w-3xl items-end justify-between px-6 max-sm:flex-col max-sm:items-start max-sm:pt-8 sm:h-56"
      >
        <div class="self-center max-sm:self-start">
          <h1 class="font-brand text-[56px] leading-none max-sm:text-[44px]">
            dragoman
          </h1>
          <p class="mt-3 max-w-xs text-[14px] text-tile/80">{m.settings()}</p>
        </div>
        <div class="flex items-end max-sm:mt-4 max-sm:self-center">
          {#each characters as character, index (character)}
            {const isChosen = $derived(settings?.character === character)}
            <img
              src="/characters/{character}.png"
              alt=""
              class="-ms-8 transition-[width,transform] duration-500 ease-quill first:ms-0 max-sm:-ms-6"
              class:w-44={isChosen}
              class:w-32={!isChosen}
              class:max-sm:w-24={isChosen}
              class:max-sm:w-16={!isChosen}
              style:z-index={isChosen ? 10 : index}
            />
          {/each}
        </div>
      </div>
    </header>

    {#if isWelcome}
      <section class="mx-auto mt-6 max-w-3xl px-6">
        <div
          class="rounded-2xl border border-line bg-raised p-6 shadow-[0_18px_30px_-20px_rgb(15_22_54/0.6)]"
        >
          <h2 class="font-display text-[32px] leading-tight text-accent">
            {m.welcome_title()}
          </h2>
          {const steps = $derived(
            [
              isMobile
                ? m.welcome_open_mobile()
                : isSafari
                  ? null
                  : isFirefox
                    ? m.welcome_pin_firefox()
                    : m.welcome_pin(),
              hasAccess
                ? null
                : isSafari
                  ? m.welcome_access_safari()
                  : m.welcome_access(),
              shortcut === ""
                ? m.welcome_translate_touch()
                : m.welcome_translate({ keys: shortcut }),
              m.welcome_ai(),
            ].filter((text) => text != null),
          )}
          <ol class="mt-4 grid gap-3 text-[15px] leading-relaxed">
            {#each steps as text, index (index)}
              <li class="flex gap-3">
                <span
                  class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold/25 text-[13px] font-semibold"
                  >{index + 1}</span
                >
                <span>
                  {text}
                  {#if text === m.welcome_access()}
                    <button
                      type="button"
                      class="mt-2 block h-10 cursor-pointer rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-accent shadow-[inset_0_-3px_0_var(--line)] hover:border-muted"
                      onclick={async () => {
                        hasAccess = await browser.permissions.request({
                          origins: ["<all_urls>"],
                        });
                      }}
                    >
                      {m.allow_access()}
                    </button>
                  {/if}
                </span>
              </li>
            {/each}
          </ol>
          <button
            type="button"
            class="mt-5 h-11 cursor-pointer rounded-xl border-b-4 border-[#8e2214] bg-coral px-5 text-[15px] font-semibold text-tile transition-[transform,border-width] active:translate-y-0.5 active:border-b-2"
            onclick={() => {
              isWelcome = false;
              history.replaceState(null, "", location.pathname);
            }}
          >
            {m.welcome_dismiss()}
          </button>
        </div>
      </section>
    {/if}

    {#if settings != null}
      <Tabs.Root bind:value={tab} class="mx-auto max-w-3xl px-6">
        <Tabs.List
          class="mt-6 flex gap-1 rounded-2xl border border-line bg-raised p-1.5 shadow-[0_18px_30px_-20px_rgb(15_22_54/0.6)] max-sm:grid max-sm:grid-cols-2"
        >
          {#each [["model", m.tab_model()], ["languages", m.tab_languages()], ["appearance", m.tab_appearance()], ["usage", m.tab_usage()]] as const as [value, label] (value)}
            <Tabs.Trigger
              {value}
              class="h-10 flex-1 shrink-0 cursor-pointer rounded-xl border picked border-transparent px-3 text-[14px] font-medium whitespace-nowrap text-muted transition-[background-color,border-color,color,box-shadow] data-[state=active]:font-semibold data-[state=inactive]:hover:bg-sunk/70 data-[state=inactive]:hover:text-text"
            >
              {label}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>

        <Tabs.Content value="model" class="pt-8">
          <p class="max-w-prose text-[15px] leading-relaxed text-muted">
            {m.model_overview()}
          </p>

          <RadioGroup.Root
            bind:value={
              () => settings?.provider ?? "none",
              (next) => {
                if (settings == null) return;
                settings.provider = next as ProviderId | "none";
                if (
                  isFirefox &&
                  next !== "none" &&
                  !isLocal(next as ProviderId)
                )
                  void browser.permissions
                    .request(consent)
                    .then((isGranted) => (isConsented = isGranted))
                    .catch(() => {});
              }
            }
            class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {#each ["none", ...ids] as const as id (id)}
              {const isReady = $derived(id !== "none" && ready.has(id))}
              <RadioGroup.Item
                value={id}
                class={[
                  "flex h-14 cursor-pointer items-center gap-2.5 rounded-xl border picked bg-raised px-3 text-start text-[14px] font-medium transition-[background-color,border-color,box-shadow]",
                  {
                    "border-good/55 bg-good/[0.07] shadow-[inset_0_-3px_0_color-mix(in_oklab,var(--good)_45%,transparent)] data-[state=unchecked]:hover:border-good":
                      isReady,
                    "border-line shadow-[inset_0_-3px_0_var(--line)] data-[state=unchecked]:hover:border-muted":
                      !isReady,
                  },
                ]}
              >
                {#if id === "none"}
                  <svg
                    viewBox="0 0 24 24"
                    class="size-[22px] shrink-0 text-turquoise"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="12"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                    <path
                      d="M8 21h8M12 17v4"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                  <span class="truncate">{m.provider_none()}</span>
                {:else}
                  <Logo {id} name={providers[id].name} />
                  <span class="min-w-0 flex-1 truncate"
                    >{providers[id].name}</span
                  >
                  {#if isReady}
                    <span
                      class="grid size-[18px] shrink-0 place-items-center rounded-full bg-good text-raised"
                      role="img"
                      aria-label={m.provider_ready()}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        class="size-3"
                        aria-hidden="true"
                      >
                        <path
                          d="m3.5 8.5 3 3 6-7"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  {/if}
                {/if}
              </RadioGroup.Item>
            {/each}
          </RadioGroup.Root>

          {#if !isConsented}
            <div
              class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gold bg-gold/15 p-4 text-[14px]"
            >
              <p class="min-w-0 flex-1 basis-60">
                {m.data_consent_send({
                  provider: provider === "none" ? "" : providers[provider].name,
                })}
              </p>
              <button
                type="button"
                class="h-10 shrink-0 cursor-pointer rounded-xl border-b-4 border-[#8e2214] bg-coral px-4 text-[14px] font-semibold text-tile transition-[transform,border-width] active:translate-y-0.5 active:border-b-2"
                onclick={async () => {
                  isConsented = await browser.permissions.request(consent);
                }}
              >
                {m.data_consent_allow()}
              </button>
            </div>
          {/if}
          <section class="mt-6 rounded-2xl border border-line bg-raised p-6">
            {#if provider === "none"}
              <p class="text-[15px]">{m.provider_none_info()}</p>
            {:else if isLocal(provider) || provider === "custom"}
              <p class="text-[14px] text-muted">
                {provider === "custom"
                  ? m.custom_detail()
                  : m.local_server_origin_detail({
                      provider: providers[provider].name,
                      origin: `${scheme}//*`,
                    })}
              </p>
              {@render field(
                m.server_address(),
                settings.baseUrls[provider] ?? providers[provider].baseUrl,
                (next) => {
                  if (settings != null) settings.baseUrls[provider] = next;
                },
                { placeholder: "https://example.com/v1" },
              )}
              {#if provider === "custom"}
                {@render field(
                  m.step_paste_key(),
                  settings.keys[provider] ?? "",
                  (next) => {
                    if (settings != null) settings.keys[provider] = next;
                  },
                  { type: "password", placeholder: m.key_placeholder() },
                )}
              {/if}
              {@render status()}
              <div class="mt-4">
                {#if check.state === "ok"}
                  <p class="mb-1.5 text-[13px] font-medium text-muted">
                    {m.step_model()}
                  </p>
                  {@render picks()}
                {:else if provider === "custom"}
                  {@render field(
                    m.model_id(),
                    settings.models[provider] ?? "",
                    (next) => {
                      if (settings != null) settings.models[provider] = next;
                    },
                  )}
                {/if}
              </div>
            {:else}
              {const key = $derived(settings.keys[provider] ?? "") as string}
              <ol class="grid gap-7">
                <li>
                  {@render step(1, m.step_get_key(), key !== "")}
                  <div class="ms-10 mt-3 flex flex-wrap items-center gap-3">
                    {#if provider === "openrouter"}
                      <button
                        type="button"
                        disabled={isConnecting}
                        class="h-11 cursor-pointer rounded-xl border-b-4 border-[#8e2214] bg-coral px-4 text-[14px] font-semibold text-tile transition-[transform,border-width] active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
                        onclick={async () => {
                          isConnecting = true;
                          try {
                            const next = await connectOpenRouter();
                            if (settings != null)
                              settings.keys.openrouter = next;
                          } catch (error) {
                            check = {
                              state: "error",
                              message:
                                error instanceof Error
                                  ? error.message
                                  : String(error),
                            };
                          } finally {
                            isConnecting = false;
                          }
                        }}
                      >
                        {m.connect_openrouter()}
                      </button>
                      <p class="basis-full text-[13px] text-muted">
                        {m.openrouter_detail()}
                      </p>
                    {/if}
                    <a
                      href={providers[provider].keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14px] font-medium shadow-[inset_0_-3px_0_var(--line)] hover:border-muted"
                    >
                      <Logo
                        id={provider}
                        name={providers[provider].name}
                        size={18}
                      />
                      {provider === "openrouter"
                        ? m.or_paste_key()
                        : m.open_key_page({
                            provider: providers[provider].name,
                          })}
                      <svg
                        viewBox="0 0 16 16"
                        class="size-3.5 text-muted rtl:-scale-x-100"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 3h7v7M13 3 4 12"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </a>
                  </div>
                </li>
                <li>
                  {@render step(2, m.step_paste_key(), check.state === "ok")}
                  <div class="ms-10">
                    <div class="relative mt-3">
                      <input
                        type={isKeyVisible ? "text" : "password"}
                        value={key}
                        placeholder={m.key_placeholder()}
                        aria-label={m.step_paste_key()}
                        spellcheck="false"
                        autocomplete="off"
                        class="h-11 w-full rounded-xl border border-line bg-surface ps-3.5 pe-24 font-mono text-[14px] shadow-[inset_0_-2px_0_var(--line)] outline-none placeholder:font-sans placeholder:text-muted focus:border-accent"
                        oninput={(event) => {
                          if (settings != null)
                            settings.keys[provider] =
                              event.currentTarget.value.trim();
                        }}
                      />
                      <button
                        type="button"
                        class="absolute inset-y-1.5 end-1.5 cursor-pointer rounded-lg px-2.5 text-[13px] font-medium text-accent hover:bg-sunk"
                        onclick={() => (isKeyVisible = !isKeyVisible)}
                      >
                        {isKeyVisible ? m.hide_key() : m.show_key()}
                      </button>
                    </div>
                    {@render status()}
                    {#if provider === "anthropic"}
                      {@render field(
                        m.workspace_id(),
                        settings.anthropicWorkspaceId,
                        (next) => {
                          if (settings != null)
                            settings.anthropicWorkspaceId = next;
                        },
                        { placeholder: "wrkspc_…" },
                      )}
                      <p class="mt-1.5 text-[13px] text-muted">
                        {m.workspace_detail()}
                      </p>
                    {/if}
                  </div>
                </li>
                <li>
                  {@render step(
                    3,
                    m.step_model(),
                    check.state === "ok" &&
                      (settings.models[provider] ?? "") !== "",
                  )}
                  <div
                    class="ms-10 mt-3"
                    class:opacity-50={check.state !== "ok"}
                    class:pointer-events-none={check.state !== "ok"}
                  >
                    {@render picks()}
                  </div>
                </li>
              </ol>
              {#if key !== ""}
                <button
                  type="button"
                  class="mt-7 cursor-pointer text-[13px] font-medium text-bad hover:underline"
                  onclick={() => {
                    if (settings == null) return;
                    settings.keys[provider] = "";
                    settings.models[provider] = "";
                    settings.shortlist[provider] = [];
                  }}
                >
                  {m.remove_key()}
                </button>
              {/if}
            {/if}
          </section>
          {#if provider !== "none"}
            <section
              class="mt-6 rounded-2xl border border-line bg-raised px-6 py-2"
            >
              <Switch
                bind:checked={settings.draftLocally}
                label={m.draft_locally()}
                detail={m.draft_locally_info()}
              />
            </section>
          {/if}
        </Tabs.Content>

        <Tabs.Content value="languages" class="grid gap-6 pt-8">
          <section class="rounded-2xl border border-line bg-raised p-6">
            <p class="mb-1.5 text-[15px] font-semibold">
              {m.target_language()}
            </p>
            <p class="mb-3 text-[13px] text-muted">{m.target_detail()}</p>
            <Select
              items={targets}
              bind:value={settings.targetLanguage}
              label={m.target_language()}
            />
            <div class="mt-4 divide-y divide-line border-t border-line">
              <Switch
                bind:checked={settings.showOriginalOnHover}
                label={m.show_original_hover()}
              />
              <Switch
                bind:checked={settings.wholePage}
                label={m.whole_page()}
                detail={m.whole_page_detail()}
              />
            </div>
          </section>
          <section class="rounded-2xl border border-line bg-raised p-6">
            <p class="text-[15px] font-semibold">{m.auto_title()}</p>
            <p class="mt-1 mb-4 text-[13px] text-muted">{m.auto_detail()}</p>
            {#if settings.alwaysLanguages.length === 0}
              <p class="mb-3 text-[13px] text-muted">{m.auto_empty()}</p>
            {:else}
              <ul class="mb-3 flex flex-wrap gap-2">
                {#each settings.alwaysLanguages as code (code)}
                  {@render chip(languageName(code, locale), () => {
                    if (settings != null)
                      settings.alwaysLanguages =
                        settings.alwaysLanguages.filter(
                          (other) => other !== code,
                        );
                  })}
                {/each}
              </ul>
            {/if}
            {#key settings.alwaysLanguages.length}
              <Select
                items={sources.filter(
                  (item) =>
                    !settings?.alwaysLanguages
                      .map((code) => normalizeLanguage(code))
                      .includes(item.value),
                )}
                bind:value={
                  () => "",
                  (next: string) => {
                    if (settings != null && next !== "")
                      settings.alwaysLanguages = [
                        ...settings.alwaysLanguages,
                        next,
                      ];
                  }
                }
                label={m.auto_add()}
                placeholder={m.auto_add()}
              />
            {/key}
          </section>
          <section
            class="rounded-2xl border border-line bg-raised px-6 pt-2 pb-6"
          >
            <Switch
              bind:checked={settings.offerTranslation}
              label={m.offer_setting()}
              detail={m.offer_setting_detail()}
            />
            <div
              class="mt-2 border-t border-line pt-5 transition-opacity"
              class:opacity-50={!settings.offerTranslation}
            >
              <p class="text-[15px] font-semibold">{m.known_title()}</p>
              <p class="mt-1 mb-4 text-[13px] text-muted">{m.known_detail()}</p>
              {#if settings.knownLanguages.length === 0}
                <p class="mb-3 text-[13px] text-muted">{m.known_empty()}</p>
              {:else}
                <ul class="mb-3 flex flex-wrap gap-2">
                  {#each settings.knownLanguages as code (code)}
                    {@render chip(languageName(code, locale), () => {
                      if (settings != null)
                        settings.knownLanguages =
                          settings.knownLanguages.filter(
                            (other) => other !== code,
                          );
                    })}
                  {/each}
                </ul>
              {/if}
              {#key settings.knownLanguages.length}
                <Select
                  items={sources.filter(
                    (item) =>
                      !settings?.knownLanguages
                        .map((code) => normalizeLanguage(code))
                        .includes(item.value),
                  )}
                  bind:value={
                    () => "",
                    (next: string) => {
                      if (settings != null && next !== "")
                        settings.knownLanguages = [
                          ...settings.knownLanguages,
                          next,
                        ];
                    }
                  }
                  label={m.known_title()}
                  placeholder={m.auto_add()}
                />
              {/key}
            </div>
          </section>
          <section class="rounded-2xl border border-line bg-raised px-6 py-2">
            <Switch
              bind:checked={settings.quietBrowser}
              label={m.quiet_browser()}
              detail={m.quiet_browser_detail()}
            />
          </section>
          <section class="rounded-2xl border border-line bg-raised p-6">
            <p class="text-[15px] font-semibold">{m.never_title()}</p>
            <p class="mt-1 mb-4 text-[13px] text-muted">{m.never_detail()}</p>
            {#if settings.neverSites.length === 0}
              <p class="mb-3 text-[13px] text-muted">{m.never_empty()}</p>
            {:else}
              <ul class="mb-3 flex flex-wrap gap-2" dir="ltr">
                {#each settings.neverSites as site (site)}
                  {@render chip(site, () => {
                    if (settings != null)
                      settings.neverSites = settings.neverSites.filter(
                        (other) => other !== site,
                      );
                  })}
                {/each}
              </ul>
            {/if}
            <form
              class="flex gap-2"
              onsubmit={(event) => {
                event.preventDefault();
                if (settings == null || candidate == null) return;
                settings.neverSites = candidate;
                draft = "";
              }}
            >
              <input
                bind:value={draft}
                type="text"
                inputmode="url"
                dir="ltr"
                placeholder={m.never_placeholder()}
                aria-label={m.never_add()}
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[14px] shadow-[inset_0_-2px_0_var(--line)] outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="submit"
                disabled={candidate == null}
                class="h-11 shrink-0 cursor-pointer rounded-xl border border-line bg-surface px-4 text-[14px] font-medium text-accent shadow-[inset_0_-2px_0_var(--line)] hover:border-muted disabled:cursor-default disabled:text-muted disabled:opacity-60 disabled:hover:border-line"
              >
                {m.never_add()}
              </button>
            </form>
          </section>
          <section class="rounded-2xl border border-line bg-raised p-6">
            <p class="mb-3 text-[15px] font-semibold">
              {m.interface_language()}
            </p>
            <Select
              items={interfaces}
              bind:value={
                () => settings?.interfaceLanguage ?? "auto",
                (next: string) => {
                  if (settings == null) return;
                  settings.interfaceLanguage = next;
                  void settingsItem
                    .setValue($state.snapshot(settings))
                    .then(() => location.reload());
                }
              }
              label={m.interface_language()}
            />
          </section>
        </Tabs.Content>

        <Tabs.Content value="appearance" class="grid gap-6 pt-8">
          <section class="rounded-2xl border border-line bg-raised p-6">
            <p class="text-[15px] font-semibold">{m.character()}</p>
            <p class="mt-1 text-[13px] text-muted">{m.character_detail()}</p>
            <RadioGroup.Root
              bind:value={
                () => settings?.character ?? "grand",
                (next) =>
                  settings != null &&
                  (settings.character = next as Settings["character"])
              }
              class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {#each characters as character (character)}
                <RadioGroup.Item
                  value={character}
                  class="group flex cursor-pointer flex-col justify-start overflow-hidden rounded-2xl border picked border-line bg-surface text-start shadow-[inset_0_-3px_0_var(--line)] transition-[background-color,border-color,box-shadow] data-[state=unchecked]:hover:border-muted"
                >
                  <div
                    class="grid h-36 w-full shrink-0 place-items-end justify-center bg-sunk"
                  >
                    <img
                      src="/characters/{character}.png"
                      alt=""
                      class="w-32 transition-transform duration-300 ease-quill group-hover:-translate-y-1 group-data-[state=checked]:-translate-y-1.5"
                    />
                  </div>
                  <div class="p-3">
                    <p class="text-[14px] font-semibold">
                      {{
                        grand: m.character_grand,
                        envoy: m.character_envoy,
                        apprentice: m.character_apprentice,
                        scholar: m.character_scholar,
                        kira: m.character_kira,
                        calligrapher: m.character_calligrapher,
                      }[character]()}
                    </p>
                    <p class="mt-1 text-[12px] leading-snug text-muted">
                      {{
                        grand: m.character_grand_detail,
                        envoy: m.character_envoy_detail,
                        apprentice: m.character_apprentice_detail,
                        scholar: m.character_scholar_detail,
                        kira: m.character_kira_detail,
                        calligrapher: m.character_calligrapher_detail,
                      }[character]()}
                    </p>
                  </div>
                </RadioGroup.Item>
              {/each}
            </RadioGroup.Root>
          </section>
          <section
            class="divide-y divide-line rounded-2xl border border-line bg-raised px-6 py-2"
          >
            <Switch
              bind:checked={settings.companion}
              label={m.companion()}
              detail={m.companion_detail()}
            />
            <Switch bind:checked={settings.showBadge} label={m.show_badge()} />
            <Switch
              bind:checked={settings.showCost}
              label={m.show_cost()}
              detail={m.show_cost_detail()}
            />
            <Switch
              bind:checked={settings.animate}
              label={m.animate()}
              detail={m.animate_detail()}
            />
          </section>
        </Tabs.Content>

        <Tabs.Content value="usage" class="pt-8">
          <p class="text-[15px] text-muted">{m.usage_intro()}</p>
          {#if rows.length === 0}
            <p
              class="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-[14px] text-muted"
            >
              {m.usage_none()}
            </p>
          {:else}
            <div
              class="mt-6 overflow-x-auto rounded-2xl border border-line bg-raised"
            >
              <table class="w-full text-[14px]">
                <thead
                  class="border-b border-line text-start text-[13px] text-muted"
                >
                  <tr>
                    <th class="px-4 py-3 text-start font-medium"
                      >{m.usage_model()}</th
                    >
                    <th class="px-4 py-3 text-end font-medium"
                      >{m.usage_input()}</th
                    >
                    <th class="px-4 py-3 text-end font-medium"
                      >{m.usage_output()}</th
                    >
                    <th class="px-4 py-3 text-end font-medium"
                      >{m.usage_cost()}</th
                    >
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  {#each rows as [name, entry] (name)}
                    {const id = $derived(name.split("/", 1)[0] ?? "")}
                    <tr>
                      <td class="px-4 py-3">
                        <span class="flex items-center gap-2.5">
                          <Logo
                            {id}
                            name={id in providers
                              ? providers[id as ProviderId].name
                              : id}
                            size={18}
                          />
                          <span class="font-mono text-[13px]"
                            >{name.slice(id.length + 1)}</span
                          >
                        </span>
                      </td>
                      <td class="px-4 py-3 text-end tabular-nums"
                        >{numbers.format(entry.inputTokens)}</td
                      >
                      <td class="px-4 py-3 text-end tabular-nums"
                        >{numbers.format(entry.outputTokens)}</td
                      >
                      <td
                        class="px-4 py-3 text-end tabular-nums"
                        class:text-muted={entry.cost == null}
                      >
                        {entry.cost == null
                          ? m.usage_unknown()
                          : dollars.format(entry.cost)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          <section
            class="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border border-line bg-raised p-6"
          >
            <div class="max-w-md">
              <p class="text-[15px] font-semibold">{m.saved_translations()}</p>
              <p class="mt-1 text-[13px] text-muted">
                {m.saved_translations_detail()}
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-medium shadow-[inset_0_-2px_0_var(--line)] transition-colors hover:border-muted disabled:cursor-default disabled:text-muted disabled:hover:border-line"
              disabled={isForgotten}
              onclick={async () => {
                const response = await sendToExtension({
                  to: "background",
                  type: "forget",
                });
                isForgotten = response.ok;
              }}
            >
              {isForgotten
                ? m.saved_translations_cleared()
                : m.saved_translations_clear()}
            </button>
          </section>
        </Tabs.Content>
      </Tabs.Root>
    {/if}
  </div>
</Tooltips.Provider>
