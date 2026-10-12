<script lang="ts">
  import { page } from "$app/state";
  import Lost from "#lib/lost.svelte";
  import { m } from "#lib/messages.ts";
</script>

<svelte:head>
  <title
    >{page.status === 404 ? m.lost_title() : m.error_title()} | dragoman</title
  >
  <meta name="robots" content="noindex" />
</svelte:head>

<Lost status={page.status} />
