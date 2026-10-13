<script lang="ts">
  import { on } from "svelte/events";
  import { m } from "#lib/messages.ts";

  const lines = [
    0.9, 0.7, 0.95, 0.6, 0.85, 0.75, 0.92, 0.55, 0.88, 0.7, 0.94, 0.65, 0.8,
    0.9,
  ];
  const FRAME = 0.3;
  const AHEAD = 0.1;
  const CYCLE = 9000;
  const TRAVEL = 6500;
  const REST = 0.6;

  let top = $state(0);
  let isResting = $state(false);

  const states = $derived(
    lines.map((_, index) => {
      const position = (index + 0.5) / lines.length;
      if (isResting) return "waiting";
      if (position <= top + FRAME) return "refined";
      if (position <= top + FRAME + AHEAD) return "drafted";
      return "waiting";
    }),
  );
  const done = $derived(states.filter((state) => state === "refined").length);
</script>

<figure
  class="mt-6 grid gap-6 rounded-2xl bg-raised p-4 ring-1 ring-line sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-6"
  {@attach (node: HTMLElement) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      top = 0.22;
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const elapsed = (now - start) % CYCLE;
      isResting = elapsed > CYCLE - 400;
      const progress = Math.min(1, elapsed / TRAVEL);
      top = (REST * (1 - Math.cos(Math.PI * progress))) / 2;
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry?.isIntersecting === true) frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    const off = on(document, "visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(frame);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      off();
    };
  }}
>
  <div
    class="relative mx-auto w-full max-w-52 rounded-xl bg-sunk p-3 sm:mx-0"
    aria-hidden="true"
  >
    <div class="grid gap-[7px]">
      {#each lines as width, index (index)}
        <span
          class={[
            "h-2.5 rounded-full transition-colors duration-500",
            {
              "bg-line": states[index] === "waiting",
              "bg-gold": states[index] === "drafted",
              "bg-turquoise": states[index] === "refined",
            },
          ]}
          style:width="{width * 100}%"
        ></span>
      {/each}
    </div>
    <span
      class="absolute inset-x-1.5 rounded-lg ring-2 ring-accent"
      style:top="calc(0.75rem + {top} * (100% - 1.5rem))"
      style:height="calc({FRAME} * (100% - 1.5rem))"
    ></span>
  </div>
  <figcaption>
    <p class="text-[22px] font-semibold tabular-nums">
      {m.docs_viz_count({ done, total: lines.length })}
    </p>
    <span
      class="mt-3 flex h-2.5 overflow-hidden rounded-full bg-sunk"
      aria-hidden="true"
    >
      <span
        class="h-full rounded-full bg-turquoise transition-[width] duration-500"
        style:width="{(done / lines.length) * 100}%"
      ></span>
    </span>
    <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted">
      {#each [["refined", m.docs_viz_refined()], ["drafted", m.docs_viz_drafted()], ["waiting", m.docs_viz_waiting()]] as const as [state, label] (state)}
        <li class="flex items-center gap-2">
          <span
            class={[
              "size-2.5 rounded-full",
              {
                "bg-turquoise": state === "refined",
                "bg-gold": state === "drafted",
                "bg-line": state === "waiting",
              },
            ]}
          ></span>
          {label}
        </li>
      {/each}
    </ul>
    <p class="mt-4 text-[14.5px] text-muted">{m.docs_viz_viewport()}</p>
  </figcaption>
</figure>
