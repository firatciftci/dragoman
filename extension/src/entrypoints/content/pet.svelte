<svelte:options css="injected" />

<script lang="ts">
  import { onMount } from "svelte";
  import { on } from "svelte/events";
  import { MediaQuery } from "svelte/reactivity";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { browser } from "wxt/browser";
  import { languageKey, languageName } from "#lib/messages.ts";
  import { petItem } from "#lib/settings.ts";
  import Float from "./float.svelte";
  import { actions, hint, m, view } from "./view.svelte.ts";

  let {
    rect = $bindable(null),
    onactivate,
  }: { rect?: DOMRect | null; onactivate: () => void } = $props();

  const POSES = ["idle", "blink", "happy", "sleep", "lift", "read"] as const;
  const GREETINGS: Record<string, string> = {
    tr: "Merhaba!",
    es: "¡Hola!",
    fr: "Bonjour !",
    de: "Hallo!",
    it: "Ciao!",
    pt: "Olá!",
    ja: "こんにちは！",
    zh: "你好！",
    ko: "안녕하세요!",
    ar: "مرحبا!",
    fa: "سلام!",
    he: "שלום!",
    hi: "नमस्ते!",
    ru: "Привет!",
    uk: "Привіт!",
    el: "Γεια σου!",
    sw: "Jambo!",
    hy: "Բարև՛",
    ka: "გამარჯობა!",
    pl: "Cześć!",
    vi: "Xin chào!",
    th: "สวัสดี!",
    id: "Halo!",
    fi: "Hei!",
    sv: "Hej!",
    is: "Halló!",
    ga: "Dia duit!",
    cy: "Shwmae!",
    haw: "Aloha!",
    mi: "Kia ora!",
  };
  const narrow = new MediaQuery("(max-width: 560px)");
  const still = new MediaQuery("(prefers-reduced-motion: reduce)");
  function pick<T>(list: Array<T>) {
    return list[Math.floor(Math.random() * list.length)];
  }

  let edge = $state<"top" | "bottom" | "left" | "right">("bottom");
  let offset = $state(0.06);
  let isReady = $state(false);
  let held = $state<{ x: number; y: number } | null>(null);
  let isLanding = $state(false);
  let stride = $state(0);
  let swing = $state(0);
  let facing = $state(1);
  let isBlinking = $state(false);
  let isSleeping = $state(false);
  let isHappy = $state(false);
  let isHovered = $state(false);
  let isSquished = $state(false);
  let isDizzy = $state(false);
  let isFullscreen = $state(false);
  let speech = $state<{
    text: string;
    stage: "chat" | "ask" | "answer";
    lang?: string;
    buttons: Array<{ label: string; run: () => void }>;
  } | null>(null);
  let typed = $state(0);
  let element = $state<HTMLDivElement>();
  let press: {
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    time: number;
    vx: number;
    vy: number;
  } | null = null;
  let wasDragged = false;
  let happyTimer: ReturnType<typeof setTimeout> | undefined;
  let pokes: Array<number> = [];
  let previous = view.phase;
  let isCelebrated = false;

  const size = $derived(
    narrow.current ? { width: 60, height: 80 } : { width: 72, height: 96 },
  );
  const spot = $derived.by(() => {
    const viewWidth = innerWidth.current ?? 0;
    const viewHeight = innerHeight.current ?? 0;
    const { width, height } = size;
    if (held != null) return { x: held.x, y: held.y, turn: 0 };
    if (edge === "top")
      return { x: offset * (viewWidth - width), y: -8, turn: 180 };
    if (edge === "left")
      return {
        x: -width * (isHovered ? 0.2 : 0.44),
        y: offset * (viewHeight - height),
        turn: 18,
      };
    if (edge === "right")
      return {
        x: viewWidth - width * (isHovered ? 0.8 : 0.56),
        y: offset * (viewHeight - height),
        turn: -18,
      };
    return {
      x: offset * (viewWidth - width),
      y: viewHeight - height + 5,
      turn: 0,
    };
  });
  const face = $derived(
    held != null
      ? facing
      : edge === "left"
        ? 1
        : edge === "right"
          ? -1
          : edge === "top"
            ? -facing
            : facing,
  );
  const pose = $derived(
    held != null
      ? "lift"
      : isSleeping
        ? "sleep"
        : isHappy
          ? "happy"
          : isBlinking
            ? "blink"
            : edge === "top"
              ? "lift"
              : view.isBusy && view.phase === "active"
                ? "read"
                : "idle",
  );

  $effect(() => {
    const left = Math.max(0, spot.x);
    const right = Math.min(innerWidth.current ?? 0, spot.x + size.width);
    rect = new DOMRect(
      left,
      Math.max(0, spot.y),
      Math.max(0, right - left),
      size.height,
    );
  });

  const say = (
    text: string,
    extra: Partial<NonNullable<typeof speech>> = {},
  ) => {
    if (view.isPanelOpen || isFullscreen || text === "") return;
    speech = { text, stage: "chat", buttons: [], ...extra };
  };

  const cheer = (duration: number) => {
    isHappy = true;
    clearTimeout(happyTimer);
    happyTimer = setTimeout(() => (isHappy = false), duration);
  };

  $effect(() => {
    const current = speech;
    if (current == null) return;
    const length = Array.from(current.text).length;
    typed = still.current ? length : 0;
    const typer = still.current
      ? undefined
      : setInterval(() => {
          typed += 1;
          if (typed >= length) clearInterval(typer);
        }, 22);
    const timer = setTimeout(
      () => {
        if (speech === current) speech = null;
      },
      current.buttons.length > 0 || current.stage === "answer"
        ? 16_000
        : 2800 + length * 55,
    );
    return () => {
      clearInterval(typer);
      clearTimeout(timer);
    };
  });

  $effect(() => {
    const phase = view.phase;
    if (phase === "active" && previous !== "active") {
      isCelebrated = false;
      say(pick([m.pet_start_1, m.pet_start_2, m.pet_start_3])?.() ?? "");
    }
    previous = phase;
  });

  $effect(() => {
    if (
      view.phase !== "active" ||
      view.isBusy ||
      view.translated === 0 ||
      isCelebrated
    )
      return;
    isCelebrated = true;
    cheer(2200);
    say(
      matchMedia("(hover: none)").matches ? m.pet_done_touch() : m.pet_done(),
    );
  });

  const poke = () => {
    const now = Date.now();
    pokes = [...pokes.filter((time) => now - time < 4000), now];
    isSleeping = false;
    isSquished = true;
    setTimeout(() => (isSquished = false), 340);
    if (pokes.length >= 5) {
      pokes = [];
      isDizzy = true;
      setTimeout(() => (isDizzy = false), 1100);
      say(m.pet_dizzy());
      return;
    }
    cheer(1400);
    say(
      pick([
        m.pet_poke_1,
        m.pet_poke_2,
        m.pet_poke_3,
        m.pet_poke_4,
        m.pet_poke_5,
      ])?.() ?? "",
    );
  };

  const chatter = () => {
    if (Math.random() < 0.3) {
      const code = pick(
        Object.keys(GREETINGS).filter(
          (other) => languageKey(other) !== languageKey(view.locale),
        ),
      );
      if (code == null) return;
      cheer(1600);
      say(
        m.pet_hello({
          greeting: GREETINGS[code] ?? "",
          language: languageName(code, view.locale),
        }),
      );
      return;
    }
    say(
      pick([
        m.pet_fact_name,
        m.pet_fact_porte,
        m.pet_fact_count,
        m.pet_fact_coffee,
        m.pet_fact_two,
        m.pet_fact_rosetta,
        m.pet_fact_look,
        m.pet_fact_carry,
        m.pet_idle_1,
        m.pet_idle_2,
        m.pet_idle_3,
      ])?.() ?? "",
    );
  };

  const stroll = () => {
    const room = window.innerWidth - size.width;
    if (room <= 0) return;
    const step = (60 + Math.random() * 140) * (Math.random() < 0.5 ? -1 : 1);
    const next = Math.min(1, Math.max(0, offset + step / room));
    const distance = Math.abs(next - offset) * room;
    if (distance < 24) return;
    const duration = distance / 45;
    facing = next < offset ? -1 : 1;
    stride = duration;
    offset = next;
    setTimeout(() => (stride = 0), duration * 1000);
  };

  const translateSelection = async (text: string) => {
    speech = { text: "…", stage: "answer", buttons: [] };
    const result = await actions.translateText(text).catch(() => null);
    if (result == null) {
      say(m.pet_stumped());
      return;
    }
    cheer(1400);
    say(result.text, {
      stage: "answer",
      lang: view.target,
      buttons: [
        {
          label: m.copy(),
          run: () => void navigator.clipboard.writeText(result.text),
        },
      ],
    });
  };

  onMount(() => {
    const host = (element?.getRootNode() as ShadowRoot | undefined)?.host;
    let lastInput = Date.now();
    let nextChat = Date.now() + 120_000 + Math.random() * 120_000;
    let nextWalk = Date.now() + 15_000 + Math.random() * 25_000;
    let nextBlink = Date.now() + 3000;
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let fastAt = 0;
    let isEnded = false;
    let selectionTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSelection = "";

    void petItem.getValue().then((saved) => {
      edge = saved.edge;
      offset = saved.offset;
      isReady = true;
      if (Date.now() - saved.greeted < 1_800_000 || view.phase !== "hidden")
        return;
      const hour = new Date().getHours();
      cheer(1800);
      say(
        hour < 5 || hour >= 23
          ? m.pet_night()
          : hour < 12
            ? m.pet_morning()
            : hour < 18
              ? m.pet_afternoon()
              : m.pet_evening(),
      );
      void petItem.setValue({ ...saved, greeted: Date.now() });
    });

    const onInput = () => {
      lastInput = Date.now();
      if (!isSleeping) return;
      isSleeping = false;
      if (Math.random() < 0.35) say(m.pet_wake());
    };
    const onMove = (event: PointerEvent) => {
      onInput();
      if (held != null || stride > 0 || (edge !== "bottom" && edge !== "top"))
        return;
      const center = spot.x + size.width / 2;
      if (Math.abs(event.clientX - center) > 60)
        facing = event.clientX < center ? -1 : 1;
    };
    const onScroll = () => {
      onInput();
      const now = performance.now();
      const speed =
        Math.abs(window.scrollY - lastY) / Math.max(16, now - lastTime);
      lastY = window.scrollY;
      lastTime = now;
      if (speed > 7 && Date.now() - fastAt > 600_000) {
        fastAt = Date.now();
        if (Math.random() < 0.5) say(m.pet_fast());
      }
      const page = document.documentElement;
      if (
        !isEnded &&
        page.scrollHeight > window.innerHeight * 3 &&
        window.scrollY + window.innerHeight >= page.scrollHeight - 4
      ) {
        isEnded = true;
        if (Math.random() < 0.6) say(m.pet_end());
      }
    };
    const onSelection = () => {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => {
        void (async () => {
          const selection = getSelection();
          const text = selection?.toString().trim() ?? "";
          const node = selection?.anchorNode;
          const anchor = node instanceof Element ? node : node?.parentElement;
          if (text === "") {
            lastSelection = "";
            if (speech?.stage === "ask") speech = null;
            return;
          }
          if (
            text === lastSelection ||
            text.length > 1500 ||
            held != null ||
            view.isPanelOpen ||
            anchor == null ||
            anchor === host ||
            anchor.closest("input, textarea, [contenteditable]") != null
          )
            return;
          lastSelection = text;
          const language = await actions.languageOf(text);
          if (
            language == null ||
            language === "und" ||
            view.selection != null ||
            languageKey(language) === languageKey(view.target) ||
            getSelection()?.toString().trim() !== text
          )
            return;
          isSleeping = false;
          say(m.pet_selection(), {
            stage: "ask",
            buttons: [
              {
                label: m.pet_translate(),
                run: () => void translateSelection(text),
              },
            ],
          });
        })();
      }, 500);
    };
    const onFullscreen = () => {
      isFullscreen = document.fullscreenElement != null;
    };

    const ticker = setInterval(() => {
      const now = Date.now();
      if (document.hidden || held != null) return;
      if (now >= nextBlink) {
        nextBlink = now + 2500 + Math.random() * 3500;
        isBlinking = true;
        setTimeout(() => (isBlinking = false), 160);
      }
      if (
        !isSleeping &&
        now - lastInput > 90_000 &&
        speech == null &&
        !view.isBusy
      )
        isSleeping = true;
      if (now >= nextChat) {
        nextChat = now + 180_000 + Math.random() * 180_000;
        if (now - lastInput < 60_000 && speech == null && !isSleeping)
          chatter();
      }
      if (now >= nextWalk) {
        nextWalk = now + 20_000 + Math.random() * 30_000;
        if (
          !still.current &&
          !isSleeping &&
          speech == null &&
          !view.isPanelOpen &&
          (edge === "bottom" || edge === "top")
        )
          stroll();
      }
    }, 500);

    const offs = [
      on(window, "pointermove", onMove, { passive: true }),
      on(window, "keydown", onInput, { passive: true }),
      on(window, "scroll", onScroll, { passive: true }),
      on(document, "selectionchange", onSelection),
      on(document, "fullscreenchange", onFullscreen),
    ];
    return () => {
      clearInterval(ticker);
      clearTimeout(selectionTimer);
      clearTimeout(happyTimer);
      for (const off of offs) off();
    };
  });
