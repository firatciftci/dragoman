<svelte:options css="injected" />

<script lang="ts">
  import { logos } from "@dragoman/brand/logos";
  import { on } from "svelte/events";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";

  let {
    items,
    value,
    labelledby,
    isDim,
    onpick,
  }: {
    items: Array<{
      value: string;
      model: string;
      provider: string;
      logo: string;
    }>;
    value: string;
    labelledby: string;
    isDim: boolean;
    onpick: (value: string) => void;
  } = $props();

  const id = $props.id();
  let trigger = $state<HTMLButtonElement>();
  let list = $state<HTMLDivElement>();
  let isOpen = $state(false);
  let active = $state(0);
  let place = $state({
    left: null as number | null,
    right: null as number | null,
    top: 0,
    bottom: 0,
    minWidth: 0,
    maxWidth: 0,
    height: 0,
  });
  let isAbove = $state(false);
  const typed = { text: "", at: 0 };

  const current = $derived(items.find((item) => item.value === value));

  const measure = () => {
    if (trigger == null) return;
    const rect = trigger.getBoundingClientRect();
    const viewWidth = innerWidth.current ?? 0;
    const viewHeight = innerHeight.current ?? 0;
    const isRtl = getComputedStyle(trigger).direction === "rtl";
    const below = viewHeight - rect.bottom - 14;
    const above = rect.top - 14;
    isAbove = below < 200 && above > below;
    const room = isRtl ? viewWidth - rect.left - 8 : rect.right - 8;
    place = {
      left: isRtl ? rect.left : null,
      right: isRtl ? null : viewWidth - rect.right,
      top: rect.bottom + 6,
      bottom: viewHeight - rect.top + 6,
      minWidth: Math.min(rect.width, room),
      maxWidth: Math.max(room, Math.min(rect.width, viewWidth - 16)),
      height: Math.min(320, isAbove ? above : below),
    };
  };

  const choose = (index: number) => {
    const item = items[index];
    if (item == null) return;
    list?.hidePopover();
    trigger?.focus();
    if (item.value !== value) onpick(item.value);
  };

  $effect(() => {
    if (!isOpen) return;
    const offs = [
      on(window, "scroll", measure, { capture: true, passive: true }),
      on(window, "resize", measure, { passive: true }),
    ];
    return () => {
      for (const off of offs) off();
    };
  });

  $effect(() => {
    if (isOpen)
      list
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  });
</script>

