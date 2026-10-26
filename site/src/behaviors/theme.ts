/** The light/dark buttons (nav bar, admin console): flip data-theme, remember it, keep aria-pressed in step. */
/** Also called after islands hydrate, so buttons rendered by an island pick up the current state. */
export function syncTheme() {
  const root = document.documentElement;
  const light = root.dataset.theme === "light";
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((b) => {
    b.hidden = false;
    b.setAttribute("aria-pressed", String(light));
    b.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  });
}

export function initTheme() {
  const root = document.documentElement;
  syncTheme();
  document.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("[data-theme-toggle]")) return;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  });
  // The room's window flips the theme too; anything that changes it lands here.
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
}
