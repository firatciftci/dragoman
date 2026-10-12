<script lang="ts">
  import type { Snippet } from "svelte";
  import { Tooltip } from "bits-ui";

  let {
    text,
    side = "bottom",
    children,
  }: {
    text: string;
    side?: "top" | "bottom" | "left" | "right";
    children: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props }: { props: Record<string, unknown> })}
      {@render children({ props })}
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content
      {side}
      sideOffset={6}
      collisionPadding={8}
      class="tooltip z-50 max-w-64 rounded-lg bg-text px-2.5 py-1.5 font-sans text-[13px] leading-snug font-medium text-surface shadow-[0_10px_24px_-10px_rgb(15_22_54/0.5)]"
    >
      {text}
      <Tooltip.Arrow class="text-text" width={10} height={5} />
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>

<style>
  :global(.tooltip) {
    transform-origin: var(--bits-tooltip-content-transform-origin);
    animation: rise 0.14s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  :global(.tooltip[data-state="closed"]) {
    animation: rise 0.1s ease-in reverse forwards;
  }
  @keyframes rise {
    from {
      opacity: 0;
      scale: 0.96;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.tooltip) {
      animation: none;
    }
  }
</style>
