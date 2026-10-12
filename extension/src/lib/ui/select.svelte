<script lang="ts">
  import { Combobox } from "bits-ui";
  import { m } from "#lib/paraglide/messages.js";

  let {
    items,
    value = $bindable(),
    label,
    placeholder = m.search(),
    isInline = false,
  }: {
    items: Array<{
      value: string;
      label: string;
      detail?: string;
      badge?: string;
    }>;
    value: string;
    label: string;
    placeholder?: string;
    isInline?: boolean;
  } = $props();

  let query = $state("");
  let isOpen = $state(false);

  const selected = $derived(items.find((item) => item.value === value));
  const filtered = $derived.by(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === "") return items;
    return items.filter((item) =>
      `${item.label} ${item.detail ?? ""} ${item.value}`
        .toLocaleLowerCase()
        .includes(needle),
    );
  });
</script>

{#snippet list()}
  {#each filtered as item (item.value)}
    <Combobox.Item
      value={item.value}
      label={item.label}
      class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] data-highlighted:bg-sunk"
    >
      {#snippet children({ selected: isSelected })}
        <span class="flex-1 truncate">{item.label}</span>
        {#if item.detail != null}
          <span class="truncate text-xs text-muted">{item.detail}</span>
        {/if}
        {#if item.badge != null}
          <span
            class="shrink-0 rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-medium"
            >{item.badge}</span
          >
        {/if}
        <svg
          viewBox="0 0 16 16"
          class="size-4 shrink-0 text-turquoise"
          class:invisible={isSelected !== true}
          aria-hidden="true"
        >
          <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/snippet}
    </Combobox.Item>
  {:else}
    <p class="px-2.5 py-2 text-sm text-muted">{m.no_results()}</p>
  {/each}
{/snippet}

<Combobox.Root
  type="single"
  {items}
  bind:value
  bind:open={isOpen}
  onOpenChange={(next) => {
    if (!next) query = "";
  }}
>
  <div class="relative">
    {#key selected?.label}
      <Combobox.Input
        aria-label={label}
        defaultValue={selected?.label}
        {placeholder}
        oninput={(event) => (query = event.currentTarget.value)}
        onfocus={() => (isOpen = true)}
        class="h-11 w-full rounded-xl border border-line bg-raised ps-3.5 pe-10 text-[15px] text-text shadow-[inset_0_-2px_0_var(--line)] outline-none placeholder:text-muted focus:border-accent"
      />
    {/key}
    <Combobox.Trigger
      aria-label={label}
      class="absolute inset-y-0 end-0 grid w-10 cursor-pointer place-items-center text-muted"
    >
      <svg
        viewBox="0 0 16 16"
        class="size-4 transition-transform"
        class:rotate-180={isOpen}
        aria-hidden="true"
      >
        <path
          d="M3.5 6 8 10.5 12.5 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </Combobox.Trigger>
  </div>
  {#if isInline}
    <Combobox.ContentStatic
      class="mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-line bg-raised p-1.5 text-text"
    >
      {@render list()}
    </Combobox.ContentStatic>
  {:else}
    <Combobox.Portal>
      <Combobox.Content
        side="bottom"
        avoidCollisions={false}
        sideOffset={6}
        class="z-50 max-h-72 w-(--bits-combobox-anchor-width) overflow-y-auto rounded-xl border border-line bg-raised p-1.5 text-text shadow-[0_22px_40px_-18px_rgb(15_22_54/0.5)]"
      >
        {@render list()}
      </Combobox.Content>
    </Combobox.Portal>
  {/if}
</Combobox.Root>
