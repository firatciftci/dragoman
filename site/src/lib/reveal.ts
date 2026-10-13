import type { Attachment } from "svelte/attachments";

export const reveal: Attachment<HTMLElement> = (node) => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting !== true) return;
      node.dataset.shown = "";
      observer.disconnect();
    },
    { threshold: 0.35 },
  );
  observer.observe(node);
  return () => observer.disconnect();
};
