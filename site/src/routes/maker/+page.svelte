<script lang="ts">
  import { rtl } from "@dragoman/brand/locales";
  import Tooltip from "@dragoman/brand/tooltip.svelte";
  import { mergeProps } from "bits-ui";
  import { onMount } from "svelte";
  import { on } from "svelte/events";
  import Brand from "#lib/brand.svelte";
  import { m } from "#lib/messages.ts";
  import { getLocale } from "#lib/paraglide/runtime.js";

  const SITE = "https://www.firatciftci.com";
  const NAME = "Fırat Çiftçi";
  const ARCH =
    "M0 320V140C0 84 58 72 94 42C109 29 117 15 120 0C123 15 131 29 146 42C182 72 240 84 240 140V320Z";
  const RING = 2 * Math.PI * 37;
  const WIDE = {
    width: 1200,
    height: 540,
    course:
      "M 40 70 C 170 30, 230 210, 370 190 S 560 50, 690 160 S 820 400, 960 340 S 1130 330, 1110 560",
    reach: (t: number) => ({ half: 4 + 24 * t ** 0.85, bank: 9 + 34 * t }),
    places: [
      [0.035, 0, 1],
      [0.13, 0.55, -0.83],
      [0.25, 0, 1],
      [0.35, 0, -1],
      [0.43, 0, 1],
      [0.6, -1, 0],
      [0.66, 0, 1],
      [0.79, 0, -1],
      [0.95, -1, 0],
    ],
  };
  const TALL = {
    width: 400,
    height: 1180,
    course:
      "M 64 20 C 24 140, 176 170, 154 300 S 30 440, 60 580 S 176 720, 146 860 S 44 1020, 96 1200",
    reach: (t: number) => ({ half: 3 + 14 * t ** 0.85, bank: 6 + 18 * t }),
    places: Array.from({ length: 9 }, (_, index) => [
      0.04 + index * 0.1075,
      1,
      0,
    ]),
  };

  const locale = getLocale();
  const direction = rtl.has(locale) ? "rtl" : "ltr";
  const address = ["firat", "firatciftci.com"].join("@");
  const mailto = `mailto:${address}?subject=${encodeURIComponent(m.maker_mail_subject())}`;
  const [shahmaranBefore, shahmaranAfter] = m
    .maker_shahmaran({ friend: "\u0000" })
    .split("\u0000");

  const names = [
    { script: "Fırat", lang: "tr", tongue: m.maker_tongue_tr() },
    { script: "Firat", lang: "kmr", tongue: m.maker_tongue_kmr() },
    {
      script: "Եփրատ",
      lang: "hy",
      reading: "Yeprat",
      tongue: m.maker_tongue_hy(),
    },
    {
      script: "الفرات",
      lang: "ar",
      reading: "al-Furāt",
      tongue: m.maker_tongue_ar(),
    },
    {
      script: "פְּרָת",
      lang: "he",
      reading: "Prat",
      tongue: m.maker_tongue_he(),
    },
    {
      script: "Εὐφράτης",
      lang: "grc",
      reading: "Euphrátēs",
      tongue: m.maker_tongue_grc(),
    },
    { script: "Ufrātuš", lang: "peo", tongue: m.maker_tongue_peo() },
    {
      script: "𒀀𒇉𒌓𒄒𒉣",
      lang: "akk",
      reading: "Purattu",
      tongue: m.maker_tongue_akk(),
    },
    {
      script: "𒀀𒇉𒌓𒄒𒉣",
      lang: "sux",
      reading: "Buranun",
      tongue: m.maker_tongue_sux(),
    },
  ];

  const work = [
    {
      id: "everydog",
      name: "Every Dog in New York",
      text: m.maker_work_everydog(),
    },
    { id: "sozluk", name: "Nişanyan Sözlük", text: m.maker_work_sozluk() },
    {
      id: "yeradlari",
      name: "Nişanyan Yeradları",
      text: m.maker_work_yeradlari(),
    },
    {
      id: "ottoman",
      name: "Ottoman Inscriptions",
      text: m.maker_work_ottoman(),
    },
  ];

  let stage = $state<"source" | "draft" | "refined">("source");
  let run = 0;

  async function translate() {
    const current = ++run;
    const wait = async (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    stage = "source";
    await wait(900);
    if (current !== run) return;
    stage = "draft";
    await wait(2800);
    if (current !== run) return;
    stage = "refined";
  }

  let clip: HTMLAudioElement | null = null;
  let said = $state(0);

  async function say() {
    said += 1;
    clip ??= new Audio(`${SITE}/pronunciation.mp3`);
    try {
      clip.currentTime = 0;
      await clip.play();
    } catch {
      console.error("Failed to play the pronunciation clip");
    }
  }

  let river = $state<HTMLDivElement | null>(null);
  let width = $state(0);
  const map = $derived(width >= 760 ? WIDE : TALL);
  let channel = $state({
    water: "",
    bank: "",
    stations: [] as Array<{
      x: number;
      y: number;
      dot: { x: number; y: number };
      t: number;
      side: string;
    }>,
  });
  let progress = $state(0);
  let boat = $state({ x: 0, y: 0 });

  $effect(() => {
    const { reach, course } = map;
    const box = river;
    if (box == null) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", course);
    const length = line.getTotalLength();
    const left: Array<string> = [];
    const right: Array<string> = [];
    const bankLeft: Array<string> = [];
    const bankRight: Array<string> = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = line.getPointAtLength(t * length);
      const q = line.getPointAtLength(Math.min(length, t * length + 1));
      const r = line.getPointAtLength(Math.max(0, t * length - 1));
      const size = Math.hypot(q.x - r.x, q.y - r.y) || 1;
      const n = { x: -(q.y - r.y) / size, y: (q.x - r.x) / size };
      const { half, bank } = reach(t);
      left.push(`${p.x + n.x * half} ${p.y + n.y * half}`);
      right.unshift(`${p.x - n.x * half} ${p.y - n.y * half}`);
      bankLeft.push(`${p.x + n.x * bank} ${p.y + n.y * bank}`);
      bankRight.unshift(`${p.x - n.x * bank} ${p.y - n.y * bank}`);
    }
    const stations = map.places.map(([t = 0, x = 0, y = 0]) => {
      const p = line.getPointAtLength(t * length);
      const reachOut = reach(t).bank + 16;
      const side =
        Math.abs(x) > Math.abs(y)
          ? x > 0
            ? "translate(0,-50%)"
            : "translate(-100%,-50%)"
          : y > 0
            ? "translate(-50%,0)"
            : "translate(-50%,-100%)";
      return {
        x: p.x + x * reachOut,
        y: p.y + y * reachOut,
        dot: { x: p.x, y: p.y },
        t,
        side,
      };
    });
    channel = {
      water: `M ${[...left, ...right].join(" L ")} Z`,
      bank: `M ${[...bankLeft, ...bankRight].join(" L ")} Z`,
      stations,
    };

    let frame = 0;
    const place = () => {
      frame = 0;
      const rect = box.getBoundingClientRect();
      const travel =
        map === TALL
          ? (innerHeight * 0.55 - rect.top) / rect.height
          : (innerHeight - rect.height * 0.75 - rect.top) /
            Math.max(240, innerHeight - rect.height * 0.5);
      progress = Math.min(0.96, Math.max(0, travel));
      const p = line.getPointAtLength(progress * length);
      boat = { x: p.x, y: p.y };
    };
    place();
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(place);
    };
    const off = [
      on(window, "scroll", schedule, { passive: true }),
      on(window, "resize", schedule),
    ];
    return () => {
      cancelAnimationFrame(frame);
      for (const stop of off) stop();
    };
  });

  onMount(() => {
    void translate();
  });