{#snippet logo(item: { provider: string; logo: string }, size: number)}
  {const mark = $derived(logos[item.logo])}
  {#if mark == null}
    <span
      class="letter"
      style:width="{size}px"
      style:height="{size}px"
      style:font-size="{size * 0.6}px"
      aria-hidden="true">{item.provider.slice(0, 1)}</span
    >
  {:else}
    <svg
      class="logo"
      class:ink={Number.parseInt(mark.color.slice(1), 16) < 0x30_30_30}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={mark.color}
      fill-rule="evenodd"
      aria-hidden="true"
    >
      <path d={mark.path} />
    </svg>
  {/if}
{/snippet}

<button
  bind:this={trigger}
  type="button"
  class="trigger"
  class:dim={isDim}
  popovertarget="{id}-list"
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-labelledby="{labelledby} {id}-value"
  onkeydown={(event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    list?.showPopover();
  }}
>
  {#if current != null}
    {@render logo(current, 16)}
  {/if}
  <span class="value" id="{id}-value">{current?.model ?? ""}</span>
  <svg class="chevron" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3.5 6 8 10.5 12.5 6"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<div
  bind:this={list}
  id="{id}-list"
  class="list"
  class:above={isAbove}
  popover="auto"
  role="listbox"
  tabindex="-1"
  aria-labelledby={labelledby}
  aria-activedescendant="{id}-{active}"
  style:left={place.left == null ? null : `${place.left}px`}
  style:right={place.right == null ? null : `${place.right}px`}
  style:top={isAbove ? null : `${place.top}px`}
  style:bottom={isAbove ? `${place.bottom}px` : null}
  style:min-width="{place.minWidth}px"
  style:max-width="{place.maxWidth}px"
  style:max-height="{place.height}px"
  onbeforetoggle={(event) => {
    if (event.newState !== "open") return;
    active = Math.max(
      0,
      items.findIndex((item) => item.value === value),
    );
    measure();
  }}
  ontoggle={(event) => {
    isOpen = event.newState === "open";
    if (isOpen) list?.focus({ preventScroll: true });
  }}
  onpointermove={(event) => {
    const index = (event.target as Element)
      .closest("[data-index]")
      ?.getAttribute("data-index");
    if (index != null) active = Number(index);
  }}
  onmousedown={(event) => event.preventDefault()}
  onclick={(event) => {
    const index = (event.target as Element)
      .closest("[data-index]")
      ?.getAttribute("data-index");
    if (index != null) choose(Number(index));
  }}
  onkeydown={(event) => {
    const last = items.length - 1;
    if (event.key === "ArrowDown") active = Math.min(active + 1, last);
    else if (event.key === "ArrowUp") active = Math.max(active - 1, 0);
    else if (event.key === "Home" || event.key === "PageUp") active = 0;
    else if (event.key === "End" || event.key === "PageDown") active = last;
    else if (event.key === "Enter" || event.key === " ") choose(active);
    else if (event.key === "Escape") {
      list?.hidePopover();
      trigger?.focus();
    } else if (event.key === "Tab") {
      list?.hidePopover();
      return;
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      typed.text =
        (event.timeStamp - typed.at > 700 ? "" : typed.text) +
        event.key.toLowerCase();
      typed.at = event.timeStamp;
      const start = typed.text.length === 1 ? active + 1 : active;
      const found = Array.from(
        items.keys(),
        (offset) => (start + offset) % items.length,
      ).find((index) =>
        items[index]?.model.toLowerCase().startsWith(typed.text),
      );
      if (found != null) active = found;
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }}
>
  {#each items as item, index (item.value)}
    <div
      id="{id}-{index}"
      class="option"
      class:active={index === active}
      role="option"
      aria-selected={item.value === value}
      data-index={index}
    >
      {@render logo(item, 16)}
      <span class="value">
        {item.model}
        <small>{item.provider}</small>
      </span>
      <svg class="check" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="m3.5 8.5 3 3 6-7"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  {/each}
</div>

<style>
  .trigger {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 7px;
    flex: none;
    max-width: 72%;
    min-height: 32px;
    padding-block: 5px;
    padding-inline: 8px 7px;
    border: 1px solid rgb(24 32 74 / 0.14);
    border-radius: 8px;
    background: #fffdf8;
    box-shadow: inset 0 -2px 0 rgb(24 32 74 / 0.14);
    font-size: 12.5px;
    cursor: pointer;
  }
  .trigger:hover,
  .trigger[aria-expanded="true"] {
    border-color: #5d6385;
  }
  .trigger:focus-visible {
    outline: 2px solid #e0ac3e;
    outline-offset: 2px;
  }
  .dim {
    opacity: 0.6;
  }
  .value {
    min-width: 0;
    flex: 1;
    overflow-wrap: anywhere;
  }
  .chevron {
    flex: none;
    width: 14px;
    height: 14px;
    color: #5d6385;
    transition: rotate 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  [aria-expanded="true"] .chevron {
    rotate: 180deg;
  }
  .logo {
    flex: none;
  }
  .letter {
    display: grid;
    flex: none;
    place-items: center;
    border-radius: 4px;
    background: #18204a;
    color: #f6f5ef;
    font-weight: 700;
    line-height: 1;
  }
  .list {
    position: fixed;
    inset: auto;
    box-sizing: border-box;
    width: max-content;
    margin: 0;
    padding: 5px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid #d9d2bf;
    border-radius: 12px;
    background: #fffdf8;
    color: #18204a;
    font:
      13px/1.35 system-ui,
      sans-serif;
    box-shadow: 0 22px 40px -18px rgb(15 22 54 / 0.5);
    outline: none;
    transform-origin: top;
    animation: open 0.16s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .above {
    transform-origin: bottom;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 9px;
    border-radius: 8px;
    cursor: pointer;
    outline: none;
  }
  .active {
    background: rgb(24 32 74 / 0.07);
  }
  [aria-selected="true"] .value {
    font-weight: 600;
  }
  small {
    display: block;
    margin-top: 1px;
    font-size: 11.5px;
    font-weight: 400;
    color: #5d6385;
    font-size: 11.5px;
  }
  .check {
    flex: none;
    width: 16px;
    height: 16px;
    color: #1e9c94;
    visibility: hidden;
  }
  [aria-selected="true"] .check {
    visibility: visible;
  }
  @keyframes open {
    from {
      opacity: 0;
      scale: 1 0.96;
    }
  }
  @media (prefers-color-scheme: dark) {
    .trigger {
      border-color: rgb(241 237 226 / 0.14);
      background: #18204a;
      box-shadow: inset 0 -2px 0 rgb(241 237 226 / 0.1);
    }
    .trigger:hover,
    .trigger[aria-expanded="true"] {
      border-color: #a3a9c8;
    }
    .chevron,
    small {
      color: #a3a9c8;
    }
    .ink {
      fill: currentColor;
    }
    .letter {
      background: #ece7da;
      color: #18204a;
    }
    .list {
      border-color: #2c3670;
      background: #1b2350;
      color: #ece7da;
      box-shadow: 0 22px 40px -18px rgb(0 0 0 / 0.7);
    }
    .active {
      background: rgb(241 237 226 / 0.08);
    }
    .check {
      color: #4cc7bd;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .list,
    .chevron {
      animation: none;
      transition: none;
    }
  }
</style>
