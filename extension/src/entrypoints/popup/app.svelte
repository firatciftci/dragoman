<script lang="ts">
  import Logo from "@dragoman/brand/logo.svelte";
  import Tooltip from "@dragoman/brand/tooltip.svelte";
  import { mergeProps, Select, Tooltip as Tooltips } from "bits-ui";
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";
  import type { ContentMessage, Languages, Status } from "#lib/messages.ts";
  import type { ProviderId } from "#lib/providers.ts";
  import type { Settings } from "#lib/settings.ts";
  import {
    languageKey,
    languageName,
    sendToExtension,
    sourceName,
  } from "#lib/messages.ts";
  import { m } from "#lib/paraglide/messages.js";
  import { getLocale } from "#lib/paraglide/runtime.js";
  import { providers } from "#lib/providers.ts";
  import {
    choices,
    connection,
    hiddenItem,
    pick,
    readSettings,
    settingsItem,
  } from "#lib/settings.ts";
  import Combobox from "#lib/ui/select.svelte";
  import Switch from "#lib/ui/switch.svelte";

  let status = $state<Status | null>(null);
  let isUnreachable = $state(false);
  let isBlocked = $state(false);
  let isWebPage = $state(false);
  let shortcut = $state("");
  let hotkey = $state("");
  let languages = $state<Languages | null>(null);
  let settings = $state<Settings | null>(null);
  let target = $state("en");
  let isHidden = $state(false);
  let tabId: number | null = null;

  const locale = getLocale();
  const isActive = $derived(
    status?.state === "translating" || status?.state === "translated",
  );
  const active = $derived(settings == null ? null : connection(settings));
  const chosen = $derived(
    settings == null ? null : connection({ ...settings, deviceOnly: false }),
  );
  const options = $derived(
    settings == null
      ? []
      : choices(settings).map(({ provider, model }) => ({
          value: `${provider}/${model}`,
          label: model,
          provider,
        })),
  );
  const isForeign = $derived(
    status?.source != null &&
      status.source !== "und" &&
      languageKey(status.source) !== languageKey(target),
  );
  const mode = $derived(
    active == null
      ? "device"
      : settings?.draftLocally === false
        ? "cloud"
        : "hybrid",
  );
  const items = $derived(
    (languages?.targets ?? [target])
      .map((code) => ({
        value: code,
        label: languageName(code, locale),
        detail: languageName(code, code),
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label, locale)),
  );
  const drafted = $derived(
    status == null || status.blocks === 0 ? 0 : status.drafted / status.blocks,
  );
  const refined = $derived(
    status == null || status.blocks === 0 ? 0 : status.refined / status.blocks,
  );

  async function send(message: ContentMessage) {
    if (tabId == null) return;
    let response: Status | undefined;
    try {
      response = await browser.tabs.sendMessage(tabId, message);
    } catch {}
    isUnreachable = response == null;
    if (response != null) {
      status = response;
      return;
    }
    isBlocked = !(await browser.permissions.contains({ origins: ["*://*/*"] }));
  }

  async function save(next: Partial<Settings>) {
    const plain = $state.snapshot(next);
    if (settings != null) Object.assign(settings, next);
    await settingsItem.setValue({
      ...(await settingsItem.getValue()),
      ...plain,
    });
  }

  async function apply(next: Partial<Settings>) {
    await save(next);
    if (isActive) await send({ to: "content", type: "translate", target });
  }

  onMount(() => {
    void hiddenItem.getValue().then((value) => (isHidden = value));
    const unwatch = hiddenItem.watch((value) => (isHidden = value));
    void (async () => {
      settings = await readSettings();
      target = settings.targetLanguage;
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      tabId = tab?.id ?? null;
      isWebPage = /^https?:/.test(tab?.url ?? "");
      await send({ to: "content", type: "status" });
      if (status?.target != null) target = status.target;
      const platform = await browser.runtime.getPlatformInfo();
      const commands =
        Reflect.has(browser, "commands") &&
        !["android", "ios"].includes(String(platform.os))
          ? await browser.commands.getAll()
          : [];
      const keys =
        commands.find((command) => command.name === "toggle-translation")
          ?.shortcut ?? "";
      hotkey = keys
        .replace(/MacCtrl|Ctrl/, "Control")
        .replace("Command", "Meta");
      shortcut = navigator.userAgent.includes("Mac")
        ? keys
            .replace(/(?:Alt|Option)\+/, "⌥")
            .replace(/(?:MacCtrl|Ctrl)\+/, "⌃")
            .replace(/(?:Command|Cmd)\+/, "⌘")
            .replace("Shift+", "⇧")
        : keys;
      const response = await sendToExtension({
        to: "background",
        type: "languages",
      });
      if (response.ok) languages = response.value;
    })();
    const timer = setInterval(
      () => void send({ to: "content", type: "status" }),
      500,
    );
    return () => {
      clearInterval(timer);
      unwatch();
    };
  });
</script>

<Tooltips.Provider delayDuration={400}>
  <main
    class="flex max-h-[600px] w-[360px] flex-col overflow-hidden pointer-coarse:max-h-none pointer-coarse:w-full"
  >
    <header class="relative h-20 shrink-0 bg-cobalt text-tile">
      <svg class="absolute inset-0 size-full opacity-[0.14]" aria-hidden="true">
        <defs>
          <pattern
            id="girih"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M18 2 22 14 34 18 22 22 18 34 14 22 2 18 14 14Z"
              fill="none"
              stroke="#f6f5ef"
              stroke-width="1.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih)" />
      </svg>
      <img
        src="/characters/{settings?.character ?? 'grand'}.png"
        alt=""
        class="absolute start-3 bottom-0 size-[84px]"
      />
      <div class="absolute start-[108px] end-11 top-3">
        <p class="font-brand text-[30px] leading-none">dragoman</p>
        <p class="mt-2 truncate text-[13px] text-tile/80">
          {status?.source == null || status.source === "und"
            ? m.page_language_unknown()
            : m.page_in({ language: sourceName(status.source) })}
        </p>
      </div>
      <Tooltip text={m.settings()}>
        {#snippet children({ props })}
          <button
            {...mergeProps(props, {
              onclick: () => void browser.runtime.openOptionsPage(),
            })}
            type="button"
            aria-label={m.settings()}
            class="absolute end-2 top-2 grid size-8 cursor-pointer place-items-center rounded-lg text-tile/80 hover:bg-tile/10 hover:text-tile"
          >
            <svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
              <path
                d="M10 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm6.9 4.4-1.6-.4a5.6 5.6 0 0 1-.6 1.4l.9 1.4-1.4 1.4-1.4-.9a5.6 5.6 0 0 1-1.4.6l-.4 1.6h-2l-.4-1.6a5.6 5.6 0 0 1-1.4-.6l-1.4.9-1.4-1.4.9-1.4a5.6 5.6 0 0 1-.6-1.4l-1.6-.4v-2l1.6-.4a5.6 5.6 0 0 1 .6-1.4l-.9-1.4 1.4-1.4 1.4.9a5.6 5.6 0 0 1 1.4-.6l.4-1.6h2l.4 1.6c.5.1 1 .3 1.4.6l1.4-.9 1.4 1.4-.9 1.4c.3.4.5.9.6 1.4l1.6.4v2Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/snippet}
      </Tooltip>
    </header>

    {#if isHidden}
      <div
        class="flex items-center gap-2.5 border-b border-line bg-sunk px-4 py-2.5 text-[13px]"
      >
        <svg
          viewBox="0 0 16 16"
          class="size-4 shrink-0 text-muted"
          aria-hidden="true"
        >
          <path
            d="M2.2 8s2.2-4 5.8-4 5.8 4 5.8 4-2.2 4-5.8 4-5.8-4-5.8-4Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
          <circle cx="8" cy="8" r="1.9" fill="currentColor" />
          <path
            d="m2.5 13.5 11-11"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <span class="min-w-0 flex-1 text-muted">{m.hidden_session()}</span>
        <button
          type="button"
          class="shrink-0 cursor-pointer font-medium text-accent hover:underline"
          onclick={() => void hiddenItem.setValue(false)}
        >
          {m.show_again()}
        </button>
      </div>
    {/if}

    <div class="min-h-0 overflow-y-auto overscroll-none px-4 pt-4 pb-4">
      {#if isUnreachable && isBlocked}
        <p class="rounded-xl bg-sunk p-3.5 text-sm text-muted">
          {m.access_needed()}
        </p>
        <button
          type="button"
          class="mt-3 h-12 w-full cursor-pointer rounded-xl border-b-4 border-[#8e2214] bg-coral text-[16px] font-semibold text-tile transition-[transform,border-width] active:translate-y-0.5 active:border-b-2"
          onclick={async () => {
            if (
              (await browser.permissions.request({
                origins: ["<all_urls>"],
              })) &&
              tabId != null
            ) {
              await browser.tabs.reload(tabId);
              window.close();
            }
          }}
        >
          {m.allow_access()}
        </button>
      {:else if isUnreachable && isWebPage}
        <p class="rounded-xl bg-sunk p-3.5 text-sm text-muted">
          {m.reload_needed()}
        </p>
        <button
          type="button"
          class="mt-3 h-12 w-full cursor-pointer rounded-xl border-b-4 border-[#8e2214] bg-coral text-[16px] font-semibold text-tile transition-[transform,border-width] active:translate-y-0.5 active:border-b-2"
          onclick={async () => {
            if (tabId != null) await browser.tabs.reload(tabId);
            window.close();
          }}
        >
          {m.reload_page()}
        </button>
      {:else if isUnreachable}
        <p class="rounded-xl bg-sunk p-3.5 text-sm text-muted">
          {m.unavailable_page()}
        </p>
      {:else}
        <p class="mb-1 text-[13px] font-medium text-muted">
          {m.translate_into()}
        </p>
        <Combobox
          {items}
          bind:value={
            () => target,
            (next: string) => {
              target = next;
              void apply({ targetLanguage: next });
            }
          }
          label={m.translate_into()}
          isInline
        />

        <button
          type="button"
          aria-keyshortcuts={hotkey === "" ? undefined : hotkey}
          class="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border-b-4 text-[16px] font-semibold transition-[transform,border-width] active:translate-y-0.5 active:border-b-2"
          class:bg-coral={!isActive}
          class:border-[#8e2214]={!isActive}
          class:text-tile={!isActive}
          class:bg-sunk={isActive}
          class:border-line={isActive}
          class:text-text={isActive}
          onclick={async () =>
            send(
              isActive
                ? { to: "content", type: "restore" }
                : { to: "content", type: "translate", target },
            )}
        >
          {isActive ? m.show_original() : m.translate_page()}
          {#if shortcut !== ""}
            <kbd
              class={[
                "rounded-md px-1.5 py-0.5 font-sans text-[12px] font-medium tracking-wide opacity-75",
                { "bg-tile/15": !isActive, "bg-line": isActive },
              ]}
              aria-hidden="true">{shortcut}</kbd
            >
          {/if}
        </button>

        {#if isActive && status != null}
          <div class="mt-3">
            <div
              class="relative h-2 overflow-hidden rounded-full bg-sunk"
              aria-hidden="true"
            >
              <div
                class="absolute inset-y-0 start-0 rounded-full transition-[width] duration-500"
                class:bg-gold={mode === "hybrid"}
                class:bg-turquoise={mode !== "hybrid"}
                style:width="{drafted * 100}%"
              ></div>
              {#if mode === "hybrid"}
                <div
                  class="absolute inset-y-0 start-0 rounded-full bg-turquoise transition-[width] duration-500"
                  style:width="{refined * 100}%"
                ></div>
              {/if}
            </div>
            <p class="mt-2 flex items-center gap-2 text-[13px] text-muted">
              <span
                class="size-2 shrink-0 rounded-full"
                class:bg-gold={mode === "hybrid"}
                class:bg-turquoise={mode !== "hybrid"}
              ></span>
              {#if mode === "device"}
                {m.translated_device({
                  done: status.drafted,
                  total: status.blocks,
                })}
              {:else if mode === "cloud"}
                {m.translated_by({
                  done: status.drafted,
                  total: status.blocks,
                  model: active?.model ?? "",
                })}
              {:else}
                {m.drafted({ done: status.drafted, total: status.blocks })}
              {/if}
            </p>
            {#if mode === "hybrid"}
              <p class="mt-1 flex items-center gap-2 text-[13px] text-muted">
                <span class="size-2 shrink-0 rounded-full bg-turquoise"></span>
                {m.refined({
                  done: status.refined,
                  total: status.blocks,
                  model: active?.model ?? "",
                })}
              </p>
            {/if}
            {#if !status.isWholePage && status.drafted < status.blocks}
              <p class="mt-1 ps-4 text-[13px] text-muted">
                {status.isFollowing ? m.scroll_note() : m.scroll_paused()}
              </p>
            {/if}
            {#if settings?.showCost === true && status.tokens > 0}
              {const tokens = $derived(
                new Intl.NumberFormat(locale).format(status.tokens),
              )}
              <p class="mt-1 ps-4 text-[13px] text-muted tabular-nums">
                {status.cost == null
                  ? m.page_cost_unknown({ tokens })
                  : m.page_cost({
                      tokens,
                      cost: new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: status.cost < 0.01 ? 4 : 2,
                      }).format(status.cost),
                    })}
              </p>
            {/if}
          </div>
        {/if}

        {#if settings != null}
          <div class="mt-3 divide-y divide-line border-t border-line">
            {#if options.length === 0}
              <div class="flex items-center gap-2.5 py-3">
                <svg
                  viewBox="0 0 24 24"
                  class="size-[18px] shrink-0 text-turquoise"
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
                <span class="flex-1 text-[15px] text-text"
                  >{m.provider_none()}</span
                >
                <button
                  type="button"
                  class="shrink-0 cursor-pointer text-[14px] font-medium text-accent hover:underline"
                  onclick={() => void browser.runtime.openOptionsPage()}
                >
                  {m.add_model()}
                </button>
              </div>
            {:else}
              {const current = $derived(
                chosen == null ? "" : `${chosen.provider}/${chosen.model}`,
              )}
              <div class="flex items-center gap-3 py-3">
                <span class="flex-1 text-[15px] text-text"
                  >{m.translate_with()}</span
                >
                <Select.Root
                  type="single"
                  items={options}
                  value={current}
                  onValueChange={(value: string) => {
                    if (settings == null) return;
                    const index = value.indexOf("/");
                    void apply(
                      pick(
                        settings,
                        value.slice(0, index) as ProviderId,
                        value.slice(index + 1),
                      ),
                    );
                  }}
                >
                  <Select.Trigger
                    aria-label={m.translate_with()}
                    class={[
                      "flex h-9 max-w-[196px] min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-line bg-raised ps-2 pe-1.5 text-[13px] text-text shadow-[inset_0_-2px_0_var(--line)] outline-none hover:border-muted focus-visible:border-accent data-[state=open]:border-accent",
                      { "opacity-60": settings.deviceOnly },
                    ]}
                  >
                    {#if chosen != null}
                      <Logo
                        id={chosen.provider}
                        name={providers[chosen.provider].name}
                        size={16}
                      />
                      <span class="min-w-0 truncate">{chosen.model}</span>
                    {/if}
                    <svg
                      viewBox="0 0 16 16"
                      class="size-3.5 shrink-0 text-muted"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 6 8 10.5 12.5 6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      side="bottom"
                      align="end"
                      sideOffset={6}
                      collisionPadding={8}
                      class="z-50 max-h-(--bits-select-content-available-height) w-[min(300px,calc(100vw-16px))] overflow-y-auto rounded-xl border border-line bg-raised p-1.5 text-text shadow-[0_22px_40px_-18px_rgb(15_22_54/0.5)] outline-none"
                    >
                      {#each options as choice (choice.value)}
                        <Select.Item
                          value={choice.value}
                          label={choice.label}
                          class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] data-highlighted:bg-sunk"
                        >
                          {#snippet children({
                            selected,
                          }: {
                            selected: boolean;
                          })}
                            <Logo
                              id={choice.provider}
                              name={providers[choice.provider].name}
                              size={16}
                            />
                            <span class="min-w-0 flex-1 truncate"
                              >{choice.label}</span
                            >
                            <svg
                              viewBox="0 0 16 16"
                              class={[
                                "size-4 shrink-0 text-turquoise",
                                { invisible: !selected },
                              ]}
                              aria-hidden="true"
                            >
                              <path
                                d="m3.5 8.5 3 3 6-7"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                            </svg>
                          {/snippet}
                        </Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            {/if}
            {#if options.length > 0}
              <Switch
                bind:checked={
                  () => settings?.deviceOnly ?? false,
                  (isOn: boolean) => void apply({ deviceOnly: isOn })
                }
                label={m.on_device_only()}
              />
            {/if}
            {#if isForeign && status?.source != null}
              {const language = $derived(status.source)}
              {const host = $derived(status.host)}
              {const always = $derived(settings.alwaysLanguages)}
              {const never = $derived(settings.neverSites)}
              {const isAlways = $derived(
                always
                  .map((code) => languageKey(code))
                  .includes(languageKey(language)),
              )}
              <Switch
                bind:checked={
                  () => isAlways,
                  (isOn: boolean) =>
                    void save({
                      alwaysLanguages: isOn
                        ? [...always, language]
                        : always.filter(
                            (code) =>
                              languageKey(code) !== languageKey(language),
                          ),
                    }).then(async () => {
                      if (isOn && !isActive && !never.includes(host))
                        await send({
                          to: "content",
                          type: "translate",
                          target,
                        });
                    })
                }
                label={m.always_translate({ language: sourceName(language) })}
              />
              {#if isAlways && host !== ""}
                <Switch
                  bind:checked={
                    () => never.includes(host),
                    (isOn: boolean) =>
                      void save({
                        neverSites: isOn
                          ? [...never, host]
                          : never.filter((site) => site !== host),
                      })
                  }
                  label={m.except_site({ site: host })}
                />
              {/if}
            {/if}
          </div>
        {/if}

        {#if status?.error != null}
          <p class="mt-3 rounded-xl bg-coral/10 p-3 text-[13px] text-bad">
            {#if status.error.code === "same-language"}
              {m.error_same_language({
                language: languageName(status.error.detail, locale),
              })}
            {:else if status.error.code === "no-engine"}
              {m.error_no_engine()}
            {:else if status.error.code === "failed"}
              {m.error_generic({ message: status.error.detail })}
            {:else}
              {m[`error_${status.error.code}`]({
                provider: status.error.detail,
              })}
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  </main>
</Tooltips.Provider>
