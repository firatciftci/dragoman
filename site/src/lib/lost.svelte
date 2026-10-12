<script lang="ts">
  import { m } from "#lib/messages.ts";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";

  let { status }: { status: number } = $props();

  const isLost = $derived(status === 404);
  const locale = getLocale();
  const scripts = new Intl.DisplayNames([locale], {
    type: "script",
    fallback: "none",
  });
  const languages = new Intl.DisplayNames([locale], {
    type: "language",
    fallback: "none",
  });
  const numerals = $derived(
    (
      [
        ["latn", "Latn"],
        ["arab", "Arab"],
        ["arabext", "fa"],
        ["deva", "Deva"],
        ["beng", "Beng"],
        ["thai", "Thai"],
        ["hanidec", "Hani"],
        ["tamldec", "Taml"],
        ["khmr", "Khmr"],
        ["gujr", "Gujr"],
        ["tibt", "Tibt"],
        ["telu", "Telu"],
        ["mymr", "Mymr"],
        ["guru", "Guru"],
        ["laoo", "Laoo"],
        ["knda", "Knda"],
        ["mlym", "Mlym"],
      ] as const
    ).map(([system, code]) => ({
      system,
      text: new Intl.NumberFormat("en", {
        numberingSystem: system,
        useGrouping: false,
      }).format(status),
      name: (code.length === 2 ? languages : scripts).of(code),
    })),
  );

  let index = $state(0);
  let held = $state(false);

  $effect(() => {
    const at = index;
    if (held || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      index = (at + 1) % numerals.length;
    }, 2400);
    return () => {
      clearTimeout(timer);
    };
  });
</script>

<section
  class="relative isolate flex min-h-svh items-center overflow-hidden bg-lapis px-5 pt-28 pb-24 text-tile"
