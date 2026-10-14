<script lang="ts">
  import { locales as names } from "@dragoman/brand/locales";
  import Logo from "@dragoman/brand/logo.svelte";
  import { onMount } from "svelte";
  import { on } from "svelte/events";
  import { detect } from "#lib/agent.ts";
  import Brand from "#lib/brand.svelte";
  import Browser from "#lib/browser.svelte";
  import Cast from "#lib/cast.svelte";
  import Emblem from "#lib/emblem.svelte";
  import Install from "#lib/install.svelte";
  import { m } from "#lib/messages.ts";
  import Page from "#lib/page.svelte";
  import { pages as all } from "#lib/pages.ts";
  import { getLocale, locales, localizeHref } from "#lib/paraglide/runtime.js";
  import { listings } from "#lib/stores.ts";
  import Tenets from "#lib/tenets.svelte";

  const locale = getLocale();
  const language = names[locale];
  const pages = all.filter((page) => page.lang !== locale);
  const characters = [
    "grand",
    "envoy",
    "apprentice",
    "scholar",
    "kira",
    "calligrapher",
  ] as const;
  const dragomans = [
    [m.character_grand(), m.character_grand_detail()],
    [m.character_envoy(), m.character_envoy_detail()],
    [m.character_apprentice(), m.character_apprentice_detail()],
    [m.character_scholar(), m.character_scholar_detail()],
    [m.character_kira(), m.character_kira_detail()],
    [m.character_calligrapher(), m.character_calligrapher_detail()],
  ] as const;
  const providers = [
    ["anthropic", "Anthropic"],
    ["openai", "OpenAI"],
    ["gemini", "Google Gemini"],
    ["openrouter", "OpenRouter"],
    ["mistral", "Mistral"],
    ["deepseek", "DeepSeek"],
    ["groq", "Groq"],
    ["xai", "xAI"],
    ["ollama", "Ollama"],
    ["lmstudio", "LM Studio"],
  ] as const;
  const steps = [
    [m.step_open(), m.step_open_detail()],
    [m.site_step_draft(), m.site_step_draft_detail()],
    [m.site_step_refine(), m.site_step_refine_detail()],
    [m.site_step_hover(), m.site_step_hover_detail()],
  ] as const;
  const devices = [
    {
      id: "desktop",
      title: m.devices_computer(),
      browsers: [
        {
          mark: "Chrome",
          name: m.docs_tab_chromium(),
          detail: m.docs_install_chromium(),
          listings: [listings.chrome, listings.edge],
        },
        {
          mark: "Firefox",
          name: "Firefox",
          detail: m.devices_firefox(),
          listings: [listings.firefox],
        },
        {
          mark: "Safari",
          name: "Safari",
          detail: m.devices_mac(),
          listings: [listings.safari],
        },
      ],
    },
    {
      id: "android",
      title: m.devices_android(),
      browsers: [
        {
          mark: "Firefox",
          name: "Firefox",
          detail: m.chrome_android_note(),
          listings: [listings.firefox],
        },
      ],
    },
    {
      id: "iphone",
      title: m.devices_ios(),
      browsers: [
        {
          mark: "Safari",
          name: "Safari",
          detail: m.devices_ios_detail(),
          listings: [listings.safari],
        },
      ],
    },
  ] as const;
  const greetings = [
    ["Merhaba!", "tr"],
    ["Bonjour !", "fr"],
    ["¡Hola!", "es"],
    ["Ciao!", "it"],
    ["Hallo!", "de"],
    ["こんにちは！", "ja"],
    ["مرحبا!", "ar"],
    ["Привет!", "ru"],
    ["你好！", "zh"],
    ["안녕하세요!", "ko"],
    ["Olá!", "pt"],
    ["Γεια σας!", "el"],
    ["שלום!", "he"],
    ["नमस्ते!", "hi"],
    ["Jambo!", "sw"],
    ["Hej!", "sv"],
    ["Sawubona!", "zu"],
    ["Xin chào!", "vi"],
  ] as const;
  const glyphs = [
    ["あ", "ja"],
    ["ж", "ru"],
    ["ع", "ar"],
    ["ß", "de"],
    ["अ", "hi"],
    ["Ω", "el"],
    ["文", "zh"],
    ["ñ", "es"],
    ["ש", "he"],
    ["ç", "tr"],
    ["한", "ko"],
    ["ก", "th"],
    ["ø", "da"],
    ["ک", "fa"],
  ] as const;
  const rows = [0, 1, 2].map((row) =>
    locales.filter((_, index) => index % 3 === row),
  );

  let heroFrame = $state<HTMLElement>();
  let heroCycle = $state(0);
  let heroStage = $state<"source" | "draft" | "refined">("source");
  let heroHover = $state(false);
  let heroCursor = $state({ x: 115, y: 80, pressed: false });
  const heroPage = $derived(pages[heroCycle % pages.length] ?? all[0]);
  const heroCharacter = $derived(
    characters[heroCycle % characters.length] ?? "grand",
  );

  let story = $state<HTMLElement>();
  let storyFrame = $state<HTMLElement>();
  let storyStep = $state(0);
  let isStoryPlaying = $state(true);
  let isStoryInView = $state(false);
  let isStoryPopup = $state(false);
  let isStoryPressed = $state(false);
  let storyCursor = $state({ x: 115, y: 30, pressed: false });
  const storyPage = pages[1 % pages.length] ?? all[0];
  const storyDurations = [3600, 3600, 3600, 4800];
  const storyStage = $derived(
    storyStep === 0 ? "source" : storyStep === 1 ? "draft" : "refined",
  );

  let deviceStage = $state<"source" | "draft" | "refined">("source");

  let post = $state<HTMLElement>();
  let pigeon = $state<HTMLElement>();
  let hit = $state(-1);
  let isCarrying = $state(true);

  let isCastNear = $state(false);
  let bow = $state({ index: 0, count: 0 });
  let places = $state<Array<{ x: number; y: number }>>([]);
  let greeting = $state<{
    index: number;
    text: string;
    lang: string;
    key: number;
  } | null>(null);

  let finale = $state<HTMLElement>();
  let sky = $state<HTMLCanvasElement>();
  let burst: ((x: number, y: number) => void) | null = null;

  let film = $state<HTMLDialogElement>();
  let filmShape = $state<"" | "landscape" | "portrait">("");

  let audio: AudioContext | null = null;
  let greetingTimer = 0;

  const forms = [
    { script: "targumannu", lang: "akk", tongue: m.maker_tongue_akk() },
    { script: "targemana", lang: "arc", tongue: m.meaning_tongue_arc() },
    {
      script: "ترجمان",
      lang: "ar",
      reading: "tarjumān",
      tongue: m.maker_tongue_ar(),
    },
    { script: "tercüman", lang: "tr", tongue: m.maker_tongue_tr() },
    {
      script: "δραγουμάνος",
      lang: "el",
      reading: "dragoumanos",
      tongue: m.meaning_tongue_gkm(),
    },
    { script: "dragumannus", lang: "la", tongue: m.meaning_tongue_la() },
    { script: "drugeman", lang: "fro", tongue: m.meaning_tongue_fro() },
    { script: "dragoman", lang: "en", tongue: m.meaning_now() },
  ];
  const facts = [
    m.meaning_fact_porte(),
    m.meaning_fact_tax(),
    m.meaning_fact_office(),
  ];
  let form = $state(0);
  let chosen = $state(false);
  let held = $state(false);

  $effect(() => {
    const index = form;
    if (
      chosen ||
      held ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setTimeout(() => {
      form = (index + 1) % forms.length;
    }, 2600);
    return () => {
      clearTimeout(timer);
    };
  });

  const aim = (frame: HTMLElement | undefined, target: string) => {
    const element = frame?.querySelector<HTMLElement>(
      `[data-target="${target}"]`,
    );
    if (frame == null || element == null) return { x: 115, y: 50 };
    let x = element.offsetWidth * 0.55;
    let y = element.offsetHeight * 0.6;
    let node: HTMLElement | null = element;
    while (node != null && node !== frame) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return {
      x: Math.min(94, (x / frame.offsetWidth) * 100),
      y: Math.min(94, (y / frame.offsetHeight) * 100),
    };
  };

  $effect(() => {
    const step = storyStep;
    const frame = storyFrame;
    if (!isStoryInView || frame == null) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const point = (target: string, pressed = false) => {
      storyCursor = { ...aim(frame, target), pressed };
    };
    isStoryPopup = false;
    isStoryPressed = false;
    if (step === 0) {
      storyCursor = { x: 112, y: 92, pressed: false };
      for (const [ms, change] of [
        [300, () => point("extension")],
        [
          1200,
          () => {
            point("extension", true);
            isStoryPressed = true;
          },
        ],
        [
          1400,
          () => {
            point("extension");
            isStoryPopup = true;
          },
        ],
        [1900, () => point("translate")],
        [2900, () => point("translate", true)],
        [3100, () => point("translate")],
      ] as const)
        timers.push(setTimeout(change, ms));
    } else point(step === 3 ? "lead" : "badge");
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  });

  const greet = (index: number) => {
    const [text, lang] =
      greetings[Math.floor(Math.random() * greetings.length)] ?? greetings[0];
    bow = { index, count: bow.count + 1 };
    greeting = { index, text, lang, key: bow.count };
    clearTimeout(greetingTimer);
    greetingTimer = window.setTimeout(() => (greeting = null), 2400);
    audio ??= new AudioContext();
    const base = [150, 240, 330, 200, 300, 260][index] ?? 260;
    for (
      let syllable = 0;
      syllable < 6 + Math.floor(Math.random() * 4);
      syllable++
    ) {
      const at = audio.currentTime + syllable * 0.09;
      const voice = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      voice.type = "square";
      voice.frequency.setValueAtTime(base * (0.85 + Math.random() * 0.5), at);
      voice.frequency.exponentialRampToValueAtTime(base * 0.8, at + 0.08);
      filter.type = "bandpass";
      filter.frequency.value = 700 + Math.random() * 1100;
      filter.Q.value = 3;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.075);
      voice.connect(filter).connect(gain).connect(audio.destination);
      voice.start(at);
      voice.stop(at + 0.09);
    }
  };

  let agent = $state<ReturnType<typeof detect> | null>(null);
  const here = $derived(
    agent == null
      ? null
      : !agent.isPhone
        ? "desktop"
        : agent.family === "safari"
          ? "iphone"
          : "android",
  );

  const openFilm = () => {
    filmShape = matchMedia("(max-width: 767px) and (orientation: portrait)")
      .matches
      ? "portrait"
      : "landscape";
    film?.showModal();
  };

  onMount(() => {
    agent = detect();
    const lifetime = new AbortController();
    const isCalm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = async (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        on(lifetime.signal, "abort", () => clearTimeout(timer));
      });

    const videos =
      document.querySelectorAll<HTMLVideoElement>("video[data-loop]");
    const playing = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          video.muted = true;
          if (entry.isIntersecting && !isCalm)
            void video.play().catch(() => {});
          else video.pause();
        }
      },
      { rootMargin: "200px" },
    );
    const watch = () => {
      for (const video of videos) playing.observe(video);
    };
    if (document.readyState === "complete") watch();
    else
      on(lifetime.signal, "abort", on(window, "load", watch, { once: true }));

    void (async () => {
      for (let cycle = 0; !lifetime.signal.aborted; cycle++) {
        heroCycle = cycle;
        heroStage = "source";
        heroHover = false;
        heroCursor = { x: 112, y: 92, pressed: false };
        await wait(1500);
        heroCursor = { ...aim(heroFrame, "badge"), pressed: false };
        await wait(1000);
        heroCursor.pressed = true;
        await wait(200);
        heroCursor.pressed = false;
        heroStage = "draft";
        await wait(2300);
        heroStage = "refined";
        await wait(2100);
        heroCursor = { ...aim(heroFrame, "lead"), pressed: false };
        await wait(800);
        heroHover = true;
        await wait(2800);
        heroHover = false;
        heroCursor = { x: 112, y: 92, pressed: false };
        await wait(700);
      }
    })();

    void (async () => {
      const order = ["source", "draft", "refined"] as const;
      for (let tick = 1; !lifetime.signal.aborted; tick++) {
        await wait(tick % 3 === 0 ? 3600 : 2400);
        deviceStage = order[tick % 3] ?? "source";
      }
    })();

    if (isCalm) isStoryPlaying = false;
    const storyWatch = new IntersectionObserver(
      ([entry]) => {
        isStoryInView = entry?.isIntersecting ?? false;
      },
      { rootMargin: "-30% 0px" },
    );
    if (story != null) storyWatch.observe(story);

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting === true) {
          isCastNear = true;
          near.disconnect();
        }
      },
      { rootMargin: "800px" },
    );
    const cast = document.querySelector("#cast");
    if (cast != null) near.observe(cast);

    const postView = { isVisible: false };
    const postWatch = new IntersectionObserver(([entry]) => {
      postView.isVisible = entry?.isIntersecting ?? false;
    });
    if (post != null) postWatch.observe(post);
    if (!isCalm)
      void (async () => {
        while (!lifetime.signal.aborted) {
          await wait(1200);
          if (!postView.isVisible || post == null || pigeon == null) continue;
          const cubbies = [
            ...post.querySelectorAll<HTMLElement>("[data-cubby]"),
          ];
          const index = Math.floor(Math.random() * cubbies.length);
          const cubby = cubbies[index];
          if (cubby == null) continue;
          const area = post.getBoundingClientRect();
          const box = cubby.getBoundingClientRect();
          const x = box.left - area.left + box.width / 2 - 36;
          const y = box.top - area.top + box.height / 2 - 52;
          isCarrying = true;
          await pigeon.animate(
            [
              { transform: `translate(-120px, ${y - 220}px) rotate(-8deg)` },
              {
                transform: `translate(${x * 0.6}px, ${y - 90}px) rotate(4deg)`,
                offset: 0.7,
              },
              { transform: `translate(${x}px, ${y}px) rotate(0deg)` },
            ],
            { duration: 2000, easing: "ease-out", fill: "forwards" },
          ).finished;
          isCarrying = false;
          hit = index;
          await wait(500);
          await pigeon.animate(
            [
              { transform: `translate(${x}px, ${y}px) rotate(0deg)` },
              {
                transform: `translate(${area.width + 140}px, ${y - 320}px) rotate(-14deg)`,
              },
            ],
            { duration: 1700, easing: "ease-in", fill: "forwards" },
          ).finished;
          hit = -1;
          await wait(1800);
        }
      })();

    const context = sky?.getContext("2d");
    let fireworks = 0;
    if (sky != null && context != null && finale != null) {
      const canvas = sky;
      const area = finale;
      const palette = [
        "#ffd27a",
        "#ff8a5c",
        "#4fe0d2",
        "#f6f5ef",
        "#ffb46b",
        "#9fb6ff",
      ];
      const sparks: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        span: number;
        color: string;
      }> = [];
      const rockets: Array<{
        x: number;
        y: number;
        vy: number;
        top: number;
        color: string;
      }> = [];
      const ratio = Math.min(devicePixelRatio, 2);
      const size = () => {
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
      };
      size();
      const sizing = new ResizeObserver(size);
      sizing.observe(canvas);
      burst = (x, y) => {
        const color =
          palette[Math.floor(Math.random() * palette.length)] ?? "#ffd27a";
        const twin =
          palette[Math.floor(Math.random() * palette.length)] ?? color;
        const count = 70 + Math.floor(Math.random() * 40);
        for (let index = 0; index < count; index++) {
          const angle = (index / count) * Math.PI * 2 + Math.random() * 0.1;
          const speed = (1.6 + Math.random() * 2.6) * ratio;
          sparks.push({
            x: x * ratio,
            y: y * ratio,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            span: 60 + Math.random() * 50,
            color: index % 3 === 0 ? twin : color,
          });
        }
      };
      const launch = () => {
        rockets.push({
          x: (0.15 + Math.random() * 0.7) * canvas.width,
          y: canvas.height,
          vy: -(9 + Math.random() * 3) * ratio,
          top: (0.12 + Math.random() * 0.3) * canvas.height,
          color:
            palette[Math.floor(Math.random() * palette.length)] ?? "#ffd27a",
        });
      };
      let isVisible = false;
      let next = 0;
      const draw = (now: number) => {
        fireworks = requestAnimationFrame(draw);
        if (!isVisible) return;
        if (!isCalm && now > next) {
          launch();
          next = now + 1100 + Math.random() * 1500;
        }
        context.globalCompositeOperation = "destination-out";
        context.fillStyle = "rgb(0 0 0 / 0.2)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "lighter";
        let alive = 0;
        for (const rocket of rockets) {
          rocket.y += rocket.vy;
          rocket.vy *= 0.985;
          context.fillStyle = rocket.color;
          context.fillRect(rocket.x - ratio, rocket.y, 2 * ratio, 6 * ratio);
          if (rocket.y <= rocket.top)
            burst?.(rocket.x / ratio, rocket.y / ratio);
          else rockets[alive++] = rocket;
        }
        rockets.length = alive;
        alive = 0;
        for (const spark of sparks) {
          spark.life++;
          spark.vx *= 0.975;
          spark.vy = spark.vy * 0.975 + 0.035 * ratio;
          spark.x += spark.vx;
          spark.y += spark.vy;
          const fade = 1 - spark.life / spark.span;
          if (fade <= 0) continue;
          context.globalAlpha = fade * (0.7 + Math.random() * 0.3);
          context.fillStyle = spark.color;
          context.beginPath();
          context.arc(
            spark.x,
            spark.y,
            1.6 * ratio * (0.4 + fade),
            0,
            Math.PI * 2,
          );
          context.fill();
          sparks[alive++] = spark;
        }
        sparks.length = alive;
        context.globalAlpha = 1;
      };
      fireworks = requestAnimationFrame(draw);
      const watch = new IntersectionObserver(([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
      });
      watch.observe(area);
      on(lifetime.signal, "abort", () => {
        sizing.disconnect();
        watch.disconnect();
      });
    }

    return () => {
      lifetime.abort();
      playing.disconnect();
      near.disconnect();
      postWatch.disconnect();
      storyWatch.disconnect();
      cancelAnimationFrame(fireworks);
      clearTimeout(greetingTimer);
      void audio?.close();
    };
  });
