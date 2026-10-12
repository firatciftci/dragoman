<script lang="ts">
  import Lost from "#lib/lost.svelte";
  import { m } from "#lib/messages.ts";
</script>

<svelte:head>
  <title>{m.lost_title()} | dragoman</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Lost status={404} />