>
  <div
    class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_34%,rgb(35_71_168/0.6),transparent_70%)]"
    aria-hidden="true"
  ></div>
  <div class="absolute inset-0 -z-10" aria-hidden="true">
    {#each Array.from({ length: 10 }, (_, sheet) => sheet) as sheet (sheet)}
      <span
        class="sheet"
        style:left="{(sheet * 23 + 4) % 94}%"
        style:--delay="{-sheet * 2.3}s"
        style:--time="{16 + ((sheet * 5) % 9)}s"
        style:--turn="{((sheet * 47) % 70) - 35}deg"
        style:--size="{22 + ((sheet * 7) % 16)}px"
      ></span>
    {/each}
  </div>

  <div class="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
    <div class="relative w-full max-w-xl">
      <button
        type="button"
        class="group mx-auto grid h-[clamp(132px,26vw,232px)] w-full cursor-pointer place-items-center rounded-[40px]"
        aria-label={m.lost_next()}
        onclick={() => {
          index = (index + 1) % numerals.length;
        }}
        onpointerenter={() => (held = true)}
        onpointerleave={() => (held = false)}
        onfocus={() => (held = true)}
        onblur={() => (held = false)}
      >
        {#each numerals as numeral, at (numeral.system)}
          {#if at === index}
            <span
              class="digits extrude font-display text-[clamp(104px,20vw,190px)] leading-none transition-transform group-hover:-rotate-2"
              dir="ltr">{numeral.text}</span
            >
          {/if}
        {/each}
      </button>
      {#each numerals as numeral, at (numeral.system)}
        {#if at === index}
          <p class="name mt-1 text-[15px] text-tile/60" aria-hidden="true">
            {numeral.name}
          </p>
        {/if}
      {/each}

      <div
        class="pointer-events-none absolute -end-1 -bottom-8 w-[clamp(118px,30%,168px)] sm:-end-16"
        aria-hidden="true"
      >
        <div class="scribe absolute inset-x-[10%] bottom-[56%]">
          <img src="/characters/scholar.webp" alt="" class="w-full" />
          <span
            class="bubble absolute -start-[22%] -top-[6%] grid size-9 place-items-center rounded-full bg-tile font-display text-[22px] leading-none text-cobalt shadow-[0_8px_18px_-8px_rgb(0_0_0/0.6)]"
            >{index % 2 === 0 ? "?" : "؟"}</span
          >
        </div>
        <svg viewBox="0 0 140 70" class="relative w-full">
          <g>
            <rect x="8" y="38" width="124" height="28" rx="14" fill="#f3ead6" />
            <rect
              x="8"
              y="38"
              width="124"
              height="28"
              rx="14"
              fill="url(#scroll-shade)"
            />
            <ellipse cx="14" cy="52" rx="6" ry="14" fill="#d9a43b" />
            <ellipse cx="126" cy="52" rx="6" ry="14" fill="#a87a22" />
            <rect x="24" y="12" width="96" height="28" rx="14" fill="#efe2c6" />
            <rect
              x="24"
              y="12"
              width="96"
              height="28"
              rx="14"
              fill="url(#scroll-shade)"
            />
            <ellipse cx="30" cy="26" rx="6" ry="14" fill="#d9a43b" />
            <ellipse cx="114" cy="26" rx="6" ry="14" fill="#a87a22" />
            <path
              d="M60 46h40M66 54h28"
              stroke="#c8321f"
              stroke-width="2.4"
              stroke-linecap="round"
              opacity="0.55"
            />
          </g>
          <defs>
            <linearGradient id="scroll-shade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff" stop-opacity="0.35" />
              <stop offset="0.55" stop-color="#fff" stop-opacity="0" />
              <stop offset="1" stop-color="#7a4a14" stop-opacity="0.35" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>

    <h1
      class="extrude mt-12 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] text-balance"
    >
      {isLost ? m.lost_title() : m.error_title()}
    </h1>
    <p
      class="mt-5 max-w-xl text-[18px] leading-relaxed text-pretty text-tile/80"
    >
      {isLost ? m.lost_lead() : m.error_lead()}
    </p>
    <p
      class="mt-6 max-w-md font-display text-[clamp(20px,2.2vw,24px)] leading-snug text-balance text-gold"
    >
      {isLost ? m.lost_quip() : m.error_quip()}
    </p>
    <div class="mt-10 flex flex-wrap justify-center gap-3">
      <a
        href={localizeHref("/")}
        class="inline-flex min-h-14 items-center rounded-2xl border-b-[5px] border-[#8e2214] bg-coral px-7 text-[17px] font-semibold text-tile shadow-[0_14px_30px_-12px_rgb(200_50_31/0.8)] transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2"
        >{m.lost_home()}</a
      >
      {#if isLost}
        <a
          href={localizeHref("/docs")}
          class="inline-flex min-h-14 items-center rounded-2xl bg-tile/10 px-7 text-[17px] font-semibold ring-1 ring-tile/25 transition-colors hover:bg-tile/20"
          >{m.lost_docs()}</a
        >
      {:else}
        <button
          type="button"
          class="inline-flex min-h-14 cursor-pointer items-center rounded-2xl bg-tile/10 px-7 text-[17px] font-semibold ring-1 ring-tile/25 transition-colors hover:bg-tile/20"
          onclick={() => location.reload()}>{m.error_reload()}</button
        >
      {/if}
    </div>
  </div>
</section>

<style>
  .digits {
    display: block;
    animation: write 0.7s var(--ease-quill) both;
  }

  @keyframes write {
    from {
      opacity: 0;
      filter: blur(10px);
      scale: 0.86;
      rotate: -4deg;
    }
  }

  .name {
    animation: write 0.5s 0.15s var(--ease-quill) both;
  }

  .scribe {
    animation: look 7s ease-in-out infinite;
    transform-origin: 50% 100%;
  }

  @keyframes look {
    0%,
    18% {
      translate: 0 18%;
      scale: 1 1;
    }
    26%,
    44% {
      translate: 0 0;
      scale: 1 1;
    }
    50%,
    70% {
      translate: 0 0;
      scale: -1 1;
    }
    78%,
    100% {
      translate: 0 18%;
      scale: -1 1;
    }
  }

  .bubble {
    animation: pop 7s ease-in-out infinite;
  }

  @keyframes pop {
    0%,
    24%,
    80%,
    100% {
      opacity: 0;
      scale: 0.4;
    }
    32%,
    72% {
      opacity: 1;
      scale: 1;
    }
  }

  .sheet {
    position: absolute;
    top: -10%;
    width: var(--size);
    aspect-ratio: 3 / 4;
    border-radius: 3px;
    background:
      repeating-linear-gradient(
          180deg,
          transparent 0 5px,
          rgb(24 32 74 / 0.18) 5px 6px
        )
        content-box,
      #f3ead6;
    padding: calc(var(--size) * 0.2) calc(var(--size) * 0.16);
    opacity: 0.16;
    animation: fall var(--time) linear var(--delay) infinite;
  }

  @keyframes fall {
    from {
      translate: 0 0;
      rotate: var(--turn);
    }
    50% {
      translate: 40px 60vh;
    }
    to {
      translate: -20px 125vh;
      rotate: calc(var(--turn) * -1 + 180deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .digits,
    .name,
    .scribe,
    .bubble,
    .sheet {
      animation: none;
    }

    .sheet {
      top: auto;
      bottom: 12%;
    }
  }
</style>
