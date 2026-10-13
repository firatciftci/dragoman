<script lang="ts">
  const { text = "" }: { text?: string } = $props();
  const parts = $derived(text.split(/(?<![\w./-])(dragoman)(?![\w-]|\.\w)/));
</script>

<span
  >{#each parts as part, index (index)}{#if index % 2 === 1}<span class="brand"
        >{part}</span
      >{:else}{part}{/if}{/each}</span
>

<style>
  .brand {
    font-family: var(--font-brand);
    font-size: 1.08em;
    font-weight: 400;
    font-synthesis: none;
    line-height: 0;
    letter-spacing: 0.01em;
  }
</style>
