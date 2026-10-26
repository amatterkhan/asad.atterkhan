/** The mobile menu: a modal <dialog> opened by the Menu button; Escape and links close it. */
export function initNav() {
  const dialog = document.querySelector<HTMLDialogElement>("dialog[data-menu]");
  const trigger = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  if (!dialog || !trigger) return;
  trigger.addEventListener("click", () => dialog.showModal());
  dialog.querySelector("[data-menu-close]")?.addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("close", () => trigger.focus());
}
