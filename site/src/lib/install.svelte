<script lang="ts">
  import { onMount } from "svelte";
  import { m } from "#lib/messages.ts";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { stores } from "#lib/stores.ts";

  let { small = false }: { small?: boolean } = $props();

  const docs = `${localizeHref("/docs")}#install`;

  let link = $state({ href: docs, label: m.get_dragoman() });

  onMount(() => {
    const agent = navigator.userAgent;
    const isApple =
      /iPhone|iPad|iPod/.test(agent) ||
      (agent.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (isApple || (agent.includes("Safari/") && !/Chrom|Edg|OPR/.test(agent)))
      link = { href: stores.safari, label: m.get_on_app_store() };
    else if (agent.includes("Firefox/") || agent.includes("Android"))
      link = { href: stores.firefox, label: m.add_to_firefox() };
    else {
      const name = agent.includes("Edg/")
        ? "Edge"
        : agent.includes("OPR/")
          ? "Opera"
          : agent.includes("Vivaldi")
            ? "Vivaldi"
            : "brave" in navigator
              ? "Brave"
              : "Chrome";
      link = {
        href: name === "Edge" ? stores.edge : stores.chrome,
        label: m.add_to_browser({ browser: name }),
      };
    }
  });
</script>

<a
  href={link.href}
  class={[
    "inline-flex shrink-0 items-center justify-center border-[#8e2214] bg-coral text-center leading-tight font-semibold text-tile shadow-[0_14px_30px_-12px_rgb(200_50_31/0.8)] transition-[translate,border-width,filter] hover:brightness-110 active:translate-y-0.5 active:border-b-2",
    {
      "min-h-14 rounded-2xl border-b-[5px] px-7 text-[17px]": !small,
      "min-h-10 rounded-xl border-b-4 px-4 text-[15px] whitespace-nowrap":
        small,
    },
  ]}
>
  {link.label}
</a>
