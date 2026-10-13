<script lang="ts">
  import { m } from "#lib/messages.ts";
  import { reveal } from "#lib/reveal.ts";

  const rows = [
    ["1910–1915", "Term", "Term"],
    ["1917–1920", "Period", "Term"],
    ["1928–1932", "Tenure", "Term"],
    ["1933", "Term", "Term"],
  ] as const;
</script>

<figure
  class="mt-6 rounded-2xl bg-raised p-4 ring-1 ring-line sm:p-6"
  {@attach reveal}
>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each [m.docs_viz_pieces(), m.docs_viz_whole()] as title, panel (panel)}
      <div class="rounded-xl bg-sunk p-3 sm:p-4">
        <p
          class="flex items-center gap-2 px-1 text-[13.5px] font-semibold text-muted"
        >
          <span
            class={[
              "size-2 rounded-full",
              { "bg-coral": panel === 0, "bg-turquoise": panel === 1 },
            ]}
          ></span>
          {title}
        </p>
        <dl class="mt-3 grid gap-1.5" dir="ltr">
          {#each rows as row, index (index)}
            {const word = $derived(row[panel + 1])}
            {const isOff = $derived(word !== "Term")}
            <div
              class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-lg bg-raised px-3 py-2 text-[14.5px]"
            >
              <dt lang="el" class="font-medium">Περίοδος</dt>
              <span class="truncate text-[13px] text-muted tabular-nums"
                >{row[0]}</span
              >
              <svg
                viewBox="0 0 16 16"
                class="size-3.5 text-muted"
                aria-hidden="true"
              >
                <path
                  d="M3 8h9m-3.5-4 4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <dd
                lang="en"
                class={[
                  "word min-w-[4.6rem] rounded-md px-2 py-0.5 text-center font-semibold",
                  {
                    "off bg-coral/12 text-bad": panel === 0 && isOff,
                    "bg-sunk": panel === 0 && !isOff,
                    "bg-turquoise/14 text-good": panel === 1,
                  },
                ]}
                style:--i={index * 2 + panel}
              >
                {word}
              </dd>
            </div>
          {/each}
        </dl>
      </div>
    {/each}
  </div>
  <figcaption class="mt-4 text-[14.5px] text-muted">
    {m.docs_viz_consistency()}
  </figcaption>
</figure>

<style>
  .word {
    opacity: 0;
    translate: 0 6px;
    filter: blur(3px);
  }
  :global([data-shown]) .word {
    animation: land 0.55s var(--ease-quill) forwards;
    animation-delay: calc(var(--i) * 170ms + 150ms);
  }
  :global([data-shown]) .off {
    animation:
      land 0.55s var(--ease-quill) forwards,
      flag 0.7s ease-in-out;
    animation-delay:
      calc(var(--i) * 170ms + 150ms), calc(var(--i) * 170ms + 750ms);
  }
  @keyframes land {
    to {
      opacity: 1;
      translate: 0 0;
      filter: none;
    }
  }
  @keyframes flag {
    30% {
      box-shadow: 0 0 0 4px rgb(200 50 31 / 0.25);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .word,
    :global([data-shown]) .word,
    :global([data-shown]) .off {
      opacity: 1;
      translate: none;
      filter: none;
      animation: none;
    }
  }
</style>
