<svelte:options css="injected" />

<script lang="ts">
  import { languageName, sourceName } from "#lib/messages.ts";
  import { exclusion } from "#lib/settings.ts";
  import Picker from "./picker.svelte";
  import { actions, hint, m, view } from "./view.svelte.ts";

  let { onclose }: { onclose: () => void } = $props();

  const language = $derived(
    view.source == null || view.source === "und" ? "" : sourceName(view.source),
  );
  const destination = $derived(languageName(view.target, view.locale));
  const numbers = $derived(new Intl.NumberFormat(view.locale));
  const share = (count: number) =>
    view.total === 0 ? 0 : (count / view.total) * 100;
  const id = $props.id();
  const current = $derived(
    view.choices.find((choice) => choice.value === view.choice)?.model ??
      view.model,
  );
  const rule = $derived(exclusion(view.host, view.neverSites));
  let picked = $state<string | null>(null);
  const scope = $derived(
    rule.site ??
      (picked != null && rule.scopes.includes(picked)
        ? picked
        : rule.scopes[0]),
  );
</script>

{#snippet controls()}
  {#if view.choices.length > 0 || view.host !== ""}
    <div class="controls">
      {#if view.choices.length > 1}
        <div class="row">
          <span class="label" id="{id}-with">{m.translate_with()}</span>
          <Picker
            items={view.choices}
            value={view.choice}
            labelledby="{id}-with"
            isDim={view.isDeviceOnly}
            onpick={actions.pick}
          />
        </div>
      {/if}
      {#if view.choices.length > 0}
        <button
          type="button"
          role="switch"
          class="row"
          aria-checked={view.isDeviceOnly}
          onclick={() => actions.deviceOnly(!view.isDeviceOnly)}
        >
          <span class="label">
            {m.on_device_only()}
            <small>{m.on_device_only_detail({ model: current })}</small>
          </span>
          <span class="track"></span>
        </button>
      {/if}
      {#if view.host !== ""}
        <div class="row site">
          <span class="label">
            <span id="{id}-site">{m.never_site()}</span>
            {#if rule.scopes.length === 1}
              <small dir="ltr">{scope}</small>
            {/if}
          </span>
          <button
            type="button"
            role="switch"
            class="toggle"
            aria-checked={rule.site != null}
            aria-labelledby="{id}-site"
            onclick={() =>
              actions.exclude(rule.choose(rule.site == null ? scope : null))}
          >
            <span class="track"></span>
          </button>
          {#if rule.scopes.length > 1}
            <span class="scopes" role="radiogroup" aria-labelledby="{id}-site">
              {#each rule.scopes as option, index (option)}
                <button
                  type="button"
                  role="radio"
                  class="scope"
                  aria-checked={option === scope}
                  onclick={() => {
                    picked = option;
                    if (rule.site != null && option !== rule.site)
                      actions.exclude(rule.choose(option));
                  }}
                >
                  {index === 0 ? option : m.site_whole({ site: option })}
                </button>
              {/each}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/snippet}

<div class="panel">
  <button
    type="button"
    class="close hide"
    aria-label={m.hide_session()}
    {@attach hint(() => m.hide_session())}
    onclick={() => actions.hide(true)}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true">
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
  </button>
  {#if view.phase === "offer"}
    <button
      type="button"
      class="close"
      aria-label={m.offer_close()}
      {@attach hint(() => m.offer_close())}
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
    <p class="title">{m.offer_title({ language })}</p>
    <button type="button" class="primary" onclick={actions.translate}>
      {m.offer_translate({ language: destination })}
    </button>
    {@render controls()}
    {#if !view.isAlwaysTranslated}
      <button type="button" class="link" onclick={actions.always}>
        {m.always_translate({ language })}
      </button>
    {/if}
    <button type="button" class="link" onclick={actions.known}>
      {m.offer_known({ language })}
    </button>
  {:else}
    <button
      type="button"
      class="close"
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
    <p class="title route">
      {#if language !== ""}
        <span>{language}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3 8h9m-3.5-4 4 4-4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
      <span>{destination}</span>
    </p>
    {const parts = $derived(
      (view.mode === "device"
        ? m.engine_device()
        : view.mode === "cloud"
          ? m.engine_cloud({ model: "\u{0}" })
          : m.engine_hybrid({ model: "\u{0}" })
      ).split("\u{0}"),
    )}
    <p class="engine">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {#if view.mode === "device"}
          <path
            d="M3 3.5h10v7H3zM6 13h4M8 10.5V13"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        {:else}
          <path
            d="M8 1.8 9.4 6.6 14.2 8 9.4 9.4 8 14.2 6.6 9.4 1.8 8 6.6 6.6Z"
            fill="currentColor"
          />
        {/if}
      </svg>
      <span
        >{parts[0]}{#if parts.length > 1}<strong>{view.model}</strong
          >{parts[1]}{/if}</span
      >
    </p>

    {#if view.phase === "active"}
      <div class="bar" aria-hidden="true">
        {#if view.mode === "hybrid"}
          <span class="gold" style:width="{share(view.translated)}%"></span>
          <span class="turquoise" style:width="{share(view.refined)}%"></span>
        {:else}
          <span class="turquoise" style:width="{share(view.translated)}%"
          ></span>
        {/if}
      </div>
      {#if view.mode === "hybrid"}
        <p class="line">
          <i class="dot gold"></i>
          {m.drafted({ done: view.translated, total: view.total })}
        </p>
        <p class="line">
          <i class="dot turquoise"></i>
          {m.refined({
            done: view.refined,
            total: view.total,
            model: view.model,
          })}
        </p>
      {:else}
        <p class="line">
          <i class="dot turquoise"></i>
          {view.mode === "device"
            ? m.translated_device({ done: view.translated, total: view.total })
            : m.translated_by({
                done: view.translated,
                total: view.total,
                model: view.model,
              })}
        </p>
      {/if}
      <dl class="stats">
        <div>
          <dt>{m.stat_words()}</dt>
          <dd>{numbers.format(view.words)}</dd>
        </div>
        <div>
          {#if view.mode === "device"}
            <dt>{m.stat_private()}</dt>
            <dd>{m.stat_nothing()}</dd>
          {:else}
            <dt>{m.stat_cost()}</dt>
            <dd>
              {view.cost == null
                ? m.cost_tokens({ tokens: numbers.format(view.tokens) })
                : new Intl.NumberFormat(view.locale, {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits:
                      view.cost > 0 && view.cost < 0.01 ? 4 : 2,
                  }).format(view.cost)}
            </dd>
          {/if}
        </div>
      </dl>
      {#if !view.isWholePage && view.translated < view.total}
        <p class="note">
          {view.isFollowing ? m.scroll_note() : m.scroll_paused()}
          <button type="button" class="inline" onclick={actions.translateAll}>
            {m.translate_all()}
          </button>
        </p>
      {/if}
    {/if}

    {#if view.error != null}
      <p class="error">
        {#if view.error.code === "same-language"}
          {m.error_same_language({
            language: languageName(view.error.detail, view.locale),
          })}
        {:else if view.error.code === "no-engine"}
          {m.error_no_engine()}
        {:else if view.error.code === "failed"}
          {m.error_generic({ message: view.error.detail })}
        {:else}
          {m[`error_${view.error.code}`]({ provider: view.error.detail })}
        {/if}
      </p>
    {/if}

    {@render controls()}

    <button
      type="button"
      class={view.phase === "paused" ? "primary" : "secondary"}
      onclick={view.phase === "paused" ? actions.translate : actions.restore}
    >
      {view.phase === "paused" ? m.show_translation() : m.show_original()}
    </button>
    <button type="button" class="link settings" onclick={actions.openSettings}>
      {m.settings()}
    </button>
  {/if}
</div>

<style>
  .panel {
    position: relative;
    box-sizing: border-box;
    width: 300px;
    max-width: 100%;
    padding: 15px 16px 8px;
    font:
      14px/1.45 system-ui,
      sans-serif;
  }
  :global(.sheet) .panel {
    width: auto;
    padding: 4px 20px 8px;
  }
  :global(.sheet) .close {
    top: 0;
  }
  button {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid #e0ac3e;
    outline-offset: 2px;
  }
  .title {
    margin: 0 0 12px;
    margin-inline-end: 60px;
    font-weight: 600;
  }
  .route {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 15px;
  }
  .route svg {
    width: 15px;
    height: 15px;
    color: #2347a8;
  }
  :global([dir="rtl"]) .route svg {
    scale: -1 1;
  }
  .engine {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 8px 0 14px;
    padding-block: 9px;
    padding-inline: 9px 12px;
    border-radius: 12px;
    background: rgb(30 156 148 / 0.1);
    font-size: 12.5px;
    line-height: 1.45;
  }
  .engine svg {
    flex: none;
    box-sizing: border-box;
    width: 22px;
    height: 22px;
    padding: 5px;
    margin-block: -1px;
    border-radius: 50%;
    background: rgb(30 156 148 / 0.16);
    color: #167a73;
  }
  .engine span {
    min-width: 0;
    padding-top: 1px;
  }
  .engine strong {
    display: inline-block;
    max-width: 100%;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .bar {
    position: relative;
    height: 7px;
    overflow: hidden;
    border-radius: 99px;
    background: rgb(24 32 74 / 0.09);
  }
  .bar span {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: 99px;
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .gold {
    background: #e0ac3e;
  }
  .turquoise {
    background: #1e9c94;
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-inline-end: 4px;
    border-radius: 50%;
    vertical-align: 1px;
  }
  .line {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: #5d6385;
    font-variant-numeric: tabular-nums;
  }
  .bar + .line {
    margin-top: 9px;
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 12px 0 0;
  }
  .stats div {
    padding: 8px 10px;
    border-radius: 10px;
    background: rgb(24 32 74 / 0.05);
  }
  dt {
    font-size: 11.5px;
    color: #5d6385;
  }
  dd {
    margin: 1px 0 0;
    font-size: 16px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .note {
    margin: 12px 0 0;
    font-size: 12.5px;
    color: #5d6385;
  }
  .inline {
    display: inline;
    font-weight: 600;
    color: #2347a8;
  }
  .inline:hover,
  .link:hover {
    text-decoration: underline;
  }
  .error {
    margin: 12px 0 0;
    padding: 9px 11px;
    border-radius: 10px;
    background: rgb(200 50 31 / 0.1);
    color: #a3281a;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .primary,
  .secondary {
    display: block;
    width: 100%;
    margin-top: 14px;
    padding: 10px 12px;
    border-radius: 10px;
    text-align: center;
    font-weight: 600;
  }
  .title + .primary {
    margin-top: 0;
  }
  .primary {
    background: #c8321f;
    color: #f6f5ef;
    box-shadow: inset 0 -3px 0 #8e2214;
  }
  .primary:active {
    translate: 0 1px;
    box-shadow: inset 0 -1px 0 #8e2214;
  }
  .secondary {
    background: rgb(24 32 74 / 0.06);
    box-shadow: inset 0 -3px 0 rgb(24 32 74 / 0.12);
  }
  .secondary:active {
    translate: 0 1px;
  }
  .link {
    display: block;
    width: 100%;
    padding: 8px 2px;
    font-size: 13px;
    font-weight: 500;
    color: #2347a8;
  }
  .primary + .link {
    margin-top: 6px;
  }
  .link + .link {
    border-top: 1px solid #e3ddcd;
  }
  .settings {
    margin-top: 4px;
    text-align: center;
  }
  .controls {
    margin-top: 12px;
    border-block: 1px solid #e3ddcd;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 0;
    font-size: 13.5px;
  }
  .row + .row {
    border-top: 1px solid #e3ddcd;
  }
  .label {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: #5d6385;
    overflow-wrap: anywhere;
  }
  .track {
    position: relative;
    flex: none;
    width: 40px;
    height: 24px;
    border-radius: 99px;
    background: rgb(24 32 74 / 0.12);
    box-shadow: inset 0 2px 3px rgb(15 22 54 / 0.18);
    transition: background-color 0.2s;
  }
  .track::after {
    content: "";
    position: absolute;
    top: 2px;
    inset-inline-start: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fffdf8;
    box-shadow: 0 2px 0 rgb(15 22 54 / 0.25);
    transition: translate 0.2s cubic-bezier(0.65, 0, 0.2, 1);
  }
  [aria-checked="true"] .track {
    background: #1e9c94;
  }
  [aria-checked="true"] .track::after {
    translate: 16px 0;
  }
  :global([dir="rtl"]) [aria-checked="true"] .track::after {
    translate: -16px 0;
  }
  .site {
    flex-wrap: wrap;
    row-gap: 7px;
  }
  .scopes {
    display: flex;
    flex-basis: 100%;
    flex-wrap: wrap;
    gap: 5px;
  }
  .scope {
    max-width: 100%;
    padding: 3px 9px;
    border-radius: 99px;
    box-shadow: inset 0 0 0 1px #e3ddcd;
    font-size: 12px;
    color: #5d6385;
    overflow-wrap: anywhere;
    direction: ltr;
    unicode-bidi: isolate;
    transition:
      background-color 0.15s,
      color 0.15s,
      box-shadow 0.15s;
  }
  .scope:hover {
    color: #18204a;
  }
  .scope[aria-checked="true"] {
    background: rgb(30 156 148 / 0.12);
    box-shadow: inset 0 0 0 1px rgb(30 156 148 / 0.55);
    color: #167a73;
    font-weight: 600;
  }
  .toggle {
    display: flex;
    flex: none;
    border-radius: 99px;
  }
  .close {
    position: absolute;
    top: 8px;
    inset-inline-end: 8px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: #5d6385;
  }
  .hide {
    inset-inline-end: 38px;
  }
  .close svg {
    width: 16px;
    height: 16px;
  }
  .close:hover {
    background: rgb(24 32 74 / 0.07);
    color: #18204a;
  }
  @media (prefers-color-scheme: dark) {
    .route svg,
    .inline,
    .link {
      color: #9db4f5;
    }
    .line,
    .note,
    dt,
    .close {
      color: #a3a9c8;
    }
    .engine {
      background: rgb(76 199 189 / 0.12);
    }
    .engine svg {
      background: rgb(76 199 189 / 0.16);
      color: #4cc7bd;
    }
    .bar,
    .stats div,
    .secondary {
      background: rgb(241 237 226 / 0.08);
    }
    .secondary {
      box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.25);
    }
    .link + .link,
    .controls,
    .row + .row {
      border-color: #2c3670;
    }
    small,
    .scope {
      color: #a3a9c8;
    }
    .scope {
      box-shadow: inset 0 0 0 1px #2c3670;
    }
    .scope:hover {
      color: #ece7da;
    }
    .scope[aria-checked="true"] {
      background: rgb(76 199 189 / 0.14);
      box-shadow: inset 0 0 0 1px rgb(76 199 189 / 0.5);
      color: #4cc7bd;
    }
    .track {
      background: rgb(241 237 226 / 0.12);
    }
    .error {
      color: #ff9d8f;
    }
    .close:hover {
      background: rgb(241 237 226 / 0.08);
      color: #ece7da;
    }
  }
</style>