</script>

{#if isReady && !isFullscreen}
  <div
    class="pet"
    role="presentation"
    data-edge={held == null ? edge : "held"}
    style:--width="{size.width}px"
    style:--height="{size.height}px"
    style:transform="translate({spot.x}px, {spot.y}px) rotate({spot.turn}deg)
    scaleX({face})"
    style:transition={held != null
      ? "none"
      : stride > 0
        ? `transform ${stride}s linear`
        : isLanding
          ? "transform 0.6s cubic-bezier(0.3, 1.45, 0.5, 1)"
          : "transform 0.35s ease"}
    bind:this={element}
    onpointerenter={(event) => {
      if (event.pointerType === "mouse") isHovered = true;
    }}
    onpointerleave={() => (isHovered = false)}
  >
    <button
      type="button"
      class="figure"
      class:walking={stride > 0}
      class:squished={isSquished}
      class:dizzy={isDizzy}
      aria-label={m.character()}
      style:rotate="{swing}deg"
      onpointerdown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        press = {
          x: event.clientX,
          y: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          time: event.timeStamp,
          vx: 0,
          vy: 0,
        };
      }}
      onpointermove={(event) => {
        if (press == null) return;
        if (
          held == null &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6
        )
          return;
        const elapsed = Math.max(8, event.timeStamp - press.time);
        press.vx =
          press.vx * 0.6 + ((event.clientX - press.lastX) / elapsed) * 0.4;
        press.vy =
          press.vy * 0.6 + ((event.clientY - press.lastY) / elapsed) * 0.4;
        press.lastX = event.clientX;
        press.lastY = event.clientY;
        press.time = event.timeStamp;
        if (held == null) {
          isSleeping = false;
          isHovered = false;
          speech = null;
          if (Math.random() < 0.35)
            say(pick([m.pet_lift, m.pet_lift_2])?.() ?? "");
          const sway = () => {
            if (held == null) {
              swing = 0;
              return;
            }
            const goal = Math.min(45, Math.max(-45, -(press?.vx ?? 0) * 26));
            swing += (goal - swing) * 0.18;
            if (press != null) press.vx *= 0.94;
            requestAnimationFrame(sway);
          };
          requestAnimationFrame(sway);
        }
        if (press.vx !== 0) facing = press.vx < 0 ? -1 : 1;
        held = { x: event.clientX - size.width / 2, y: event.clientY - 10 };
      }}
      onpointerup={() => {
        if (press == null) return;
        const { vx, vy } = press;
        press = null;
        if (held == null) return;
        wasDragged = true;
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const x = held.x + size.width / 2 + vx * 240;
        const y = held.y + size.height / 2 + vy * 240;
        const gaps = {
          left: x,
          right: viewWidth - x,
          top: y * 1.2,
          bottom: viewHeight - y,
        };
        const next =
          (["bottom", "top", "left", "right"] as const).toSorted(
            (a, b) => gaps[a] - gaps[b],
          )[0] ?? "bottom";
        offset = Math.min(
          1,
          Math.max(
            0,
            next === "left" || next === "right"
              ? (y - size.height / 2) / (viewHeight - size.height)
              : (x - size.width / 2) / (viewWidth - size.width),
          ),
        );
        edge = next;
        held = null;
        isLanding = true;
        setTimeout(() => (isLanding = false), 650);
        if (Math.hypot(vx, vy) > 1.4) say(m.pet_lift());
        else if (Math.random() < 0.3) say(m.pet_land());
        void petItem
          .getValue()
          .then(async (saved) => petItem.setValue({ ...saved, edge, offset }));
      }}
      onpointercancel={() => {
        press = null;
        held = null;
      }}
      onclick={() => {
        if (wasDragged) {
          wasDragged = false;
          return;
        }
        if (view.phase === "hidden") poke();
        else onactivate();
      }}
    >
      <span class="body">
        {#each POSES as name (name)}
          <img
            src={browser.runtime.getURL(`/pet/${view.character}-${name}.webp`)}
            alt=""
            draggable="false"
            class:on={pose === name}
          />
        {/each}
      </span>
    </button>
    {#if isSleeping}
      <span class="zzz" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>
    {/if}
    {#if isHovered && held == null}
      <button
        type="button"
        class="hide"
        aria-label={m.hide_session()}
        {@attach hint(() => m.hide_session())}
        onclick={() => actions.hide(true)}>×</button
      >
    {/if}
  </div>

  {#if speech != null && rect != null && !view.isPanelOpen}
    <Float
      anchor={rect}
      tone="speech"
      label={m.character()}
      prefer={edge === "top"
        ? ["bottom", "right", "left"]
        : edge === "left"
          ? ["right", "top", "bottom"]
          : edge === "right"
            ? ["left", "top", "bottom"]
            : ["top", "right", "left"]}
    >
      <div class="speech" lang={speech.lang}>
        <p aria-live="polite">
          {Array.from(speech.text).slice(0, typed).join("")}
        </p>
        {#if speech.buttons.length > 0 && typed >= Array.from(speech.text).length}
          <div class="buttons">
            {#each speech.buttons as button, index (button.label)}
              <button
                type="button"
                class:primary={index === 0 && speech.stage === "ask"}
                onclick={button.run}>{button.label}</button
              >
            {/each}
          </div>
        {/if}
      </div>
    </Float>
  {/if}
{/if}

<style>
  .pet {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;
    width: var(--width);
    height: var(--height);
    pointer-events: auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .figure {
    all: unset;
    position: absolute;
    inset: 0;
    display: block;
    cursor: grab;
    transform-origin: 50% 6%;
  }
  [data-edge="held"] .figure {
    cursor: grabbing;
  }
  .figure:focus-visible {
    outline: 2px solid #e0ac3e;
    outline-offset: 4px;
    border-radius: 14px;
  }
  .body {
    position: absolute;
    inset: 0;
    transform-origin: 50% 100%;
    filter: drop-shadow(0 5px 5px rgb(15 22 54 / 0.28));
    animation: breathe 3.6s ease-in-out infinite;
  }
  [data-edge="top"] .body {
    animation: dangle 3.2s ease-in-out infinite alternate;
  }
  .walking .body {
    animation: waddle 0.32s ease-in-out infinite alternate;
  }
  .squished .body {
    animation: squish 0.34s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .dizzy .body {
    animation: dizzy 1.1s cubic-bezier(0.3, 0.8, 0.3, 1);
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: none;
    -webkit-user-drag: none;
  }
  .on {
    opacity: 1;
  }
  .hide {
    all: unset;
    position: absolute;
    top: -4px;
    right: -6px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f6f5ef;
    color: #18204a;
    font:
      600 15px/1 system-ui,
      sans-serif;
    box-shadow:
      0 0 0 1.5px #18204a,
      0 3px 0 rgb(24 32 74 / 0.2);
    cursor: pointer;
  }
  .hide:focus-visible {
    outline: 2px solid #e0ac3e;
  }
  .zzz {
    position: absolute;
    top: 6px;
    right: -2px;
    font:
      italic 700 15px/1 ui-rounded,
      system-ui,
      sans-serif;
    color: #2347a8;
    pointer-events: none;
  }
  .zzz i {
    position: absolute;
    opacity: 0;
    animation: drift 2.7s ease-out infinite;
  }
  .zzz i:nth-child(2) {
    animation-delay: 0.9s;
    font-size: 12px;
  }
  .zzz i:nth-child(3) {
    animation-delay: 1.8s;
    font-size: 10px;
  }
  .speech {
    box-sizing: border-box;
    width: max-content;
    max-width: min(280px, calc(100vw - 32px));
    padding: 9px 13px 10px;
    font:
      600 14px/1.42 ui-rounded,
      "SF Pro Rounded",
      system-ui,
      sans-serif;
  }
  .speech p {
    max-height: 40vh;
    margin: 0;
    overflow-y: auto;
    white-space: pre-line;
    user-select: text;
    -webkit-user-select: text;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .buttons button {
    all: unset;
    padding: 5px 12px;
    border-radius: 99px;
    font:
      600 13px/1.3 system-ui,
      sans-serif;
    color: #18204a;
    box-shadow: inset 0 0 0 1.5px #18204a;
    cursor: pointer;
  }
  .buttons .primary {
    background: #c8321f;
    color: #f6f5ef;
    box-shadow: inset 0 -2px 0 #8e2214;
  }
  .buttons button:focus-visible {
    outline: 2px solid #e0ac3e;
    outline-offset: 2px;
  }
  @keyframes breathe {
    50% {
      scale: 0.99 1.018;
    }
  }
  @keyframes dangle {
    from {
      rotate: -5deg;
    }
    to {
      rotate: 5deg;
    }
  }
  @keyframes waddle {
    from {
      rotate: -5deg;
    }
    to {
      rotate: 5deg;
      translate: 0 -3px;
    }
  }
  @keyframes squish {
    40% {
      scale: 1.14 0.84;
    }
  }
  @keyframes dizzy {
    to {
      rotate: 720deg;
    }
  }
  @keyframes drift {
    0% {
      opacity: 0;
      translate: 0 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      translate: 14px -26px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .body,
    .zzz i {
      animation: none !important;
    }
    .zzz i:first-child {
      opacity: 1;
    }
  }
</style>
