<script lang="ts">
  import { rtl } from "@dragoman/brand/locales";
  import type { Page } from "#lib/pages.ts";
  import { m } from "#lib/messages.ts";
  import { FIELDS } from "#lib/pages.ts";
  import { getLocale } from "#lib/paraglide/runtime.js";

  let {
    page,
    stage,
    character,
    hover = false,
  }: {
    page: Page;
    stage: "source" | "draft" | "refined";
    character: string;
    hover?: boolean;
  } = $props();

  const locale = getLocale();
  const direction = rtl.has(locale) ? "rtl" : "ltr";
  const sourceDirection = $derived(rtl.has(page.lang) ? "rtl" : "ltr");
  const RING = 2 * Math.PI * 37;
</script>

<div class="page size-full" style:background={page.paper}>
  <div
    class="sheet relative size-full overflow-hidden"
    data-stage={stage}
    style:--accent={page.accent}
  >
    {#key page.id}
      <div class="arrive flex h-full flex-col">
        <div
          class="flex shrink-0 items-center gap-[3cqi] border-b px-[5cqi] py-[2.6cqi]"
          style:border-color="color-mix(in srgb, {page.accent} 22%, transparent)"
          lang={page.lang}
          dir={sourceDirection}
        >
          <span
            class="text-[length:var(--site)] font-bold whitespace-nowrap"
            style:color={page.accent}>{page.site}</span
          >
          <span class="ms-auto flex gap-[2cqi]" aria-hidden="true">
            {#each [9, 12, 7] as width, index (index)}
              <span
                class="h-[1.3cqi] rounded-full"
                style:width="{width}cqi"
                style:background="color-mix(in srgb, {page.accent} 28%, transparent)"
              ></span>
            {/each}
          </span>
        </div>

        <div
          class="flex min-h-0 flex-1 flex-col gap-[2.4cqi] px-[5cqi] pt-[3.4cqi]"
        >
          <div
            class="art relative shrink-0 overflow-hidden rounded-[2cqi]"
            style:background="color-mix(in srgb, {page.accent} 16%, {page.paper})"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 300 100"
              preserveAspectRatio="xMidYMid slice"
              class="absolute inset-0 size-full"
            >
              {#if page.id === "cat"}
                <rect y="72" width="300" height="28" fill="#c98d5c" />
                <rect y="72" width="300" height="3" fill="#a96f43" />
                <rect
                  x="180"
                  y="14"
                  width="96"
                  height="56"
                  rx="5"
                  fill="#2b3157"
                />
                <rect
                  x="186"
                  y="20"
                  width="84"
                  height="44"
                  rx="2"
                  fill="#f6efe2"
                />
                {#each [28, 36, 44, 52] as y (y)}
                  <rect
                    x="192"
                    {y}
                    width={y === 52 ? 40 : 70}
                    height="3"
                    rx="1.5"
                    fill="#d9542a"
                    opacity="0.35"
                  />
                {/each}
                <rect x="222" y="70" width="12" height="4" fill="#2b3157" />
                <rect
                  x="88"
                  y="60"
                  width="124"
                  height="18"
                  rx="4"
                  fill="#eef0f6"
                />
                <rect
                  x="88"
                  y="74"
                  width="124"
                  height="4"
                  rx="2"
                  fill="#c9cddc"
                />
                {#each Array.from({ length: 14 }, (_, index) => index) as key (key)}
                  <rect
                    x={93 + key * 8.4}
                    y="63"
                    width="6.4"
                    height="4.5"
                    rx="1"
                    fill="#d6dae6"
                  />
                  <rect
                    x={95 + key * 8.4}
                    y="69"
                    width="6.4"
                    height="3.5"
                    rx="1"
                    fill="#d6dae6"
                  />
                {/each}
                <path
                  d="M104 66c-2-17 14-28 38-28s44 9 46 24c1 6-4 10-10 10h-66c-5 0-8-2-8-6z"
                  fill="#f29a4a"
                />
                <path
                  d="M118 46c8-4 20-5 30-3"
                  stroke="#d9762e"
                  stroke-width="3"
                  stroke-linecap="round"
                  fill="none"
                />
                <path
                  d="M148 40c8-1 16 1 22 5"
                  stroke="#d9762e"
                  stroke-width="3"
                  stroke-linecap="round"
                  fill="none"
                />
                <path
                  d="M184 64c14 2 22-6 18-14"
                  stroke="#f29a4a"
                  stroke-width="7"
                  stroke-linecap="round"
                  fill="none"
                />
                <circle cx="104" cy="54" r="15" fill="#f29a4a" />
                <path d="M92 44l-2-13 11 7zM112 42l7-11 1 13z" fill="#f29a4a" />
                <path
                  d="M93.5 41l-.8-6 4.6 3zM113 39.5l3.4-5 .4 5.6z"
                  fill="#ffc9a3"
                />
                <path
                  d="M96 55q3 2.6 6 0M107 55q3 2.6 6 0"
                  stroke="#5b2c12"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  fill="none"
                />
                <path d="M103 59.5l1.5 1.2 1.5-1.2z" fill="#c2453b" />
                <circle cx="96" cy="60" r="2.6" fill="#ff8f86" opacity="0.5" />
                <circle cx="112" cy="60" r="2.6" fill="#ff8f86" opacity="0.5" />
                <g class="zzz" fill="#d9542a" font-family="Rakkas, serif">
                  <text x="122" y="30" font-size="11">z</text>
                  <text x="132" y="21" font-size="14">z</text>
                  <text x="145" y="11" font-size="17">z</text>
                </g>
                <path
                  d="M40 54h22v18a6 6 0 0 1-6 6h-10a6 6 0 0 1-6-6z"
                  fill="#2347a8"
                />
                <path
                  d="M62 58h4a5 5 0 0 1 0 10h-4"
                  stroke="#2347a8"
                  stroke-width="3"
                  fill="none"
                />
                <path
                  class="steam"
                  d="M47 48c-3-4 3-6 0-11M55 48c-3-4 3-6 0-11"
                  stroke="#c98d5c"
                  stroke-width="2"
                  stroke-linecap="round"
                  fill="none"
                />
              {:else if page.id === "tulips"}
                <rect width="300" height="100" fill="#dff0e3" />
                <circle cx="246" cy="22" r="11" fill="#ffd97a" />
                <path d="M150 64V40a20 20 0 0 1 40 0v24z" fill="#cfe3d2" />
                <path d="M150 40a20 20 0 0 1 40 0z" fill="#b8d5bd" />
                <path d="M169 20v-6" stroke="#d9a43b" stroke-width="2" />
                <rect x="138" y="22" width="4" height="42" fill="#cfe3d2" />
                <path d="M138 22l2-8 2 8z" fill="#b8d5bd" />
                <rect x="198" y="22" width="4" height="42" fill="#cfe3d2" />
                <path d="M198 22l2-8 2 8z" fill="#b8d5bd" />
                <rect y="62" width="300" height="38" fill="#6fb36f" />
                <path d="M0 62q75-8 150 0t150 0v4H0z" fill="#86c486" />
                {#each Array.from({ length: 17 }, (_, index) => index) as tulip (tulip)}
                  {const x = $derived(12 + tulip * 17 + (tulip % 2) * 4)}
                  {const y = $derived(64 + (tulip % 3) * 9)}
                  {const color = $derived(
                    ["#e2483d", "#f2b632", "#ef7fb0", "#8e5cc8", "#f07a3a"][
                      tulip % 5
                    ],
                  )}
                  <g
                    class="sway"
                    style:--d="{(tulip % 5) * -0.7}s"
                    style:transform-origin="{x}px {y + 22}px"
                  >
                    <path
                      d="M{x} {y + 24}V{y + 2}"
                      stroke="#3f8a4a"
                      stroke-width="2"
                    />
                    <path d="M{x} {y + 18}q-7-3-8-11q6 2 8 9" fill="#4d9b55" />
                    <path
                      d="M{x - 5} {y - 5}q0 9 5 9t5-9l-2.5 3-2.5-4-2.5 4z"
                      fill={color}
                    />
                  </g>
                {/each}
              {:else if page.id === "coffee"}
                <rect width="300" height="100" fill="#f7e5cd" />
                <path
                  d="M0 70q30-6 60 0t60 0 60 0 60 0 60 0v30H0z"
                  fill="#e2b77f"
                />
                <path
                  d="M0 80q30-5 60 0t60 0 60 0 60 0 60 0v20H0z"
                  fill="#d4a46a"
                />
                {#each [[40, 86], [96, 92], [214, 88], [262, 94]] as [x, y] (x)}
                  <circle cx={x} cy={y} r="1.6" fill="#b98447" />
                {/each}
                <path
                  d="M128 50h38l-4 26a6 6 0 0 1-6 5h-18a6 6 0 0 1-6-5z"
                  fill="#c3672f"
                />
                <path d="M128 50h38l-1 6h-36z" fill="#9a4f24" />
                <path
                  d="M126 48q21-5 42 0"
                  stroke="#e08a4a"
                  stroke-width="4"
                  stroke-linecap="round"
                  fill="none"
                />
                <path
                  d="M164 56l58-14"
                  stroke="#7a3f1d"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <ellipse
                  class="foam"
                  cx="147"
                  cy="47"
                  rx="17"
                  ry="5"
                  fill="#f2dcb8"
                />
                <circle class="foam" cx="140" cy="44" r="3" fill="#f6e6c9" />
                <circle class="foam" cx="153" cy="43" r="2.5" fill="#f6e6c9" />
                <path
                  class="steam"
                  d="M140 36c-4-6 4-9 0-16M152 36c-4-6 4-9 0-16"
                  stroke="#c3672f"
                  stroke-width="2"
                  stroke-linecap="round"
                  fill="none"
                  opacity="0.5"
                />
                <path d="M74 64h22l-3 13h-16z" fill="#2347a8" />
                <path
                  d="M70 77h30"
                  stroke="#1e9c94"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M76 68h18"
                  stroke="#f6f5ef"
                  stroke-width="1.5"
                  stroke-dasharray="2 3"
                />
              {:else}
                <rect width="300" height="100" fill="#dcebfa" />
                <rect y="74" width="300" height="26" fill="#6a4a3a" />
                <rect y="74" width="300" height="4" fill="#8a6450" />
                <path d="M152 30v44" stroke="#8a6450" stroke-width="4" />
                <path
                  d="M138 30h28"
                  stroke="#8a6450"
                  stroke-width="4"
                  stroke-linecap="round"
                />
                <g class="bob">
                  <path
                    d="M146 30c-14-8-16-30 2-36 14-4 22 8 18 22-2 8-8 14-20 14z"
                    fill="#2fa84f"
                  />
                  <path d="M148 28c-6 6-8 18-2 28l8-26z" fill="#1e7f3a" />
                  <path
                    d="M160 -2a9 9 0 1 1-1 18 9 9 0 0 1 1-18z"
                    fill="#2fa84f"
                  />
                  <path d="M166 4q10 0 9 9-3-3-8-3z" fill="#f2b632" />
                  <circle cx="160" cy="6" r="2.4" fill="#fff" />
                  <circle cx="160.6" cy="6.2" r="1.2" fill="#18204a" />
                  <path
                    d="M150 0q4-6 10-4"
                    stroke="#e2483d"
                    stroke-width="3"
                    stroke-linecap="round"
                    fill="none"
                  />
                </g>
                <path d="M88 60h22l-2 14h-18z" fill="#f6f5ef" />
                <path
                  d="M110 63h3a3 3 0 0 1 0 6h-3"
                  stroke="#f6f5ef"
                  stroke-width="2"
                  fill="none"
                />
                <path d="M90 62h18" stroke="#8a4b2a" stroke-width="3" />
                <g
                  font-family="IBM Plex Sans Variable, sans-serif"
                  font-weight="600"
                  font-size="9"
                >
                  <g class="say" style:--d="0s">
                    <rect
                      x="186"
                      y="12"
                      width="40"
                      height="15"
                      rx="7.5"
                      fill="#fff"
                    />
                    <text x="206" y="22.5" text-anchor="middle" fill="#1f6fb2"
                      >¡Hola!</text
                    >
                  </g>
                  <g class="say" style:--d="-2s">
                    <rect
                      x="214"
                      y="34"
                      width="38"
                      height="15"
                      rx="7.5"
                      fill="#fff"
                    />
                    <text x="233" y="44.5" text-anchor="middle" fill="#2e7d4f"
                      >Ciao!</text
                    >
                  </g>
                  <g class="say" style:--d="-4s">
                    <rect
                      x="190"
                      y="54"
                      width="54"
                      height="15"
                      rx="7.5"
                      fill="#fff"
                    />
                    <text x="217" y="64.5" text-anchor="middle" fill="#c8321f"
                      >Merhaba!</text
                    >
                  </g>
                </g>
              {/if}
            </svg>
          </div>

          {#each FIELDS as field, index (field)}
            {const text = $derived(page[field])}
            <p
              class="field relative grid {field}"
              style:--i={index}
              data-target={field === "lead" ? "lead" : undefined}
            >
              <span class="layer source" lang={page.lang} dir={sourceDirection}
                >{page.source[field]}</span
              >
              <span
                class="layer draft"
                lang={locale}
                dir={direction}
                class:font-hand={locale === "ota"}>{text.draft()}</span
              >
              <span
                class="layer refined"
                lang={locale}
                dir={direction}
                class:font-hand={locale === "ota"}>{text.refined()}</span
              >
              {#if hover && field === "lead"}
                <span
                  class="tip absolute inset-x-0 bottom-[calc(100%+1.2cqi)] z-10 block rounded-[1.6cqi] border border-[#d9d2bf] bg-tile px-[2.6cqi] py-[1.8cqi] text-ink shadow-[0_18px_36px_-16px_rgb(15_22_54/0.45)]"
                >
                  <b
                    class="mb-[0.6cqi] block text-[length:var(--small)] font-semibold text-cobalt"
                    >{m.original()}</b
                  >
                  <span
                    class="block text-[length:var(--tip)] leading-normal"
                    lang={page.lang}
                    dir={sourceDirection}>{page.source.lead}</span
                  >
                </span>
              {/if}
            </p>
          {/each}

          <div class="mt-[1cqi] grid gap-[1.8cqi]" aria-hidden="true">
            {#each [100, 94, 97, 60] as width, index (index)}
              <span
                class="h-[1.4cqi] rounded-full bg-[#18204a]/8"
                style:width="{width}%"
              ></span>
            {/each}
          </div>
        </div>
      </div>
    {/key}

    <span class="sweep" aria-hidden="true"></span>

    <span
      class="badge absolute end-[4cqi] bottom-[4cqi] z-10 block rounded-full bg-cobalt"
      data-target="badge"
      aria-hidden="true"
    >
      <svg viewBox="0 0 82 82" class="progress">
        <circle cx="41" cy="41" r="37" stroke-dasharray={RING} class="track" />
        <circle
          cx="41"
          cy="41"
          r="37"
          stroke-dasharray={RING}
          stroke-dashoffset={stage === "source" ? RING : 0}
          class="draft-ring"
        />
        <circle
          cx="41"
          cy="41"
          r="37"
          stroke-dasharray={RING}
          stroke-dashoffset={stage === "refined" ? 0 : RING}
          class="refine-ring"
        />
      </svg>
      <img src="/characters/{character}.webp" alt="" />
    </span>
  </div>
</div>

<style>
  .page {
    container-type: inline-size;
  }

  .sheet {
    color: #18204a;
    --site: 3.2cqi;
    --title: 4.4cqi;
    --byline: 2.1cqi;
    --body: 2.6cqi;
    --small: 1.9cqi;
    --tip: 2.3cqi;
    --badge: 9cqi;
  }

  .art {
    aspect-ratio: 4 / 1;
  }

  @container (width < 470px) {
    .sheet {
      --site: 5.2cqi;
      --title: 7.2cqi;
      --byline: 3.7cqi;
      --body: 4.5cqi;
      --small: 3.4cqi;
      --tip: 4.1cqi;
      --badge: 15cqi;
    }

    .art {
      aspect-ratio: 2.8 / 1;
    }
  }

  .title {
    font-size: var(--title);
    font-weight: 700;
    line-height: 1.15;
    text-wrap: balance;
  }

  .byline {
    font-size: var(--byline);
    color: var(--accent);
    font-weight: 600;
  }

  .lead,
  .more {
    font-size: var(--body);
    line-height: 1.55;
  }

  .lead {
    margin-top: 0.4cqi;
  }

  .layer {
    grid-area: 1 / 1;
    transition:
      opacity 0.5s,
      filter 0.5s,
      clip-path 0.8s cubic-bezier(0.65, 0, 0.2, 1);
    transition-delay: calc(var(--i) * 0.16s);
  }

  .source {
    opacity: 0;
    filter: blur(3px);
  }

  .draft {
    clip-path: inset(0 0 100% 0);
    text-decoration: underline dotted rgb(224 172 62 / 0.95);
    text-decoration-thickness: 0.32cqi;
    text-underline-offset: 0.7cqi;
  }

  .refined {
    opacity: 0;
    filter: blur(3px);
  }

  [data-stage="source"] .source,
  [data-stage="refined"] .refined {
    opacity: 1;
    filter: none;
  }

  [data-stage="draft"] .draft {
    clip-path: inset(-20% -5% -30% -5%);
  }

  [data-stage="refined"] .draft {
    opacity: 0;
    clip-path: inset(-20% -5% -30% -5%);
  }

  [data-stage="refined"] .refined {
    background: linear-gradient(
        100deg,
        currentcolor 42%,
        #39c9be 48%,
        #fff3c4 50%,
        #39c9be 52%,
        currentcolor 58%
      )
      0 0 / 300% 100%;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 1.4s calc(var(--i) * 0.16s) cubic-bezier(0.4, 0, 0.2, 1)
      both;
  }

  @keyframes shimmer {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }

  .sweep {
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 18%;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(
      to bottom,
      transparent,
      rgb(224 172 62 / 0.28) 60%,
      rgb(255 236 170 / 0.9) 92%,
      transparent
    );
    mix-blend-mode: multiply;
  }

  [data-stage="draft"] .sweep {
    animation: sweep 1.3s cubic-bezier(0.5, 0, 0.3, 1) both;
  }

  @keyframes sweep {
    0% {
      opacity: 0;
      translate: 0 -100%;
    }
    15% {
      opacity: 1;
    }
    85% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      translate: 0 560%;
    }
  }

  .tip {
    animation: rise 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 1cqi;
    }
  }

  .badge {
    width: var(--badge);
    height: var(--badge);
    box-shadow:
      inset 0 -0.5cqi 0 rgb(15 22 54 / 0.35),
      0 1.6cqi 3cqi -1cqi rgb(15 22 54 / 0.6);
    animation: pop 0.6s 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  .badge img {
    position: absolute;
    inset-inline-start: -8.8%;
    bottom: 0;
    width: 117.6%;
    max-width: none;
    clip-path: inset(-60% 8.8% 0 8.8% round 0 0 50% 50%);
  }

  .progress {
    position: absolute;
    inset: -10.3%;
    width: 120.6%;
    rotate: -90deg;
    overflow: visible;
  }

  .progress circle {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 1.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .track {
    stroke: rgb(24 32 74 / 0.18);
  }

  .draft-ring {
    stroke: #e0ac3e;
  }

  .refine-ring {
    stroke: #1e9c94;
  }

  [data-stage="source"] .progress {
    opacity: 0;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(3cqi) scale(0.6);
    }
  }

  .arrive {
    animation: arrive 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes arrive {
    from {
      opacity: 0;
      translate: 0 4cqi;
    }
  }

  .zzz text {
    animation: float 3s ease-in-out infinite;
  }

  .zzz text:nth-child(2) {
    animation-delay: -1s;
  }

  .zzz text:nth-child(3) {
    animation-delay: -2s;
  }

  @keyframes float {
    50% {
      translate: 2px -3px;
      opacity: 0.55;
    }
  }

  .steam {
    animation: steam 2.6s ease-in-out infinite;
  }

  @keyframes steam {
    50% {
      translate: 1px -3px;
      opacity: 0.2;
    }
  }

  .sway {
    animation: sway 3.4s var(--d) ease-in-out infinite;
  }

  @keyframes sway {
    50% {
      rotate: 5deg;
    }
  }

  .foam {
    animation: foam 3s ease-in-out infinite;
  }

  @keyframes foam {
    50% {
      translate: 0 -3px;
    }
  }

  .bob {
    animation: bob 1.2s ease-in-out infinite;
  }

  @keyframes bob {
    50% {
      translate: 0 1.5px;
      rotate: -2deg;
    }
  }

  .say {
    animation: say 6s var(--d) ease-in-out infinite;
  }

  @keyframes say {
    0%,
    100% {
      opacity: 0;
      translate: -4px 4px;
    }
    10%,
    30% {
      opacity: 1;
      translate: 0 0;
    }
    40% {
      opacity: 0;
    }
  }

  .bob {
    transform-box: fill-box;
    transform-origin: 50% 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .layer,
    .progress circle {
      transition-duration: 0.01s;
      transition-delay: 0s;
    }

    [data-stage="refined"] .refined,
    [data-stage="draft"] .sweep,
    .arrive,
    .badge,
    .tip,
    .zzz text,
    .steam,
    .sway,
    .foam,
    .bob,
    .say {
      animation: none;
    }
  }
</style>
