<script lang="ts">
  import { onMount } from "svelte";
  import type { Browser } from "#lib/agent.ts";
  import { detect } from "#lib/agent.ts";
  import Emblem from "#lib/emblem.svelte";
  import { m } from "#lib/messages.ts";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { stores } from "#lib/stores.ts";

  let { small = false }: { small?: boolean } = $props();

  const docs = `${localizeHref("/docs")}#install`;

  let link = $state<{ href: string; label: string; name: Browser | null }>({
    href: docs,
    label: m.get_dragoman(),
    name: null,
  });

  onMount(() => {
    const { name, family, isPhone } = detect();
    if (family === "safari")
      link = {
        href: stores.safari,
        label: m.get_on_app_store(),
        name: "Safari",
      };
    else if (family === "firefox" || (family == null && isPhone))
      link = {
        href: stores.firefox,
        label: m.add_to_firefox(),
        name: "Firefox",
      };
    else if (family === "chromium" && name != null)
      link = {
        href: name === "Edge" ? stores.edge : stores.chrome,
        label: m.add_to_browser({ browser: name }),
        name,
      };
  });
</script>

<a
  href={link.href}
  class={[
    "inline-flex shrink-0 items-center justify-center gap-2.5 border-[#8e2214] bg-coral text-center leading-tight font-semibold text-tile shadow-[0_14px_30px_-12px_rgb(200_50_31/0.8)] transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2",
    {
      "min-h-14 rounded-2xl border-b-[5px] px-7 text-[17px]": !small,
      "min-h-10 rounded-xl border-b-4 px-4 text-[15px] whitespace-nowrap":
        small,
    },
  ]}
>
  {#if link.name != null}
    <Emblem name={link.name} isPlain class={small ? "size-[18px]" : "size-5"} />
  {/if}
  {link.label}
</a>