</script>

<svelte:head>
  <title>{m.maker_title()} | dragoman</title>
</svelte:head>

<section
  class="relative isolate overflow-hidden bg-[linear-gradient(180deg,#0f1636_0%,#1d2160_34%,#3c3584_64%,#8f74b4_86%,#e9dccf_100%)] px-5 pt-32 pb-40 text-tile"
>
  <svg
    class="pointer-events-none absolute inset-0 -z-10 size-full opacity-[0.07]"
    aria-hidden="true"
  >
    <defs>
      <pattern
        id="maker-girih"
        width="56"
        height="56"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M28 4 34.5 21.5 52 28 34.5 34.5 28 52 21.5 34.5 4 28 21.5 21.5Z"
          fill="none"
          stroke="#f6f5ef"
          stroke-width="1.2"
        />
        <circle cx="0" cy="0" r="6" fill="none" stroke="#f6f5ef" />
        <circle cx="56" cy="56" r="6" fill="none" stroke="#f6f5ef" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#maker-girih)" />
  </svg>
  <div class="absolute inset-x-0 top-0 -z-10 h-80" aria-hidden="true">
    {#each [[8, 30, 0], [22, 62, 1.2], [37, 18, 2.1], [56, 48, 0.6], [71, 24, 1.7], [88, 56, 2.6], [94, 14, 0.9], [14, 82, 2.3], [64, 86, 1.4]] as [x, y, delay], index (index)}
      <span
        class="star absolute size-1 rounded-full bg-[#fff3c4]"
        style:left="{x}%"
        style:top="{y}%"
        style:animation-delay="{delay}s"
      ></span>
    {/each}
  </div>

  <div
    class="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_auto]"
  >
    <div class="relative justify-self-center lg:order-2 lg:justify-self-end">
      <div
        class="absolute inset-[-18%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(255_243_196/0.32),transparent)]"
        aria-hidden="true"
      ></div>
      <a
        href={SITE}
        target="_blank"
        rel="noreferrer external"
        class="arch group block w-[clamp(180px,24vw,290px)] -rotate-2 transition-transform duration-700 hover:rotate-0"
        aria-label="firatciftci.com"
      >
        <svg viewBox="0 -34 240 372" class="block w-full overflow-visible">
          <defs>
            <path id="maker-arch" d={ARCH} />
            <clipPath id="maker-photo">
              <use
                href="#maker-arch"
                transform="translate(19.2 51.2) scale(0.84)"
              />
            </clipPath>
            <pattern
              id="maker-tiles"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(0.62)"
            >
              <rect width="30" height="30" fill="#fbf8f0" />
              <path
                d="M15 5c3 4 3 6 0 10-3-4-3-6 0-10zM15 25c3-4 3-6 0-10-3 4-3 6 0 10zM5 15c4-3 6-3 10 0-4 3-6 3-10 0zM25 15c-4-3-6-3-10 0 4 3 6 3 10 0z"
                fill="#2347a8"
              />
              <circle cx="15" cy="15" r="2.2" fill="#c8321f" />
              <path
                d="M0 0q5 1 6 6M30 0q-5 1-6 6M0 30q5-1 6-6M30 30q-5-1-6-6"
                stroke="#1e9c94"
                stroke-width="2.2"
                fill="none"
              />
            </pattern>
          </defs>
          <g fill="#d9a43b">
            <rect x="118.6" y="-14" width="2.8" height="16" />
            <circle cx="120" cy="-6" r="4" />
            <path
              d="M120 -34a10 10 0 1 0 9 14 8 8 0 1 1 -9 -14z"
              class="crescent"
            />
          </g>
          <use
            href="#maker-arch"
            fill="#d9a43b"
            class="drop-shadow-[0_18px_30px_rgb(15_22_54/0.55)]"
          />
          <use
            href="#maker-arch"
            fill="url(#maker-tiles)"
            transform="translate(6 16) scale(0.95)"
          />
          <use
            href="#maker-arch"
            fill="#1e9c94"
            transform="translate(16.8 44.8) scale(0.86)"
          />
          <g clip-path="url(#maker-photo)">
            <rect width="240" height="320" fill="#5c2b3a" />
            <image
              href="/firat.jpg"
              x="10"
              y="44"
              width="220"
              height="290"
              preserveAspectRatio="xMidYMid slice"
              class="photo"
            />
          </g>
          <rect x="-8" y="314" width="256" height="14" rx="3" fill="#d9a43b" />
          <rect x="-8" y="324" width="256" height="4" fill="#a87a22" />
        </svg>
      </a>
      <a
        href="https://en.wikipedia.org/wiki/Shahmaran"
        target="_blank"
        rel="noreferrer external"
        aria-label={m.maker_shahmaran_link()}
        class="shahmaran absolute -start-16 bottom-0 block w-[clamp(84px,10vw,124px)] rotate-[14deg] text-gold transition-transform duration-700 hover:rotate-[4deg] rtl:-scale-x-100"
      >
        <span
          class="block aspect-[277.9/301.2] w-full bg-current [mask:url(/shahmaran.svg)_center/contain_no-repeat]"
        ></span>
      </a>
    </div>

    <div class="lg:order-1" data-stage={stage}>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-4">
        <h1
          class="extrude grid font-display text-[clamp(54px,8.4vw,116px)] leading-[0.98]"
        >
          <span class="layer source" lang="tr" aria-hidden="true">{NAME}</span>
          <span
            class="layer draft"
            lang={locale}
            dir={direction}
            aria-hidden="true"
            class:font-hand={locale === "ota"}>{m.demo_maker_name_draft()}</span
          >
          <button
            type="button"
            class="layer refined text-start text-tile"
            lang="tr"
            dir="ltr"
            onclick={say}
            aria-label={m.maker_say({ name: NAME })}
          >
            {#key said}
              {#each NAME.split(" ") as word, w (w)}
                {#if w > 0}{" "}{/if}<span class="whitespace-nowrap"
                  >{#each [...word] as letter, i (i)}<span
                      class={["letter inline-block", { wave: said > 0 }]}
                      style:--n={w * 6 + i}>{letter}</span
                    >{/each}</span
                >
              {/each}
            {/key}
          </button>
        </h1>
      </div>

      <div class="mt-7 flex max-w-xl items-start gap-4">
        <Tooltip text={m.maker_replay()} side="top">
          {#snippet children({ props })}
            <button
              {...mergeProps(props, { onclick: translate })}
              type="button"
              class="badge relative mt-1 grid size-16 shrink-0 place-items-center rounded-full bg-cobalt"
              aria-label={m.maker_replay()}
            >
              <svg viewBox="0 0 82 82" class="progress" aria-hidden="true">
                <circle
                  cx="41"
                  cy="41"
                  r="37"
                  stroke-dasharray={RING}
                  class="stroke-tile/20"
                />
                <circle
                  cx="41"
                  cy="41"
                  r="37"
                  stroke-dasharray={RING}
                  stroke-dashoffset={stage === "source" ? RING : 0}
                  class="stroke-gold"
                />
                <circle
                  cx="41"
                  cy="41"
                  r="37"
                  stroke-dasharray={RING}
                  stroke-dashoffset={stage === "refined" ? 0 : RING}
                  class="stroke-turquoise"
                />
              </svg>
              <img src="/characters/envoy.webp" alt="" />
            </button>
          {/snippet}
        </Tooltip>
        <div class="min-h-24 flex-1" aria-live="polite">
          <p
            class={[
              "flex items-center gap-2 text-[15px] font-semibold transition-opacity duration-300",
              { "opacity-0": stage === "source" },
            ]}
          >
            <span
              class={[
                "size-2.5 rounded-full transition-colors duration-500",
                {
                  "bg-gold": stage !== "refined",
                  "bg-turquoise": stage === "refined",
                },
              ]}
            ></span>
            {stage === "refined"
              ? m.site_specimen_refined()
              : m.site_specimen_drafted()}
          </p>
          {#if stage === "refined"}
            <p class="note mt-2 text-[15px] leading-relaxed text-tile/80">
              {m.maker_name_note()}
            </p>
          {/if}
        </div>
      </div>

      <p
        class="mt-10 font-display text-[clamp(30px,3.6vw,46px)] leading-tight text-gold"
      >
        {m.maker_tagline()}
      </p>
      <p class="mt-4 max-w-[58ch] text-[18px] leading-relaxed text-tile/85">
        <Brand text={m.maker_intro()} />
        <span class="text-tile/65">{m.maker_hear()}</span>
      </p>

      <div class="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={SITE}
          target="_blank"
          rel="noreferrer external"
          class="inline-flex min-h-14 items-center gap-2.5 rounded-2xl border-b-[5px] border-[#8e2214] bg-coral px-7 text-[17px] font-semibold text-tile shadow-[0_14px_30px_-12px_rgb(200_50_31/0.8)] transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2"
        >
          {m.maker_visit()}
          <svg
            viewBox="0 0 12 12"
            class="size-3 rtl:-scale-x-100"
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
        <a
          href={mailto}
          class="inline-flex min-h-14 items-center rounded-2xl bg-tile/10 px-5 text-[17px] font-semibold ring-1 ring-tile/25 backdrop-blur-sm transition-colors hover:bg-tile/20"
          >{m.maker_write()}</a
        >
        <a
          href="https://github.com/firatciftci"
          target="_blank"
          rel="noreferrer external"
          class="inline-flex min-h-14 items-center rounded-2xl px-4 text-[17px] font-semibold text-tile/80 transition-colors hover:text-tile"
          >GitHub</a
        >
      </div>
    </div>
  </div>
</section>

<section
  class="relative overflow-hidden bg-[linear-gradient(180deg,#e9dccf_0%,#f3ead6_14%,#efe3c8_100%)] px-5 pt-16 pb-28 text-ink"
>
  <div class="mx-auto max-w-6xl" bind:clientWidth={width}>
    <h2
      class="extrude-ink max-w-3xl font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.maker_river_title()}
    </h2>
    <p class="mt-5 max-w-[60ch] text-[18px] leading-relaxed text-ink/80">
      {m.maker_river_intro()}
    </p>

    <div
      bind:this={river}
      class="relative mx-auto mt-12 w-full"
      class:max-w-md={map === TALL}
      dir="ltr"
    >
      <svg
        viewBox="0 0 {map.width} {map.height}"
        class="block w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="maker-water"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={map.width}
            y2={map.height}
          >
            <stop offset="0" stop-color="#39c9be" />
            <stop offset="0.55" stop-color="#1e9c94" />
            <stop offset="1" stop-color="#2347a8" />
          </linearGradient>
          <filter id="maker-silt" x="-5%" y="-10%" width="110%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <linearGradient
            id="maker-mouth"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={map.height * 0.78}
            x2="0"
            y2={map.height}
          >
            <stop offset="0" stop-color="#fff" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          <mask id="maker-fade" maskUnits="userSpaceOnUse">
            <rect
              x="-100"
              y="-100"
              width={map.width + 200}
              height={map.height + 200}
              fill="url(#maker-mouth)"
            />
          </mask>
          <clipPath id="maker-channel">
            <path d={channel.water} />
          </clipPath>
        </defs>

        <g fill="#cdb98c" opacity="0.8" transform="translate(0 -26)">
          <path d="M-6 96 L28 34 L50 70 L72 22 L104 96Z" />
          <path d="M44 96 L64 58 L80 82Z" fill="#b39d6c" />
          <path d="M66 22 L72 22 L76 30 L70 34Z" fill="#fbf8f0" />
        </g>

        <g mask="url(#maker-fade)">
          <path d={channel.bank} fill="#d9c49a" filter="url(#maker-silt)" />
          <path d={channel.water} fill="url(#maker-water)" />

          <g clip-path="url(#maker-channel)" class="text-[#f6f5ef]">
            {#each [-8, -3, 3, 8] as offset, i (offset)}
              <path
                d={map.course}
                fill="none"
                stroke="currentColor"
                stroke-opacity={0.55 - i * 0.08}
                stroke-width="1.4"
                stroke-dasharray="{4 + i} {22 + i * 6}"
                stroke-linecap="round"
                transform="translate(0 {offset})"
                class="current"
                style:animation-duration="{2.6 + i * 0.7}s"
              />
            {/each}
          </g>
        </g>

        {#each channel.stations as station, index (index)}
          <circle
            cx={station.dot.x}
            cy={station.dot.y}
            r="5"
            class={[
              "transition-[fill] duration-500",
              {
                "fill-gold": progress >= station.t,
                "fill-tile": progress < station.t,
              },
            ]}
            stroke="#18204a"
            stroke-width="2"
          />
        {/each}

        <g transform="translate({boat.x} {boat.y})">
          <g class="bob">
            <image
              href="/figures/grand.webp"
              x="-19"
              y="-62"
              width="38"
              height="55.3"
            />
            <path
              d="M-34 -12H34Q30 6 0 8Q-30 6 -34 -12Z"
              fill="#7a4a2b"
              stroke="#4a2a16"
              stroke-width="2"
            />
            <path d="M-31 -8H31" stroke="#d9a43b" stroke-width="2.4" />
            <path
              d="M34 -12q8 -8 6 -20"
              stroke="#4a2a16"
              stroke-width="3"
              fill="none"
              stroke-linecap="round"
            />
          </g>
        </g>
      </svg>

      {#each channel.stations as station, index (index)}
        {const name = $derived(names[index])}
        {#if name != null}
          <div
            class={[
              "station absolute w-max max-w-[44vw]",
              {
                lit: progress >= station.t,
                "text-center": map === WIDE,
                "max-w-[60vw]": map === TALL,
              },
            ]}
            style:left="{(station.x / map.width) * 100}%"
            style:top="{(station.y / map.height) * 100}%"
            style:transform={station.side}
          >
            <span
              class="script block font-display text-[clamp(22px,2.6vw,34px)] leading-tight"
              lang={name.lang}
              dir={name.lang === "ar" || name.lang === "he" ? "rtl" : "ltr"}
              >{name.script}</span
            >
            <span
              class="mt-0.5 block text-[13px] leading-snug font-medium text-ink/65"
            >
              {#if name.reading != null}<i lang={name.lang}>{name.reading}</i
                >{", "}{/if}{name.tongue}
            </span>
          </div>
        {/if}
      {/each}
    </div>

    <p
      class="mx-auto mt-14 max-w-[52ch] text-center text-[15px] leading-relaxed text-ink/65 italic"
    >
      {m.maker_river_signs()}
    </p>
  </div>
</section>

<section
  class="relative bg-linear-to-b from-[#1d2160] to-lapis px-5 pt-24 pb-28 text-tile"
>
  <div class="mx-auto max-w-6xl">
    <h2
      class="extrude font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.maker_work_title()}
    </h2>
    <ul class="mt-12 grid gap-5 sm:grid-cols-2">
      {#each work as item, index (item.id)}
        <li>
          <a
            href="{SITE}/#{item.id}"
            target="_blank"
            rel="noreferrer external"
            class={[
              "group relative block h-full overflow-hidden rounded-[22px] bg-tile p-6 pt-10 text-ink shadow-[inset_0_-5px_0_#d9a43b,0_40px_60px_-40px_rgb(0_0_0/0.9)] transition-[translate,rotate] duration-300 hover:-translate-y-1",
              {
                "hover:-rotate-1": index % 2 === 0,
                "hover:rotate-1": index % 2 === 1,
              },
            ]}
          >
            <svg class="absolute inset-x-0 top-0 h-4 w-full" aria-hidden="true">
              <rect width="100%" height="100%" fill="url(#maker-tiles)" />
            </svg>
            <span
              class="block font-display text-[clamp(26px,2.6vw,32px)] leading-tight text-cobalt"
              >{item.name}</span
            >
            <span class="mt-3 block text-[16px] leading-relaxed text-ink/80"
              >{item.text}</span
            >
          </a>
        </li>
      {/each}
    </ul>

    <div class="mt-16 flex flex-col items-center gap-10 text-center">
      <a
        href={SITE}
        target="_blank"
        rel="noreferrer external"
        class="inline-flex min-h-14 items-center gap-2.5 rounded-2xl border-b-[5px] border-[#a87a22] bg-gold px-7 text-[17px] font-semibold text-ink shadow-[0_14px_30px_-12px_rgb(217_164_59/0.7)] transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2"
      >
        {m.maker_more()}
      </a>
      <p class="max-w-[60ch] text-[14px] leading-relaxed text-tile/60">
        {shahmaranBefore}<a
          href="https://www.ceyhun.info/"
          target="_blank"
          rel="noreferrer external"
          class="font-medium text-tile/85 underline decoration-gold/50 underline-offset-2 hover:text-tile hover:decoration-gold"
          >Ceyhun</a
        >{shahmaranAfter}
      </p>
    </div>
  </div>
</section>

<style>
  .layer {
    grid-area: 1 / 1;
    text-wrap: balance;
    transition:
      opacity 0.5s,
      filter 0.5s,
      clip-path 1s var(--ease-quill);
  }

  .source {
    opacity: 0;
    filter: blur(4px);
  }

  .draft {
    clip-path: inset(-20% 100% -30% -5%);
    color: #fff3c4;
    text-decoration: underline dotted rgb(224 172 62 / 0.95);
    text-decoration-thickness: 0.06em;
    text-underline-offset: 0.14em;
  }

  .draft[dir="rtl"] {
    clip-path: inset(-20% -5% -30% 100%);
  }

  .refined {
    pointer-events: none;
    opacity: 0;
  }

  [data-stage="source"] .source {
    opacity: 1;
    filter: none;
  }

  [data-stage="draft"] .draft {
    clip-path: inset(-20% -5% -30% -5%);
  }

  [data-stage="refined"] .draft {
    opacity: 0;
    filter: blur(4px);
    clip-path: inset(-20% -5% -30% -5%);
  }

  [data-stage="refined"] .refined {
    pointer-events: auto;
    opacity: 1;
  }

  [data-stage="refined"] .letter {
    animation: settle 0.9s calc(var(--n) * 0.05s) cubic-bezier(0.2, 0.8, 0.2, 1)
      both;
  }

  [data-stage="refined"] .letter.wave {
    animation: wave 0.7s calc(var(--n) * 0.045s) ease-in-out both;
  }

  @keyframes settle {
    from {
      opacity: 0;
      translate: 0 0.25em;
      color: #39c9be;
      filter: blur(6px);
    }
    55% {
      color: #fff3c4;
    }
  }

  @keyframes wave {
    40% {
      translate: 0 -0.16em;
      color: #d9a43b;
    }
  }

  .badge {
    box-shadow:
      inset 0 -4px 0 rgb(15 22 54 / 0.35),
      0 12px 24px -10px rgb(0 0 0 / 0.6);
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

  .note {
    animation: rise 0.5s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 8px;
    }
  }

  .arch .photo {
    transform-box: fill-box;
    transform-origin: center;
    transition: scale 0.7s;
  }

  .arch:hover .photo {
    scale: 1.05;
  }

  .crescent {
    transform-box: fill-box;
    transform-origin: center;
    animation: glint 6s ease-in-out infinite;
  }

  @keyframes glint {
    50% {
      filter: brightness(1.35);
    }
  }

  .shahmaran {
    filter: drop-shadow(0 10px 14px rgb(15 22 54 / 0.55));
  }

  .star {
    animation: twinkle 3.2s ease-in-out infinite;
  }

  @keyframes twinkle {
    50% {
      opacity: 0.2;
      scale: 0.6;
    }
  }

  .current {
    animation: current linear infinite;
  }

  @keyframes current {
    to {
      stroke-dashoffset: -120;
    }
  }

  .bob {
    animation: bob 2.4s ease-in-out infinite;
  }

  @keyframes bob {
    50% {
      translate: 0 -3px;
      rotate: -2deg;
    }
  }

  .station {
    transition:
      color 0.5s,
      scale 0.5s;
  }

  .station .script {
    color: rgb(24 32 74 / 0.45);
    transition: color 0.6s;
  }

  .station.lit .script {
    color: #18204a;
    animation: lit 0.9s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  @keyframes lit {
    from {
      color: #d9a43b;
      scale: 0.8;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .layer,
    .progress circle {
      transition: none;
    }

    .star,
    .current,
    .bob,
    .crescent,
    .note,
    .station.lit .script,
    [data-stage="refined"] .letter {
      animation: none;
    }
  }
</style>
