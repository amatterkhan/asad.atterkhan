/** Sprite sheets animate only while on screen and while the tab is visible. */
export function initSprites() {
  const onScreen = new WeakMap<Element, boolean>();
  const update = (el: Element) => {
    if (onScreen.get(el) && !document.hidden) el.setAttribute("data-playing", "");
    else el.removeAttribute("data-playing");
  };
  const io = new IntersectionObserver((entries) =>
    entries.forEach((entry) => {
      onScreen.set(entry.target, entry.isIntersecting);
      update(entry.target);
    }),
  );
  const watch = (scope: ParentNode) => scope.querySelectorAll(".sprite").forEach((el) => io.observe(el));
  watch(document);
  // islands may add sprites (or swap them) after hydration
  new MutationObserver((records) =>
    records.forEach((r) =>
      r.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.matches(".sprite")) io.observe(n);
        watch(n);
      }),
    ),
  ).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("visibilitychange", () => document.querySelectorAll(".sprite").forEach(update));
}
