<script lang="ts">
  import Brand from "#lib/brand.svelte";
  import { m } from "#lib/messages.ts";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";
  import { reveal } from "#lib/reveal.ts";

  const names = new Intl.DisplayNames([getLocale()], { type: "language" });
  const examples = [
    [
      "tr",
      m.site_tenet_ex_name_wrong,
      m.site_tenet_ex_name_right,
      m.site_tenet_ex_name_hint,
    ],
    [
      "es",
      m.site_tenet_ex_sense_wrong,
      m.site_tenet_ex_sense_right,
      m.site_tenet_ex_sense_hint,
    ],
    [
      "fr",
      m.site_tenet_ex_saying_wrong,
      m.site_tenet_ex_saying_right,
      m.site_tenet_ex_saying_hint,
    ],
    [
      "de",
      m.site_tenet_ex_address_wrong,
      m.site_tenet_ex_address_right,
      m.site_tenet_ex_address_hint,
    ],
  ] as const;
  const MARK = "\u2063";
  const guide = [
    [m.site_tenet_guide_one, null],
    [m.site_tenet_guide_two, m.site_tenet_term_two],
    [m.site_tenet_guide_three, m.site_tenet_term_three],
  ] as const;
  const lines = [0.94, 0.8, 0.9, 0.62, 0.92, 0.86, 0.95, 0.7, 0.88, 0.56];
  const reading = [3, 4, 5];
</script>

