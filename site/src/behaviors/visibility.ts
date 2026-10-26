/** Pauses CSS animation while the tab is hidden (reduced motion is handled in CSS). */
export function initVisibility() {
  const update = () => {
    document.documentElement.dataset.visibility = document.hidden ? "hidden" : "visible";
  };
  update();
  document.addEventListener("visibilitychange", update);
}
