"use client";
export function PrintButton() {
  return (
    <button
      className="print-button"
      onClick={() => {
        const entries = Array.from(
          document.querySelectorAll<HTMLDetailsElement>("details.role-details"),
        );
        const states = entries.map((e) => e.open);
        entries.forEach((e) => (e.open = true));
        window.addEventListener(
          "afterprint",
          () => entries.forEach((e, i) => (e.open = states[i])),
          { once: true },
        );
        window.print();
      }}
    >
      Print / save PDF
    </button>
  );
}
