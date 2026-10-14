<script lang="ts">
  import { prefersReducedMotion } from "svelte/motion";
  import { slide } from "svelte/transition";
  import { m } from "#lib/messages.ts";

  const ENDPOINT =
    "https://buttondown.com/api/emails/embed-subscribe/firatciftci";

  const id = $props.id();
  let isAsking = $state(false);
  let phase = $state<"idle" | "sending" | "done" | "failed">("idle");
</script>

{#if isAsking}
  <div
    transition:slide={{ duration: prefersReducedMotion.current ? 0 : 260 }}
    onintroend={(event) =>
      event.currentTarget.scrollIntoView({
        block: "nearest",
        behavior: prefersReducedMotion.current ? "instant" : "smooth",
      })}
    class="mt-6 max-w-sm scroll-mb-6"
  >
    <p class="flex items-baseline gap-2 leading-relaxed text-tile">
      <span
        aria-hidden="true"
        class="inline-block h-4 w-[14.8px] shrink-0 translate-y-0.5 bg-gold [mask:url(/shahmaran.svg)_center/contain_no-repeat] rtl:-scale-x-100"
      ></span>
      {m.site_newsletter_lead()}
    </p>
    <form
      action={ENDPOINT}
      method="post"
      target="_blank"
      class="mt-3"
      onsubmit={async (event) => {
        event.preventDefault();
        if (phase === "sending") return;
        phase = "sending";
        try {
          const response = await fetch(ENDPOINT, {
            method: "POST",
            body: new FormData(event.currentTarget),
          });
          phase = response.ok ? "done" : "failed";
        } catch {
          phase = "failed";
        }
      }}
    >
      <input type="hidden" name="embed" value="1" />
      <input type="hidden" name="tag" value="dragoman" />
      {#if phase !== "done"}
        <div class="flex items-baseline gap-3">
          <label for="{id}-email" class="sr-only"
            >{m.site_newsletter_email()}</label
          >
          <input
            id="{id}-email"
            type="email"
            name="email"
            required
            autocomplete="email"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-form-type="other"
            spellcheck="false"
            dir="ltr"
            placeholder="you@example.com"
            class="h-11 min-w-0 flex-1 rounded-none border-0 border-b-2 border-tile/25 bg-transparent px-0.5 text-[16px] text-tile transition-colors placeholder:text-tile/40 hover:border-tile/45 focus:border-gold focus:outline-none rtl:text-end"
          />
          <button
            type="submit"
            disabled={phase === "sending"}
            class="min-h-11 shrink-0 cursor-pointer rounded-full bg-gold px-5 text-[15px] font-semibold text-lapis transition-colors hover:bg-[#e6b452] disabled:cursor-default disabled:opacity-70"
          >
            {phase === "sending"
              ? m.site_newsletter_sending()
              : m.site_newsletter_submit()}
          </button>
        </div>
      {/if}
      <p
        role="status"
        class={[
          "text-[14px] leading-snug text-tile/70",
          { "mt-2": phase === "failed" },
        ]}
      >
        {#if phase === "done"}
          {m.site_newsletter_done()}
        {:else if phase === "failed"}
          {m.site_newsletter_failed()}
        {/if}
      </p>
    </form>
  </div>
{:else}
  <button
    type="button"
    class="group mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:decoration-gold"
    onclick={() => {
      isAsking = true;
    }}
  >
    <svg
      viewBox="0 0 20 20"
      class="size-[18px] shrink-0 transition-transform duration-200 group-hover:-rotate-8"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      >
        <rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2" />
        <path d="m3.4 5.6 6.6 5.2 6.6-5.2" />
      </g>
    </svg>
    {m.site_newsletter_open()}
  </button>
{/if}
