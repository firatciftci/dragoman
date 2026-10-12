<script lang="ts">
  import { Switch } from "bits-ui";

  let {
    checked = $bindable(),
    label,
    detail,
  }: { checked: boolean; label: string; detail?: string } = $props();

  const id = $props.id();
</script>

<div class="flex items-start gap-4 py-3">
  <div class="flex-1">
    <label for={id} class="block text-[15px] text-text">{label}</label>
    {#if detail != null}
      <p class="mt-0.5 text-sm text-muted">{detail}</p>
    {/if}
  </div>
  <Switch.Root
    {id}
    bind:checked
    class="peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-line bg-sunk shadow-[inset_0_2px_3px_rgb(15_22_54/0.18)] transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-turquoise"
  >
    <Switch.Thumb
      class="block size-6 translate-x-0.5 rounded-full bg-raised shadow-[0_2px_0_rgb(15_22_54/0.25),0_1px_4px_rgb(15_22_54/0.2)] transition-transform duration-200 ease-quill data-[state=checked]:translate-x-[1.375rem] rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[1.375rem]"
    />
  </Switch.Root>
</div>
