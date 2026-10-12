<script lang="ts">
  import { logos } from "./logos.ts";

  let {
    id,
    name,
    size = 22,
  }: { id: string; name: string; size?: number } = $props();

  const logo = $derived(logos[id]);
  const isDark = $derived(
    logo != null && Number.parseInt(logo.color.slice(1), 16) < 0x30_30_30,
  );
</script>

{#if logo == null}
  <span
    class="grid shrink-0 place-items-center rounded-md bg-ink font-display leading-none text-tile"
    style:width="{size}px"
    style:height="{size}px"
    style:font-size="{size * 0.6}px"
    aria-hidden="true">{name.slice(0, 1)}</span
  >
{:else}
  <svg
    class="shrink-0"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    fill={isDark ? "currentColor" : logo.color}
    fill-rule="evenodd"
  >
    <path d={logo.path} />
  </svg>
{/if}
