<script lang="ts">
  import Brand from "#lib/brand.svelte";
  import { m } from "#lib/messages.ts";
  import { getLocale } from "#lib/paraglide/runtime.js";

  const updated = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(Date.UTC(2026, 9, 14));
  const permissions = [
    [m.privacy_permission_sites(), m.privacy_permission_sites_detail()],
    [m.privacy_permission_storage(), m.privacy_permission_storage_detail()],
    [m.privacy_permission_offscreen(), m.privacy_permission_engine_detail()],
    [m.privacy_permission_identity(), m.privacy_permission_signin_detail()],
    [m.privacy_permission_native(), m.privacy_permission_native_detail()],
  ];
</script>

<svelte:head>
  <title>{m.privacy_title()} | dragoman</title>
</svelte:head>

<div class="bg-cobalt text-tile">
  <div class="mx-auto max-w-6xl px-5 pt-32 pb-16">
    <h1 class="font-display text-[clamp(36px,6vw,76px)] leading-none">
      {m.privacy_title()}
    </h1>
    <p class="mt-4 max-w-xl text-[18px] text-tile/80">
      <Brand text={m.privacy_intro()} />
    </p>
  </div>
</div>

<article
  class="mx-auto max-w-6xl px-5 py-16 text-[17px] leading-[1.7] *:max-w-[68ch]"
>
  <p class="text-[15px] text-muted">
    {m.privacy_updated({ date: updated })}
  </p>

  <section class="mt-10">
    <h2 class="font-display text-[34px] leading-tight">
      {m.privacy_device_title()}
    </h2>
    <p class="mt-4">{m.privacy_device_local()}</p>
    <p class="mt-4"><Brand text={m.privacy_saved()} /></p>
    <p class="mt-4"><Brand text={m.privacy_detect()} /></p>
  </section>

  <section class="mt-16">
    <h2 class="font-display text-[34px] leading-tight">
      {m.privacy_sent_title()}
    </h2>
    <p class="mt-4"><Brand text={m.privacy_model_text()} /></p>
    <p class="mt-4"><Brand text={m.privacy_firefox_consent()} /></p>
    <p class="mt-4"><Brand text={m.privacy_models()} /></p>
    <p class="mt-4"><Brand text={m.privacy_prices()} /></p>
    <p class="mt-4">{m.privacy_openrouter()}</p>
    <p class="mt-4"><Brand text={m.privacy_openrouter_return()} /></p>
  </section>

  <section class="mt-16">
    <h2 class="font-display text-[34px] leading-tight">
      <Brand text={m.privacy_never_title()} />
    </h2>
    <p class="mt-4">{m.privacy_never()}</p>
  </section>

  <section class="mt-16">
    <h2 class="font-display text-[34px] leading-tight">
      {m.privacy_permissions_title()}
    </h2>
    <dl
      class="mt-6 divide-y divide-line rounded-3xl bg-raised px-6 shadow-[inset_0_-4px_0_var(--line)]"
    >
      {#each permissions as [name, detail] (name)}
        <div class="py-5">
          <dt class="font-semibold">{name}</dt>
          <dd class="mt-1 text-muted">{detail}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="mt-16">
    <h2 class="font-display text-[34px] leading-tight">
      {m.privacy_site_title()}
    </h2>
    <p class="mt-4"><Brand text={m.privacy_site()} /></p>
    <p class="mt-4">{m.privacy_newsletter()}</p>
    <p class="mt-4">{m.privacy_changes()}</p>
  </section>
</article>
