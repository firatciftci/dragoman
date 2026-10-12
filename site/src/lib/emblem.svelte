<script lang="ts">
  import type { Browser } from "#lib/agent.ts";
  import { marks } from "#lib/agent.ts";

  let {
    name,
    class: className = "size-6",
    isPlain = false,
  }: { name: Browser; class?: string; isPlain?: boolean } = $props();

  const mark = $derived(marks[name]);
  const fill = $derived(isPlain ? "currentColor" : mark.color);
</script>

<svg viewBox="0 0 24 24" class={["shrink-0", className]} aria-hidden="true">
  {#if mark.path != null}
    <path d={mark.path} {fill} />
  {:else}
    <circle
      cx="12"
      cy="12"
      r={isPlain ? 10.6 : 12}
      fill={isPlain ? "none" : fill}
      stroke={isPlain ? fill : "none"}
      stroke-width="2.4"
    />
    <text
      x="12"
      y="16.4"
      text-anchor="middle"
      font-size="12.5"
      font-weight="700"
      font-family="system-ui, sans-serif"
      fill={isPlain ? fill : "#fff"}>{name.charAt(0)}</text
    >
  {/if}
</svg>