{#snippet globe()}
  <svg
    viewBox="0 0 20 20"
    class="size-[18px] shrink-0 text-ink/45"
    aria-hidden="true"
  >
    <circle
      cx="10"
      cy="10"
      r="7.25"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    />
    <path
      d="M2.75 10h14.5M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25c-2-2.1-3-4.5-3-7.25s1-5.15 3-7.25Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

{#snippet tag(isOurs: boolean)}
  <span class="flex items-center gap-2 text-[14px] font-semibold text-ink/65">
    {#if isOurs}
      <img src="/logo.webp" alt="" class="size-[18px]" />
      <Brand text="dragoman" />
    {:else}
      {@render globe()}
      {m.site_tenet_browser()}
    {/if}
  </span>
{/snippet}

<section class="relative z-10 bg-[#f6e4de] px-5 pt-8 pb-12 text-ink">
  <div class="mx-auto max-w-7xl">
    <h2
      class="extrude-ink max-w-4xl font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.site_tenet_title()}
    </h2>
    <p class="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink/75">
      <Brand text={m.site_tenet_lead()} />
    </p>

    <div
      class="mt-12 rounded-[32px] bg-white/45 p-5 shadow-[0_30px_60px_-44px_rgb(24_32_74/0.45)] ring-1 ring-white sm:p-8 lg:p-12"
    >
      <div
        class="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]"
      >
        <div>
          <h3
            class="text-[clamp(23px,2.2vw,30px)] leading-tight font-semibold text-balance"
          >
            {m.site_tenet_context()}
          </h3>
          <p class="mt-4 text-[16.5px] leading-relaxed text-ink/75">
            <Brand text={m.site_tenet_context_detail()} />
          </p>
        </div>
        <div>
          <p class="flex flex-wrap gap-x-6 gap-y-2" aria-hidden="true">
            {@render tag(false)}
            {@render tag(true)}
          </p>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {#each examples as [language, wrong, right, hint], index (language)}
              <figure
                class="flex flex-col rounded-2xl bg-[#fffaf3] p-4 shadow-[0_18px_30px_-26px_rgb(24_32_74/0.55)] ring-1 ring-ink/5 sm:p-5"
                style:--n={index % 2}
                {@attach reveal}
              >
                <figcaption class="text-[13px] font-semibold text-ink/50">
                  {m.site_tenet_from({
                    language: names.of(language) ?? language,
                  })}
                </figcaption>
                <p class="mt-3 flex gap-2.5">
                  <span class="mt-[3px]">{@render globe()}</span>
                  <span class="sr-only">{m.site_tenet_browser()}:</span>
                  <span class="wrong text-[15.5px] leading-snug text-ink/70"
                    >{wrong()}</span
                  >
                </p>
                <p class="mt-2.5 flex gap-2.5">
                  <img
                    src="/logo.webp"
                    alt=""
                    class="mt-[3px] size-[18px] shrink-0"
                  />
                  <span class="sr-only">dragoman:</span>
                  <span class="right text-[15.5px] leading-snug font-semibold"
                    >{right()}</span
                  >
                </p>
                <p class="mt-auto pt-4 text-[13.5px] leading-snug text-ink/55">
                  {hint()}
                </p>
              </figure>
            {/each}
          </div>
        </div>
      </div>

      <div
        class="mt-10 grid gap-x-14 gap-y-8 border-t border-ink/10 pt-10 lg:mt-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:pt-12"
      >
        <div>
          <h3
            class="text-[clamp(23px,2.2vw,30px)] leading-tight font-semibold text-balance"
          >
            {m.site_tenet_consistent()}
          </h3>
          <p class="mt-4 text-[16.5px] leading-relaxed text-ink/75">
            <Brand text={m.site_tenet_consistent_detail()} />
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each [false, true] as isOurs (isOurs)}
            <div class="flex flex-col" {@attach reveal}>
              {@render tag(isOurs)}
              <article
                class="mt-3 flex flex-1 flex-col rounded-2xl bg-[#fffaf3] p-5 shadow-[0_18px_30px_-26px_rgb(24_32_74/0.55)] ring-1 ring-ink/5"
              >
                <p class="text-[13px] font-semibold text-ink/50">
                  {m.site_tenet_from({ language: names.of("ja") ?? "ja" })}
                </p>
                <p class="mt-2 text-[17px] leading-snug font-semibold">
                  {m.site_tenet_guide_title()}
                </p>
                <ol
                  class="mt-3 grid gap-2.5 text-[15px] leading-snug text-ink/80"
                >
                  {#each guide as [step, wrong], index (index)}
                    {const parts = $derived(step({ term: MARK }).split(MARK))}
                    {const isOff = $derived(!isOurs && wrong != null)}
                    <li class="flex gap-3">
                      <span
                        class="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-[12.5px] font-semibold text-ink/60 tabular-nums"
                      >
                        {(index + 1).toLocaleString(getLocale())}
                      </span>
                      <span class="pt-0.5">
                        {parts[0]}<mark
                          class={[
                            "term rounded-[3px] bg-transparent font-semibold text-ink",
                            { "is-off": isOff, "is-ours": isOurs },
                          ]}
                          style:--i={index}
                          >{isOff && wrong != null
                            ? wrong()
                            : m.site_tenet_term()}</mark
                        >{parts[1]}
                      </span>
                    </li>
                  {/each}
                </ol>
                <p
                  class={[
                    "mt-auto pt-4 text-[13.5px] font-semibold",
                    { "text-[#b4321f]": !isOurs, "text-[#167a73]": isOurs },
                  ]}
                >
                  {isOurs
                    ? m.site_tenet_names_one()
                    : m.site_tenet_names_many()}
                </p>
              </article>
            </div>
          {/each}
        </div>
      </div>

      <div
        class="mt-10 grid gap-x-14 gap-y-8 border-t border-ink/10 pt-10 lg:mt-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:pt-12"
      >
        <div>
          <h3
            class="text-[clamp(23px,2.2vw,30px)] leading-tight font-semibold text-balance"
          >
            {m.site_tenet_privacy()}
          </h3>
          <p class="mt-4 text-[16.5px] leading-relaxed text-ink/75">
            <Brand text={m.site_tenet_privacy_detail()} />
          </p>
          <a
            href="{localizeHref('/docs')}#compare"
            class="group mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-cobalt underline decoration-gold decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-cobalt"
          >
            {m.site_compare_more()}
            <svg
              viewBox="0 0 16 16"
              class="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              <path
                d="M3 8h9m-3.5-4 4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each [false, true] as isOurs (isOurs)}
            {const kinds = $derived(isOurs ? ["ai", "device"] : ["cloud"])}
            <div class="flex flex-col" {@attach reveal}>
              {@render tag(isOurs)}
              <div
                class="mt-3 rounded-2xl bg-[#fffaf3] p-5 shadow-[0_18px_30px_-26px_rgb(24_32_74/0.55)] ring-1 ring-ink/5"
                aria-hidden="true"
              >
                <span class="block h-3 w-3/5 rounded-full bg-ink/25"></span>
                <span class="relative mt-4 grid gap-2">
                  {#each lines as width, index (index)}
                    {const isRead = $derived(isOurs && reading.includes(index))}
                    <span
                      class="relative block h-2 overflow-hidden rounded-full bg-ink/10"
                      style:width="{width * 100}%"
                    >
                      <span
                        class={[
                          "fill absolute inset-0 rounded-full",
                          {
                            "bg-coral/85": !isOurs,
                            "bg-turquoise/75": isOurs && !isRead,
                            "is-read bg-gold": isRead,
                          },
                        ]}
                        style:--i={index}
                      ></span>
                    </span>
                  {/each}
                  {#if isOurs}
                    <span
                      class="band absolute -inset-x-2.5 top-[42px] h-[52px] rounded-lg ring-2 ring-cobalt/60"
                    ></span>
                  {/if}
                </span>
              </div>
              <ul class="mt-4 grid gap-1.5 text-[14.5px] text-ink/75">
                {#each kinds as kind (kind)}
                  <li class="flex items-center gap-2.5">
                    <span
                      class={[
                        "h-2 w-5 shrink-0 rounded-full",
                        {
                          "bg-coral/85": kind === "cloud",
                          "bg-gold": kind === "ai",
                          "bg-turquoise/75": kind === "device",
                        },
                      ]}
                    ></span>
                    {#if kind === "cloud"}
                      {m.site_tenet_legend_cloud()}
                    {:else if kind === "ai"}
                      {m.site_tenet_legend_ai()}
                    {:else}
                      {m.site_tenet_legend_device()}
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .wrong {
    text-decoration: underline wavy transparent;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 4px;
  }
  .right {
    background-image: linear-gradient(
      color-mix(in srgb, var(--color-turquoise) 30%, transparent),
      color-mix(in srgb, var(--color-turquoise) 30%, transparent)
    );
    background-repeat: no-repeat;
    background-position: left 0 bottom 0.05em;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    background-size: 0% 0.5em;
  }
  :global(:dir(rtl)) .right {
    background-position: right 0 bottom 0.05em;
  }
  :global([data-shown]) .wrong {
    animation: flag 0.5s ease-out forwards;
    animation-delay: calc(var(--n) * 160ms + 250ms);
  }
  :global([data-shown]) .right {
    animation: mark 0.7s var(--ease-quill) forwards;
    animation-delay: calc(var(--n) * 160ms + 850ms);
  }
  .term {
    margin-inline: -0.15em;
    padding-inline: 0.15em;
  }
  .term.is-off {
    text-decoration: underline wavy transparent;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 4px;
  }
  .term.is-ours {
    background-image: linear-gradient(
      color-mix(in srgb, var(--color-turquoise) 30%, transparent),
      color-mix(in srgb, var(--color-turquoise) 30%, transparent)
    );
    background-repeat: no-repeat;
    background-position: left 0 bottom 0.05em;
    background-size: 0% 0.5em;
  }
  :global(:dir(rtl)) .term.is-ours {
    background-position: right 0 bottom 0.05em;
  }
  :global([data-shown]) .term.is-off {
    animation: flag 0.5s ease-out forwards;
    animation-delay: calc(var(--i) * 300ms + 300ms);
  }
  :global([data-shown]) .term.is-ours {
    animation: mark 0.6s var(--ease-quill) forwards;
    animation-delay: calc(var(--i) * 300ms + 300ms);
  }
  .fill {
    transform: scaleX(0);
    transform-origin: left;
  }
  :global(:dir(rtl)) .fill {
    transform-origin: right;
  }
  :global([data-shown]) .fill {
    animation: fill 0.5s var(--ease-quill) forwards;
    animation-delay: calc(var(--i) * 70ms + 200ms);
  }
  :global([data-shown]) .fill.is-read {
    animation-delay: calc(var(--i) * 70ms + 1400ms);
  }
  .band {
    opacity: 0;
    scale: 1.04;
  }
  :global([data-shown]) .band {
    animation: band 0.5s var(--ease-quill) 1.1s forwards;
  }
  @keyframes flag {
    to {
      text-decoration-color: color-mix(
        in srgb,
        var(--color-coral) 85%,
        transparent
      );
    }
  }
  @keyframes mark {
    to {
      background-size: 100% 0.5em;
    }
  }
  @keyframes fill {
    to {
      transform: scaleX(1);
    }
  }
  @keyframes band {
    to {
      opacity: 1;
      scale: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wrong,
    :global([data-shown]) .wrong {
      text-decoration-color: color-mix(
        in srgb,
        var(--color-coral) 85%,
        transparent
      );
      animation: none;
    }
    .right,
    :global([data-shown]) .right {
      background-size: 100% 0.5em;
      animation: none;
    }
    .term.is-off,
    :global([data-shown]) .term.is-off {
      text-decoration-color: color-mix(
        in srgb,
        var(--color-coral) 85%,
        transparent
      );
      animation: none;
    }
    .term.is-ours,
    :global([data-shown]) .term.is-ours {
      background-size: 100% 0.5em;
      animation: none;
    }
    .fill,
    :global([data-shown]) .fill {
      transform: none;
      animation: none;
    }
    .band,
    :global([data-shown]) .band {
      opacity: 1;
      scale: 1;
      animation: none;
    }
  }
</style>
