/** Experience: print with every role's details expanded, then restore them. */
export function initPrint() {
  document.querySelectorAll<HTMLButtonElement>("[data-print]").forEach((button) =>
    button.addEventListener("click", () => {
      const entries = [...document.querySelectorAll<HTMLDetailsElement>("details.role-details")];
      const states = entries.map((e) => e.open);
      entries.forEach((e) => (e.open = true));
      addEventListener("afterprint", () => entries.forEach((e, i) => (e.open = states[i])), { once: true });
      print();
    }),
  );
}