</script>

<svelte:head>
  <title>{m.site_title()}</title>
</svelte:head>

{#snippet loop(shot: "day" | "night")}
  <div class="poster {shot} absolute inset-0 -z-20" aria-hidden="true">
    <video
      data-loop
      class="size-full object-cover"
      muted
      loop
      playsinline
      preload="none"
    >
      <source
        media="(orientation: portrait)"
        src="/loops/{shot}-tall.webm"
        type={'video/webm; codecs="av01.0.08M.08"'}
      />
      <source
        media="(orientation: portrait)"
        src="/loops/{shot}-tall.mp4"
        type="video/mp4"
      />
      <source
        src="/loops/{shot}-wide.webm"
        type={'video/webm; codecs="av01.0.12M.08"'}
      />
      <source src="/loops/{shot}-wide.mp4" type="video/mp4" />
    </video>
  </div>
{/snippet}

{#snippet cursor(point: { x: number; y: number; pressed: boolean })}
  <span
    class="cursor pointer-events-none absolute z-30 block w-[clamp(18px,4.5%,30px)]"
    class:pressed={point.pressed}
    style:left="{point.x}%"
    style:top="{point.y}%"
    aria-hidden="true"
  >
    <span class="ripple"></span>
    <svg
      viewBox="0 0 24 28"
      class="w-full drop-shadow-[0_4px_6px_rgb(15_22_54/0.35)]"
    >
      <path
        d="M2 2v20l5.5-5 3.6 8.6 3.8-1.6-3.6-8.4H19z"
        fill="#fff"
        stroke="#18204a"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
  </span>
{/snippet}

{#snippet tiles(id: string)}
  <svg class="absolute inset-0 size-full" aria-hidden="true">
    <defs>
      <pattern {id} width="30" height="30" patternUnits="userSpaceOnUse">
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
    <rect width="100%" height="100%" fill="url(#{id})" />
  </svg>
{/snippet}

{#snippet plinth(id: string)}
  <div class="relative mx-auto h-14 w-[88%]" aria-hidden="true">
    <div
      class="absolute inset-x-0 top-0 bottom-0 overflow-hidden rounded-b-lg shadow-[0_30px_40px_-24px_rgb(24_32_74/0.6)]"
    >
      {@render tiles(id)}
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent to-[#18204a]/25"
      ></div>
    </div>
    <div
      class="absolute -inset-x-2 -top-2 h-4 rounded-md bg-[#fdfbf5] shadow-[inset_0_-3px_0_#d9a43b]"
    ></div>
  </div>
{/snippet}

{#snippet girih(id: string)}
  <svg
    class="pointer-events-none absolute inset-0 size-full opacity-[0.08]"
    aria-hidden="true"
  >
    <defs>
      <pattern {id} width="56" height="56" patternUnits="userSpaceOnUse">
        <path
          d="M28 4 34.5 21.5 52 28 34.5 34.5 28 52 21.5 34.5 4 28 21.5 21.5Z"
          fill="none"
          stroke="#f6f5ef"
          stroke-width="1.2"
        />
        <circle
          cx="0"
          cy="0"
          r="6"
          fill="none"
          stroke="#f6f5ef"
          stroke-width="1.2"
        />
        <circle
          cx="56"
          cy="56"
          r="6"
          fill="none"
          stroke="#f6f5ef"
          stroke-width="1.2"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#{id})" />
  </svg>
{/snippet}

{#snippet watch()}
  <button
    type="button"
    class="inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-ink/10 px-5 text-[17px] font-semibold text-current ring-1 ring-current/25 backdrop-blur-sm transition-colors hover:bg-ink/20"
    onclick={openFilm}
  >
    <span class="grid size-8 place-items-center rounded-full bg-gold text-ink">
      <svg viewBox="0 0 12 12" class="ms-0.5 size-3" aria-hidden="true">
        <path d="M2 1.2v9.6L10.4 6z" fill="currentColor" />
      </svg>
    </span>
    {m.watch_film()}
  </button>
{/snippet}

<section
  class="hero relative isolate flex min-h-svh flex-col overflow-hidden"
  role="presentation"
  onpointermove={(event) => {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--px",
      String((event.clientX - box.left) / box.width - 0.5),
    );
    event.currentTarget.style.setProperty(
      "--py",
      String((event.clientY - box.top) / box.height - 0.5),
    );
  }}
>
  {@render loop("day")}
  <div class="rays absolute inset-0 -z-10" aria-hidden="true"></div>
  <div class="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    {#each Array.from({ length: 28 }, (_, index) => index) as mote (mote)}
      <span
        class="mote"
        style:left="{(mote * 37) % 100}%"
        style:top="{(mote * 53) % 100}%"
        style:--size="{2 + (mote % 4)}px"
        style:--time="{9 + ((mote * 7) % 9)}s"
        style:--delay="{-((mote * 1.7) % 12)}s"
      ></span>
    {/each}
  </div>
  <div
    class="absolute inset-x-0 bottom-0 -z-10 h-80 bg-linear-to-b from-transparent to-[#f8ecdc] lg:h-48"
  ></div>
  <div class="haze absolute inset-0 -z-10" aria-hidden="true"></div>

  <div
    class="mx-auto grid w-full max-w-7xl flex-1 items-center gap-x-14 px-5 pt-28 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:pt-24"
  >
    <div class="contents text-ink lg:block">
      <h1
        class="extrude-ink font-display text-[clamp(50px,7.4vw,108px)] leading-[0.95] text-balance"
      >
        {#each m.site_hero().split(" ") as word, index (index)}
          <span class="word" style:--i={index}>{word}</span>{" "}
        {/each}
      </h1>
      <p
        class="rise mt-6 max-w-[34rem] text-[clamp(17px,1.5vw,20px)] leading-relaxed font-medium text-ink lg:mt-7"
      >
        <Brand text={m.site_lead()} />
      </p>
      <div class="order-4 mt-2 text-ink lg:mt-9">
        <div class="rise flex flex-wrap items-center gap-3 [--delay:0.15s]">
          <Install />
          {@render watch()}
        </div>
        <p class="rise mt-5 text-[15px] text-ink/75 [--delay:0.25s]">
          {m.site_note()}
        </p>
      </div>
    </div>

    <figure class="relative order-3 mx-auto my-14 w-full max-w-[640px] lg:my-0">
      <div class="bob">
        <div class="tilt relative" bind:this={heroFrame}>
          {#key heroCharacter}
            <img
              src="/characters/{heroCharacter}.webp"
              alt=""
              class="peek pointer-events-none absolute end-[6%] bottom-full w-[24%] max-w-none translate-y-[34%]"
            />
          {/key}
          <div
            class="relative z-10 aspect-[4/5] drop-shadow-[0_40px_50px_rgb(15_22_54/0.45)] sm:aspect-[16/13]"
          >
            <Browser kind="desktop" page={heroPage}>
              <Page
                page={heroPage}
                stage={heroStage}
                character={heroCharacter}
                hover={heroHover}
              />
            </Browser>
          </div>
          {@render cursor(heroCursor)}
        </div>
        <div
          class="glint absolute -bottom-10 left-1/2 -z-10 h-16 w-[90%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_236_190/0.55),transparent)]"
          aria-hidden="true"
        ></div>
      </div>
      <figcaption
        class="relative mx-auto mt-9 flex w-fit items-end gap-2 font-medium max-lg:rounded-full max-lg:bg-ink max-lg:px-4 max-lg:py-2 max-lg:text-tile max-lg:shadow-[0_14px_28px_-14px_rgb(15_22_54/0.7)] lg:absolute lg:start-[-6%] lg:top-full lg:mx-0 lg:mt-6 lg:text-tile lg:[text-shadow:0_1px_12px_rgb(15_22_54/0.6)]"
      >
        <span
          class="absolute bottom-full left-1/2 size-0 -translate-x-1/2 border-x-[7px] border-b-[7px] border-x-transparent border-b-ink lg:hidden"
          aria-hidden="true"
        ></span>
        <svg
          viewBox="0 0 60 40"
          class="w-12 shrink-0 max-lg:hidden rtl:-scale-x-100"
          aria-hidden="true"
        >
          <path
            d="M4 34c10 2 26-2 34-12 5-6 7-12 8-18M46 4l-7 6M46 4l5 8"
            stroke="currentColor"
            stroke-width="2.4"
            fill="none"
            stroke-linecap="round"
          />
        </svg>
        <span class="text-[15px] italic max-lg:text-[14px]"
          >{m.demo_label({ language })}</span
        >
      </figcaption>
    </figure>
  </div>
</section>

<section
  id="how"
  bind:this={story}
  class="relative scroll-mt-0 overflow-hidden bg-linear-to-b from-[#f8ecdc] to-[#f6e4de] px-5 py-24 text-ink lg:py-32"
>
  <div
    class="pointer-events-none absolute inset-0 mask-b-from-80%"
    aria-hidden="true"
  >
    {#each glyphs as [glyph, lang], index (index)}
      <span
        class="glyph absolute font-display"
        {lang}
        style:left="{(index * 41 + 7) % 96}%"
        style:top="{(index * 29 + 11) % 92}%"
        style:--depth={0.4 + (index % 4) * 0.35}
        style:--turn="{((index * 23) % 40) - 20}deg"
        style:--delay="{-index * 1.3}s"
        style:color={["#2347a8", "#d9a43b", "#c8321f", "#1e9c94"][index % 4]}
        >{glyph}</span
      >
    {/each}
  </div>
  <div
    class="short:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] relative mx-auto grid w-full max-w-7xl items-center gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-x-16"
  >
    <div class="short:block contents lg:block">
      <h2
        class="extrude-ink short:text-[30px] font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
      >
        {m.story_title()}
      </h2>
      <p
        class="short:hidden max-w-md text-[18px] text-ink/75 max-lg:mb-4 lg:mt-4 lg:block"
      >
        {m.story_detail()}
      </p>
      <div class="short:mt-6 order-4 flex items-center gap-3 lg:mt-10">
        <div
          role="tablist"
          aria-label={m.story_title()}
          tabindex="-1"
          class="relative flex flex-1 items-center justify-between"
          onkeydown={(event: KeyboardEvent) => {
            const list = event.currentTarget as HTMLElement;
            const isRtl = getComputedStyle(list).direction === "rtl";
            const moves: Record<string, number> = {
              Home: 0,
              End: steps.length - 1,
              [isRtl ? "ArrowLeft" : "ArrowRight"]:
                (storyStep + 1) % steps.length,
              [isRtl ? "ArrowRight" : "ArrowLeft"]:
                (storyStep + steps.length - 1) % steps.length,
            };
            const next = moves[event.key];
            if (next == null) return;
            event.preventDefault();
            storyStep = next;
            isStoryPlaying = false;
            list.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
          }}
        >
          <span
            class="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-ink/10"
            aria-hidden="true"
          >
            <span
              class="fill block size-full origin-left rounded-full bg-ink/30 rtl:origin-right"
              style:scale="{storyStep / (steps.length - 1)} 1"
            ></span>
          </span>
          {#each steps as [title], index (title)}
            {const isActive = $derived(index === storyStep)}
            <button
              type="button"
              role="tab"
              id="story-tab-{index}"
              aria-selected={isActive}
              aria-controls="story-panel-{index}"
              tabindex={isActive ? 0 : -1}
              class={[
                "relative grid size-12 place-items-center rounded-full font-display text-[20px] transition-[background-color,color,scale,box-shadow] duration-300 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-cobalt",
                {
                  "scale-110 text-tile shadow-[0_14px_28px_-14px_rgb(24_32_74/0.7)]":
                    isActive,
                  "bg-cobalt": isActive && index === 0,
                  "bg-gold": isActive && index === 1,
                  "bg-turquoise": isActive && index === 2,
                  "bg-coral": isActive && index === 3,
                },
                {
                  "bg-[#fffaf3] text-ink/55 ring-1 ring-ink/10 hover:text-ink":
                    !isActive,
                },
              ]}
              onclick={() => {
                storyStep = index;
                isStoryPlaying = false;
              }}
            >
              <span aria-hidden="true">{index + 1}</span>
              <span class="sr-only">{title}</span>
              {#if isActive && isStoryPlaying}
                <svg
                  viewBox="0 0 48 48"
                  class="pointer-events-none absolute -inset-1 size-[calc(100%+8px)] -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-dasharray="138.2"
                    stroke-linecap="round"
                    class="progress text-ink/70"
                    style:animation-duration="{storyDurations[index]}ms"
                    style:animation-play-state={isStoryInView
                      ? "running"
                      : "paused"}
                    onanimationend={() => {
                      storyStep = (index + 1) % steps.length;
                    }}
                  />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
          aria-label={isStoryPlaying ? m.story_pause() : m.story_play()}
          title={isStoryPlaying ? m.story_pause() : m.story_play()}
          onclick={() => (isStoryPlaying = !isStoryPlaying)}
        >
          <svg viewBox="0 0 20 20" class="size-5" aria-hidden="true">
            {#if isStoryPlaying}
              <rect
                x="5"
                y="4"
                width="3.4"
                height="12"
                rx="1"
                fill="currentColor"
              />
              <rect
                x="11.6"
                y="4"
                width="3.4"
                height="12"
                rx="1"
                fill="currentColor"
              />
            {:else}
              <path
                d="M6.5 4.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8a.8.8 0 0 0-1.2.7z"
                fill="currentColor"
              />
            {/if}
          </svg>
        </button>
      </div>
      <div class="short:mt-4 order-5 grid lg:mt-6">
        {#each steps as [title, detail], index (title)}
          {const isActive = $derived(index === storyStep)}
          <div
            role="tabpanel"
            id="story-panel-{index}"
            aria-labelledby="story-tab-{index}"
            class={[
              "rounded-3xl bg-white/70 p-5 shadow-[0_20px_40px_-28px_rgb(24_32_74/0.5)] transition-[opacity,translate,visibility] ease-quill [grid-area:1/1] motion-reduce:transition-none",
              {
                "invisible translate-y-2 opacity-0 duration-200": !isActive,
                "delay-100 duration-500": isActive,
              },
            ]}
          >
            <h3 class="text-[clamp(18px,1.7vw,23px)] font-semibold">
              {title}
            </h3>
            <p
              class="mt-1.5 text-[15.5px] leading-relaxed text-ink/75 lg:text-[16px]"
            >
              <Brand text={detail} />
            </p>
          </div>
        {/each}
      </div>
    </div>
    <div
      class="short:max-w-[min(100%,calc((100svh_-_5rem)*1.33))] relative order-3 aspect-[4/4.2] w-full max-w-[min(100%,calc(max(14rem,100svh_-_22rem)*0.95))] justify-self-center sm:aspect-[16/12] sm:max-w-[min(100%,calc(max(14rem,100svh_-_20rem)*1.33))] lg:max-w-[min(100%,calc((100svh_-_6rem)*1.33))]"
      bind:this={storyFrame}
      aria-hidden="true"
    >
      <div class="size-full drop-shadow-[0_40px_60px_rgb(24_32_74/0.3)]">
        <Browser
          kind="desktop"
          page={storyPage}
          popup={isStoryPopup}
          pressed={isStoryPressed}
        >
          <Page
            page={storyPage}
            stage={storyStage}
            character="scholar"
            hover={storyStep === 3}
          />
        </Browser>
      </div>
      {@render cursor(storyCursor)}
    </div>
  </div>
</section>

<Tenets />

<section
  class="relative overflow-x-clip bg-linear-to-b from-[#f6e4de] to-[#ebdff0] px-5 pt-24 pb-32 text-ink"
>
  <div class="mx-auto max-w-7xl">
    <h2
      class="extrude-ink max-w-3xl font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.devices_title()}
    </h2>
    <p class="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink/75">
      <Brand text={m.devices_lead()} />
    </p>
    <div
      class="mt-16 grid grid-cols-2 items-end gap-x-5 gap-y-16 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] lg:gap-x-10"
    >
      {#each [["desktop", 0], ["android", 2], ["iphone", 3]] as const as [kind, offset] (kind)}
        {const page = $derived(pages[offset % pages.length] ?? all[0])}
        <div class={{ "col-span-2 lg:col-span-1": kind === "desktop" }}>
          <div
            class="float mx-auto"
            class:max-w-[220px]={kind !== "desktop"}
            style:--delay="{offset * -1.3}s"
          >
            {#if kind === "desktop"}
              <div
                class="rounded-t-[20px] bg-[#1b1f33] p-[1.4%] shadow-[inset_0_0_0_2px_#3a4060]"
              >
                <div class="aspect-[16/10]">
                  <Browser {kind} {page}>
                    <Page
                      {page}
                      stage={deviceStage}
                      character={characters[offset]}
                    />
                  </Browser>
                </div>
              </div>
              <div
                class="mx-[-5%] h-4 rounded-b-[18px] bg-linear-to-b from-[#c9cede] to-[#8d93ab] shadow-[0_2px_0_#6e7490]"
              ></div>
            {:else}
              <div class="aspect-[9/19]">
                <Browser {kind} {page}>
                  <Page
                    {page}
                    stage={deviceStage}
                    character={characters[offset]}
                  />
                </Browser>
              </div>
            {/if}
          </div>
          <div class="mt-6">{@render plinth(`plinth-${kind}`)}</div>
        </div>
      {/each}
    </div>

    <ul
      class="mt-16 grid gap-4 break-words md:grid-cols-2 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] lg:gap-x-10"
    >
      {#each devices as device (device.id)}
        {const isHere = $derived(here === device.id)}
        <li
          class={[
            "flex flex-col rounded-[26px] bg-white/60 p-6 shadow-[0_24px_40px_-30px_rgb(24_32_74/0.5)] transition-shadow",
            { "md:col-span-2 lg:col-span-1": device.id === "desktop" },
            { "ring-1 ring-white": !isHere, "ring-2 ring-turquoise": isHere },
          ]}
        >
          <h3
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
          >
            <span class="font-display text-[26px] leading-none"
              >{device.title}</span
            >
            {#if isHere}
              <span
                class="rounded-full bg-turquoise px-3 py-1 text-[13px] font-semibold text-ink"
                >{m.devices_here()}</span
              >
            {/if}
          </h3>
          <div
            class={[
              "mt-5 grid flex-1 gap-6",
              {
                "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]":
                  device.browsers.length > 1,
              },
            ]}
          >
            {#each device.browsers as browser (browser.mark)}
              {const order = $derived(
                agent?.name === "Edge"
                  ? browser.listings.toReversed()
                  : browser.listings,
              )}
              <div class="flex flex-col">
                <span class="flex items-center gap-2.5">
                  <Emblem name={browser.mark} class="size-7" />
                  <span class="text-[17px] font-semibold">{browser.name}</span>
                </span>
                <span class="mt-2 text-[14.5px] leading-snug text-ink/65"
                  >{browser.detail}</span
                >
                <span class="mt-auto flex flex-wrap gap-2 pt-4">
                  {#each order as listing (listing.store)}
                    <a
                      href={listing.href}
                      class="inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13.5px] font-medium whitespace-nowrap shadow-[0_1px_0_rgb(24_32_74/0.08)] ring-1 ring-ink/10 transition-[background-color,box-shadow,translate] hover:-translate-y-px hover:bg-tile hover:ring-ink/20"
                    >
                      <Emblem name={listing.mark} class="size-4" />
                      {listing.store}
                    </a>
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  </div>
</section>

<section
  id="models"
  class="relative scroll-mt-0 overflow-hidden bg-[linear-gradient(180deg,#ebdff0_0,#b99acb_9%,#5b4f9f_20%,#2b2d74_38%,#1d2160_100%)] px-5 pt-56 pb-32 text-tile"
>
  <div class="relative mx-auto max-w-7xl" bind:this={post}>
    <div class="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
      <div>
        <h2
          class="extrude font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
        >
          {m.site_models_title()}
        </h2>
        <p class="mt-5 max-w-xl text-[18px] leading-relaxed text-tile/80">
          <Brand text={m.site_models_detail()} />
        </p>
      </div>
      <p
        class="flex max-w-sm items-center gap-3 rounded-2xl bg-tile/10 p-4 text-[15px] text-tile/90 ring-1 ring-tile/15"
      >
        <img
          src="/logo.webp"
          alt=""
          width="32"
          height="32"
          class="size-8 shrink-0"
        />
        {m.site_models_none()}
      </p>
    </div>

    <ul
      class="mt-14 grid grid-cols-2 gap-3 rounded-[26px] bg-[#7a4a2b] p-3 shadow-[inset_0_3px_0_#a8704a,inset_0_-8px_0_#4a2a16,0_50px_90px_-40px_rgb(0_0_0/0.8)] sm:grid-cols-5 sm:gap-4 sm:p-4"
    >
      {#each providers as [id, name], index (id)}
        {const isLocal = $derived(id === "ollama" || id === "lmstudio")}
        <li
          data-cubby
          class="cubby relative flex aspect-[5/4.4] flex-col justify-end rounded-xl bg-[#2a170c] shadow-[inset_0_10px_18px_rgb(0_0_0/0.65)]"
          class:hit={hit === index}
        >
          <span
            class="envelope absolute inset-x-[11%] top-[12%] bottom-[30%] flex flex-col items-center rounded-md bg-[#f3ead6] text-ink shadow-[0_6px_10px_-4px_rgb(0_0_0/0.6)]"
          >
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              class="absolute inset-x-0 top-0 h-[46%] w-full"
              aria-hidden="true"
            >
              <path d="M0 0h100L50 38z" fill="#e6dac0" />
            </svg>
            <span class="relative mt-auto mb-[9%]"
              ><Logo {id} {name} size={24} /></span
            >
            <span
              class="absolute top-[44%] left-1/2 size-5 -translate-1/2 rounded-full bg-coral shadow-[inset_0_-2px_0_#8e2214,0_0_0_2px_#d9a43b]"
              aria-hidden="true"
            ></span>
          </span>
          <span
            class="relative m-[7%] rounded-md bg-linear-to-b from-[#f0c15c] to-[#c48d27] px-2 py-1 text-center text-[12.5px] leading-tight font-semibold text-ink shadow-[inset_0_1px_0_#ffe7a8,0_2px_0_#7a5410] sm:text-[13.5px]"
          >
            {name}
            {#if isLocal}
              <span class="block text-[11.5px] font-medium text-[#0f5f5a]"
                >{m.site_models_local()}</span
              >
            {/if}
          </span>
        </li>
      {/each}
    </ul>

    <div
      bind:this={pigeon}
      class="pigeon pointer-events-none absolute top-0 left-0 z-10 w-[72px]"
      style:transform="translate(-200px, -200px)"
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 56" class="w-full overflow-visible">
        <path d="M14 34c-6 0-12 3-14 6 6 0 10 0 14-2z" fill="#6f7cb0" />
        <ellipse cx="32" cy="34" rx="20" ry="13" fill="#9aa6d6" />
        <path
          d="M24 42c8 4 20 4 26-2"
          stroke="#7d89bd"
          stroke-width="3"
          fill="none"
        />
        <circle cx="50" cy="24" r="9" fill="#9aa6d6" />
        <path
          d="M45 30c3 3 8 3 10 0"
          stroke="#5fc4a0"
          stroke-width="3.4"
          fill="none"
        />
        <path d="M58 23l8 2-8 3z" fill="#d9a43b" />
        <circle cx="52.5" cy="22" r="2" fill="#18204a" />
        <circle cx="53" cy="21.4" r="0.7" fill="#fff" />
        <path
          d="M30 46l-2 7M36 46l1 7"
          stroke="#e2725b"
          stroke-width="2"
          stroke-linecap="round"
        />
        <g class="wing">
          <path d="M22 30c2-16 14-26 26-28-4 10-6 22-12 30z" fill="#b6c0e6" />
          <path
            d="M28 26c4-8 10-14 16-18M31 29c4-6 8-10 13-13"
            stroke="#8792c4"
            stroke-width="1.6"
            fill="none"
          />
        </g>
        {#if isCarrying}
          <g>
            <rect
              x="56"
              y="30"
              width="16"
              height="11"
              rx="1.5"
              fill="#f3ead6"
            />
            <path
              d="M56 30l8 6 8-6"
              stroke="#cdbf9f"
              stroke-width="1.2"
              fill="none"
            />
            <circle cx="64" cy="36" r="2.2" fill="#c8321f" />
          </g>
        {/if}
      </svg>
    </div>
  </div>
</section>

<section
  id="dragoman"
  class="relative isolate scroll-mt-0 overflow-hidden bg-[#1d2160] px-5 py-28 text-tile"
>
  {@render girih("girih-meaning")}
  <div
    class="mx-auto grid max-w-7xl items-center gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
  >
    <div>
      <h2
        class="extrude font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
      >
        {m.meaning_title()}
      </h2>
      <p class="mt-6 max-w-xl text-[18px] leading-relaxed text-tile/80">
        {m.meaning_lead()}
      </p>
      <a
        href="https://en.wikipedia.org/wiki/Dragoman"
        target="_blank"
        rel="noreferrer external"
        class="mt-10 inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-tile/10 px-5 text-[16px] font-semibold ring-1 ring-tile/25 transition-colors hover:bg-tile/20"
      >
        {m.meaning_more()}
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
    </div>

    <div
      class="relative"
      role="group"
      aria-labelledby="meaning-word"
      onpointerenter={() => (held = true)}
      onpointerleave={() => (held = false)}
      onfocusin={() => (held = true)}
      onfocusout={() => (held = false)}
    >
      <p id="meaning-word" class="mb-5 text-center text-[15px] text-tile/70">
        {m.meaning_word()}
      </p>
      <div class="relative mx-auto max-w-xl ps-[18%]">
        {#key form}
          <img
            src="/figures/grand.webp"
            alt=""
            class="hop pointer-events-none absolute start-0 bottom-[-4%] z-20 w-[30%] max-w-none mask-[linear-gradient(to_bottom,black_80%,transparent_96%)] drop-shadow-[0_10px_12px_rgb(0_0_0/0.35)]"
          />
        {/key}
        <div class="relative">
          <span
            class="absolute -inset-x-3 top-0 z-10 h-5 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#f0c15c,#a87a22)] shadow-[0_6px_10px_-4px_rgb(0_0_0/0.6)]"
            aria-hidden="true"
          ></span>
          <div
            class="@container relative grid min-h-64 place-items-center overflow-hidden bg-[#f3ead6] px-8 py-12 text-center text-ink shadow-[inset_0_14px_20px_-14px_rgb(122_74_20/0.5),inset_0_-14px_20px_-14px_rgb(122_74_20/0.5)]"
            aria-live={chosen ? "polite" : "off"}
          >
            {#key form}
              {#each forms as item, index (item.lang)}
                {#if index === form}
                  <div class="flex flex-col items-center">
                    <span
                      class="form font-display leading-none text-cobalt"
                      style:--letters={[...item.script].length}
                      lang={item.lang}
                      dir={item.lang === "ar" ? "rtl" : "ltr"}
                      >{item.script}</span
                    >
                    <span class="caption mt-4 text-[15px] text-ink/70">
                      {#if item.reading != null}<i lang={item.lang}
                          >{item.reading}</i
                        >{", "}{/if}{item.tongue}
                    </span>
                  </div>
                {/if}
              {/each}
              <span
                class="stamp absolute end-6 bottom-5 grid size-16 place-items-center rounded-full border-[3px] border-coral/80 font-hand text-[26px] leading-none text-coral/85"
                lang="ota"
                aria-hidden="true">صح</span
              >
            {/key}
          </div>
          <span
            class="absolute -inset-x-3 bottom-0 z-10 h-5 translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#f0c15c,#a87a22)] shadow-[0_8px_14px_-4px_rgb(0_0_0/0.6)]"
            aria-hidden="true"
          ></span>
        </div>
      </div>
      <ol class="mt-14 flex flex-wrap justify-center gap-2 ps-[6%]" dir="ltr">
        {#each forms as item, index (item.lang)}
          <li>
            <button
              type="button"
              class={[
                "rounded-full px-3 py-1 text-[14px] transition-colors",
                {
                  "bg-gold font-semibold text-ink": index === form,
                  "bg-tile/8 text-tile/70 hover:bg-tile/15 hover:text-tile":
                    index !== form,
                },
              ]}
              lang={item.lang}
              aria-pressed={index === form}
              onclick={() => {
                chosen = true;
                form = index;
              }}>{item.reading ?? item.script}</button
            >
          </li>
        {/each}
      </ol>
    </div>
  </div>

  <ul
    class="mx-auto mt-20 grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-5 break-words md:grid-cols-3"
  >
    {#each facts as fact, index (index)}
      <li
        class="relative rounded-2xl bg-tile/6 p-6 pt-9 text-[16px] leading-relaxed text-tile/85 ring-1 ring-tile/12"
      >
        <span
          class="absolute start-6 -top-4 size-8 rounded-full bg-coral shadow-[inset_0_-3px_0_#8e2214,0_0_0_3px_#d9a43b]"
          aria-hidden="true"
        ></span>
        {fact}
      </li>
    {/each}
  </ul>
</section>

<section
  id="cast"
  class="relative scroll-mt-0 bg-linear-to-b from-[#1d2160] to-[#120f2e] px-5 py-28 text-tile"
>
  <div class="mx-auto max-w-7xl">
    <h2
      class="extrude font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.site_cast_title()}
    </h2>
    <p class="mt-5 max-w-2xl text-[18px] leading-relaxed text-tile/80">
      {m.site_cast_detail()}
    </p>

    <div
      class="theater relative mt-14 overflow-hidden rounded-[30px] bg-[#0b0a1f] shadow-[0_60px_100px_-50px_rgb(0_0_0/0.9)] ring-1 ring-tile/10"
    >
      <div
        class="floor absolute inset-x-0 bottom-0 h-[26%]"
        aria-hidden="true"
      ></div>
      <div class="spot spot-start" aria-hidden="true"></div>
      <div class="spot spot-end" aria-hidden="true"></div>
      <div class="backdrop absolute inset-0" aria-hidden="true"></div>
      <div
        class="relative z-[1] mx-[9%] mt-[7%] mb-[4%] aspect-[16/7] max-sm:mx-[5%] max-sm:mt-[13%] max-sm:aspect-[4/2.5]"
      >
        {#if isCastNear}
          <Cast
            {bow}
            onplaces={(next: Array<{ x: number; y: number }>) => {
              places = next;
            }}
          />
        {/if}
        {#each dragomans as [name], index (name)}
          {const place = $derived(places[index])}
          {#if place != null}
            <button
              type="button"
              class="absolute z-[3] h-[70%] w-[12%] -translate-x-1/2 cursor-pointer rounded-[40%] focus-visible:outline-2 focus-visible:outline-gold"
              style:left="{place.x * 100}%"
              style:top="{place.y * 100}%"
              aria-label={name}
              onclick={() => greet(index)}
            ></button>
          {/if}
        {/each}
        {#if greeting != null}
          {const place = $derived(places[greeting.index])}
          {#if place != null}
            {#key greeting.key}
              <span
                class="bubble pointer-events-none absolute z-[4] rounded-2xl bg-tile px-4 py-2 font-display text-[clamp(16px,2vw,24px)] whitespace-nowrap text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]"
                style:left="{place.x * 100}%"
                style:top="{place.y * 100}%"
                lang={greeting.lang}
              >
                {greeting.text}
              </span>
            {/key}
          {/if}
        {/if}
      </div>
      <div class="curtain curtain-start" aria-hidden="true"></div>
      <div class="curtain curtain-end" aria-hidden="true"></div>
      <div
        class="valance absolute inset-x-0 top-0 z-[2] h-[9%]"
        aria-hidden="true"
      ></div>
    </div>
    <p class="mt-5 text-center text-[15px] text-tile/70">{m.cast_hint()}</p>

    <ul
      class="mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 break-words sm:grid-cols-2 lg:grid-cols-3"
    >
      {#each dragomans as [name, detail], index (name)}
        <li>
          <button
            type="button"
            class="group flex w-full items-start gap-4 rounded-3xl p-3 text-start transition-colors hover:bg-tile/6"
            onclick={() => greet(index)}
          >
            <span
              class="relative size-16 shrink-0 overflow-hidden rounded-full bg-cobalt shadow-[inset_0_-4px_0_rgb(15_22_54/0.35)]"
            >
              <img
                src="/characters/{characters[index]}.webp"
                alt=""
                class="absolute bottom-0 left-1/2 w-[120%] max-w-none -translate-x-1/2 transition-transform duration-300 group-hover:-translate-y-1"
                loading="lazy"
              />
            </span>
            <span>
              <span class="block font-display text-[24px] leading-tight"
                >{name}</span
              >
              <span class="mt-1 block text-[15px] leading-relaxed text-tile/70"
                >{detail}</span
              >
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</section>

<section
  id="languages"
  class="relative scroll-mt-0 overflow-hidden bg-linear-to-b from-[#120f2e] to-lapis py-28 text-tile"
>
  {@render girih("languages-tile")}
  <div class="relative mx-auto max-w-7xl px-5">
    <h2
      class="extrude font-display text-[clamp(34px,5vw,68px)] leading-[1] text-balance"
    >
      {m.site_languages_title({ count: locales.length })}
    </h2>
    <p class="mt-5 max-w-2xl text-[18px] leading-relaxed text-tile/80">
      {m.site_languages_detail({ count: locales.length })}
    </p>
  </div>
  <div class="relative mt-14 grid gap-4" dir="ltr">
    {#each rows as row, rowIndex (rowIndex)}
      <div class="marquee overflow-hidden">
        <div
          class="track flex w-max"
          class:reverse={rowIndex === 1}
          style:--time="{90 + rowIndex * 25}s"
        >
          {#each [0, 1] as copy (copy)}
            <ul
              class="flex shrink-0 items-center"
              class:copy={copy === 1}
              aria-hidden={copy === 1}
            >
              {#each row as code (code)}
                <li class="flex items-center">
                  <a
                    href={localizeHref("/", { locale: code })}
                    hreflang={code}
                    lang={code}
                    data-sveltekit-reload
                    tabindex={copy === 1 ? -1 : undefined}
                    aria-current={code === locale ? "page" : undefined}
                    class="rounded-2xl px-4 py-1.5 text-[clamp(24px,3.2vw,40px)] whitespace-nowrap text-tile/85 transition-colors hover:bg-tile hover:text-cobalt aria-[current=page]:bg-gold aria-[current=page]:text-ink"
                    class:font-hand={code === "ota"}>{names[code]}</a
                  >
                  <svg
                    viewBox="0 0 20 20"
                    class="mx-2 size-3.5 text-gold"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z"
                      fill="currentColor"
                    />
                  </svg>
                </li>
              {/each}
            </ul>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>

<section
  bind:this={finale}
  class="finale relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-32 text-center text-tile"
  onclick={(event) => {
    if ((event.target as HTMLElement).closest("a, button") != null) return;
    const box = event.currentTarget.getBoundingClientRect();
    burst?.(event.clientX - box.left, event.clientY - box.top);
    audio ??= new AudioContext();
    const length = Math.floor(audio.sampleRate * 0.5);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index++)
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 4;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 700;
    gain.gain.value = 0.5;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
  }}
  role="presentation"
>
  {@render loop("night")}
  <div
    class="absolute inset-x-0 top-0 -z-10 h-56 bg-linear-to-b from-lapis to-transparent"
    aria-hidden="true"
  ></div>
  <div
    class="absolute inset-x-0 bottom-0 -z-10 h-56 bg-linear-to-b from-transparent to-lapis"
    aria-hidden="true"
  ></div>
  <div
    class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_42%_at_50%_50%,rgb(15_22_54/0.7),transparent)]"
    aria-hidden="true"
  ></div>
  <canvas
    bind:this={sky}
    class="pointer-events-none absolute inset-0 -z-10 size-full"
    aria-hidden="true"
  ></canvas>
  <div class="max-w-3xl">
    <h2
      class="extrude font-display text-[clamp(40px,6.4vw,88px)] leading-[0.98] text-balance"
    >
      {m.site_privacy_title()}
    </h2>
    <p
      class="mx-auto mt-6 max-w-2xl text-[clamp(17px,1.5vw,20px)] leading-relaxed text-tile/85"
    >
      {m.site_privacy_detail()}
    </p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <Install />
      {@render watch()}
    </div>
    <p class="mt-12 inline-flex items-center gap-2 text-[15px] text-tile/60">
      <svg viewBox="0 0 20 20" class="size-4 text-gold" aria-hidden="true">
        <path
          d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z"
          fill="currentColor"
        />
      </svg>
      {m.fireworks_hint()}
    </p>
  </div>
</section>

<dialog
  bind:this={film}
  aria-label={m.watch_film()}
  class="film m-auto max-h-[92svh] w-[min(92vw,calc(92svh*16/9))] overflow-visible bg-transparent p-0 backdrop:bg-lapis/85 backdrop:backdrop-blur-md"
  class:portrait={filmShape === "portrait"}
  onclose={() => (filmShape = "")}
  onclick={(event) => {
    if (event.target === event.currentTarget) film?.close();
  }}
>
  {#if filmShape !== ""}
    <iframe
      src="https://www.youtube-nocookie.com/embed/{filmShape === 'portrait'
        ? 'UPskKXl42lg'
        : 'Rqul5qH00A4'}?autoplay=1&rel=0&playsinline=1"
      title={m.watch_film()}
      class={[
        "block max-h-[92svh] w-full rounded-2xl bg-black shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]",
        {
          "aspect-video": filmShape === "landscape",
          "aspect-[9/16]": filmShape === "portrait",
        },
      ]}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  {/if}
  <button
    type="button"
    class="absolute -top-3 -right-3 grid size-11 place-items-center rounded-full bg-tile text-ink shadow-lg"
    aria-label={m.close()}
    onclick={() => film?.close()}
  >
    <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
      <path
        d="M3 3l10 10M13 3 3 13"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</dialog>

<style>
  .poster {
    background: center / cover;
  }

  .poster.day {
    background-image: image-set(
      url("/loops/day-wide.avif") type("image/avif"),
      url("/loops/day-wide.webp") type("image/webp")
    );
  }

  .poster.night {
    background-image: image-set(
      url("/loops/night-wide.avif") type("image/avif"),
      url("/loops/night-wide.webp") type("image/webp")
    );
  }

  @media (orientation: portrait) {
    .poster.day {
      background-image: image-set(
        url("/loops/day-tall.avif") type("image/avif"),
        url("/loops/day-tall.webp") type("image/webp")
      );
    }

    .poster.night {
      background-image: image-set(
        url("/loops/night-tall.avif") type("image/avif"),
        url("/loops/night-tall.webp") type("image/webp")
      );
    }
  }

  .glyph {
    font-size: calc(var(--depth) * 120px);
    font-weight: 400;
    opacity: calc(0.05 + var(--depth) * 0.06);
    rotate: var(--turn);
    animation: drift 12s var(--delay) ease-in-out infinite;
  }

  .progress {
    animation: progress linear forwards;
  }

  .fill {
    transition: scale 0.7s var(--ease-quill);
  }

  @keyframes progress {
    from {
      stroke-dashoffset: 138.2;
    }

    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes drift {
    50% {
      transform: translateY(-18px) rotate(6deg);
    }
  }

  .haze {
    background: linear-gradient(
      90deg,
      rgb(251 236 214 / 0.78),
      rgb(251 236 214 / 0.5) 40%,
      transparent 62%
    );
    backdrop-filter: blur(12px) saturate(1.1);
    mask-image: linear-gradient(90deg, #000 38%, transparent 62%);
  }

  :global([dir="rtl"]) .haze {
    background: linear-gradient(
      270deg,
      rgb(251 236 214 / 0.78),
      rgb(251 236 214 / 0.5) 40%,
      transparent 62%
    );
    mask-image: linear-gradient(270deg, #000 38%, transparent 62%);
  }

  @media (width < 64rem) {
    .haze,
    :global([dir="rtl"]) .haze {
      background: linear-gradient(
        180deg,
        rgb(251 236 214 / 0.8),
        rgb(251 236 214 / 0.55) 55%,
        transparent 75%
      );
      mask-image: linear-gradient(180deg, #000 50%, transparent 75%);
    }
  }

  .form {
    font-size: min(clamp(40px, 5.4vw, 76px), 150cqi / var(--letters));
    animation: reveal 0.9s var(--ease-quill) both;
  }

  .form[dir="rtl"] {
    animation-name: reveal-rtl;
  }

  @keyframes reveal {
    from {
      clip-path: inset(-20% 100% -30% -5%);
      filter: blur(3px);
    }
    to {
      clip-path: inset(-20% -5% -30% -5%);
    }
  }

  @keyframes reveal-rtl {
    from {
      clip-path: inset(-20% -5% -30% 100%);
      filter: blur(3px);
    }
    to {
      clip-path: inset(-20% -5% -30% -5%);
    }
  }

  .caption {
    animation: fade 0.6s 0.4s both;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .stamp {
    animation: stamp 0.5s 0.7s cubic-bezier(0.3, 1.6, 0.5, 1) both;
    rotate: -14deg;
  }

  @keyframes stamp {
    from {
      opacity: 0;
      scale: 1.8;
    }
  }

  .hop {
    animation: hop 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  @keyframes hop {
    40% {
      translate: 0 -6%;
    }
  }

  .word {
    display: inline-block;
    animation: drop 0.9s calc(0.15s + var(--i) * 0.09s)
      cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  @keyframes drop {
    from {
      opacity: 0;
      translate: 0 -0.5em;
      rotate: -8deg;
      scale: 0.8;
    }
  }

  .rise {
    animation: rise 0.9s calc(0.6s + var(--delay, 0s))
      cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 18px;
    }
  }

  .rays {
    background: repeating-conic-gradient(
      from var(--ray-angle) at 32% -30%,
      rgb(255 228 180 / 0) 0deg,
      rgb(255 228 180 / 0.22) 2.5deg,
      rgb(255 228 180 / 0) 6deg,
      rgb(255 228 180 / 0) 11deg
    );
    mask-image: linear-gradient(to bottom, black 10%, transparent 75%);
    mix-blend-mode: soft-light;
    animation: rays 26s ease-in-out infinite alternate;
  }

  @keyframes rays {
    from {
      --ray-angle: 150deg;
    }
    to {
      --ray-angle: 168deg;
    }
  }

  .mote {
    position: absolute;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: #fff6dd;
    box-shadow: 0 0 8px 2px rgb(255 214 140 / 0.7);
    opacity: 0;
    animation: mote var(--time) var(--delay) linear infinite;
  }

  @keyframes mote {
    0% {
      opacity: 0;
      translate: 0 0;
    }
    20% {
      opacity: 0.9;
    }
    80% {
      opacity: 0.6;
    }
    100% {
      opacity: 0;
      translate: 40px -160px;
    }
  }

  .bob {
    position: relative;
    animation: bob 7s ease-in-out infinite;
  }

  @keyframes bob {
    50% {
      translate: 0 -12px;
    }
  }

  @media (min-width: 1024px) {
    .tilt {
      transform: perspective(1800px) rotateY(calc(-10deg + var(--px, 0) * 8deg))
        rotateX(calc(5deg - var(--py, 0) * 6deg));
      transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    :global([dir="rtl"]) .tilt {
      transform: perspective(1800px) rotateY(calc(10deg + var(--px, 0) * 8deg))
        rotateX(calc(5deg - var(--py, 0) * 6deg));
    }
  }

  .glint {
    animation: glint 7s ease-in-out infinite;
  }

  @keyframes glint {
    50% {
      scale: 0.85 1;
      opacity: 0.6;
    }
  }

  .peek {
    animation: peek 0.9s cubic-bezier(0.3, 1.4, 0.5, 1) both;
  }

  @keyframes peek {
    from {
      translate: 0 70%;
    }
  }

  .cursor {
    translate: -18% -8%;
    transition:
      left 0.9s cubic-bezier(0.5, 0, 0.2, 1),
      top 0.9s cubic-bezier(0.5, 0, 0.2, 1);
  }

  .cursor svg {
    transition: scale 0.15s;
  }

  .cursor.pressed svg {
    scale: 0.82;
  }

  .ripple {
    position: absolute;
    left: 0;
    top: 0;
    width: 160%;
    aspect-ratio: 1;
    translate: -50% -50%;
    border-radius: 50%;
    border: 3px solid #d9a43b;
    opacity: 0;
  }

  .cursor.pressed .ripple {
    animation: ripple 0.6s ease-out;
  }

  @keyframes ripple {
    from {
      opacity: 1;
      scale: 0.2;
    }
    to {
      opacity: 0;
      scale: 1.4;
    }
  }

  .float {
    animation: float 6s var(--delay) ease-in-out infinite;
  }

  @keyframes float {
    50% {
      translate: 0 -10px;
    }
  }

  .envelope {
    transition: translate 0.4s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  .cubby:hover .envelope {
    translate: 0 -8%;
  }

  .cubby.hit .envelope {
    animation: arrive 0.7s cubic-bezier(0.3, 1.5, 0.5, 1);
  }

  .cubby.hit {
    box-shadow:
      inset 0 10px 18px rgb(0 0 0 / 0.65),
      0 0 0 3px #f0c15c,
      0 0 40px 6px rgb(240 193 92 / 0.55);
    transition: box-shadow 0.3s;
  }

  @keyframes arrive {
    from {
      translate: 0 -40%;
      rotate: -6deg;
    }
  }

  .wing {
    transform-box: fill-box;
    transform-origin: 20% 100%;
    animation: flap 0.22s ease-in-out infinite alternate;
  }

  @keyframes flap {
    from {
      scale: 1 1;
    }
    to {
      scale: 1 -0.6;
    }
  }

  .backdrop {
    background:
      radial-gradient(
        ellipse 40% 55% at 50% 55%,
        rgb(120 60 140 / 0.35),
        transparent
      ),
      repeating-linear-gradient(
        90deg,
        rgb(255 255 255 / 0.025) 0 1px,
        transparent 1px 3%
      ),
      linear-gradient(#1a1035, #0b0a1f);
  }

  .floor {
    background:
      radial-gradient(
        ellipse 50% 60% at 50% 30%,
        rgb(255 214 150 / 0.35),
        transparent
      ),
      repeating-linear-gradient(
        90deg,
        rgb(0 0 0 / 0.18) 0 2px,
        transparent 2px 9%
      ),
      linear-gradient(#6b4326, #3a2414);
  }

  .spot {
    position: absolute;
    top: -12%;
    z-index: 1;
    width: 46%;
    height: 135%;
    pointer-events: none;
    background: conic-gradient(
      from 166deg at 50% 0%,
      transparent 0deg,
      rgb(255 226 170 / 0.2) 8deg,
      rgb(255 240 210 / 0.34) 14deg,
      rgb(255 226 170 / 0.2) 20deg,
      transparent 28deg
    );
    filter: blur(8px);
    mix-blend-mode: screen;
    transform-origin: 50% 0;
    animation: spot 9s ease-in-out infinite alternate;
  }

  .spot-start {
    left: 2%;
    rotate: -18deg;
  }

  .spot-end {
    right: 2%;
    rotate: 18deg;
    animation-delay: -4.5s;
  }

  @keyframes spot {
    50% {
      rotate: 0deg;
    }
  }

  .curtain {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 2;
    width: 10%;
    background:
      linear-gradient(
        90deg,
        rgb(0 0 0 / 0.35),
        transparent 30%,
        transparent 70%,
        rgb(0 0 0 / 0.35)
      ),
      repeating-linear-gradient(
        90deg,
        #5a0f10 0,
        #a8261b 18%,
        #d2402a 26%,
        #8f1d1d 40%,
        #5a0f10 50%
      );
    box-shadow: 0 0 40px rgb(0 0 0 / 0.7);
  }

  .curtain-start {
    left: 0;
    border-bottom-right-radius: 100% 45%;
  }

  .curtain-end {
    right: 0;
    border-bottom-left-radius: 100% 45%;
  }

  .valance {
    background:
      radial-gradient(
          circle at 50% 0,
          #b42a1d 62%,
          #d9a43b 63% 70%,
          transparent 71%
        )
        0 100% / 6% 70% repeat-x,
      linear-gradient(#7d1a14, #b42a1d) 0 0 / 100% 55% no-repeat;
    filter: drop-shadow(0 8px 10px rgb(0 0 0 / 0.5));
  }

  .bubble {
    translate: -50% calc(-100% - 18px);
    animation: bubble 0.45s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }

  .bubble::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    border: 9px solid transparent;
    border-top-color: #f6f5ef;
    translate: -50% -1px;
  }

  @keyframes bubble {
    from {
      opacity: 0;
      scale: 0.4;
    }
  }

  .track {
    animation: marquee var(--time) linear infinite;
  }

  .track.reverse {
    animation-direction: reverse;
  }

  .marquee:hover .track,
  .marquee:focus-within .track {
    animation-play-state: paused;
  }

  @keyframes marquee {
    to {
      translate: -50% 0;
    }
  }

  .finale {
    cursor: crosshair;
  }

  .film.portrait {
    width: min(92vw, calc(92svh * 9 / 16));
  }

  @media (prefers-reduced-motion: reduce) {
    .word,
    .form,
    .caption,
    .stamp,
    .hop,
    .glyph,
    .rise,
    .rays,
    .mote,
    .bob,
    .glint,
    .peek,
    .float,
    .spot,
    .wing,
    .bubble,
    .cubby.hit .envelope {
      animation: none;
    }

    .cursor,
    .tilt,
    .fill {
      transition: none;
    }

    .track {
      flex-wrap: wrap;
      width: auto;
      justify-content: center;
      animation: none;
    }

    .copy {
      display: none;
    }
  }
</style>
