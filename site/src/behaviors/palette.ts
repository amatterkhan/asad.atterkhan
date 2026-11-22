/** The command palette (/ or Ctrl+K) and the "?" shortcut overlay. The page list is in the HTML
 *  (components/Palette.vue); Lab entries come from /search.json the first time the palette opens.
 *  Built with DOM calls only: no innerHTML, so Trusted Types has nothing to check. */
type Row = { href: string; label: string; kind: string; text: string };

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function initPalette() {
  const palette = document.querySelector<HTMLDialogElement>("dialog[data-palette]");
  const shortcuts = document.querySelector<HTMLDialogElement>("dialog[data-shortcuts]");
  const input = palette?.querySelector<HTMLInputElement>("[data-palette-input]");
  const list = palette?.querySelector<HTMLUListElement>("[data-palette-list]");
  const status = palette?.querySelector<HTMLElement>("[data-palette-status]");
  if (!palette || !shortcuts || !input || !list || !status) return;

  const rows: Row[] = [...list.querySelectorAll<HTMLLIElement>("li")].map((li) => ({
    href: li.dataset.href!,
    label: li.querySelector("span")!.textContent!,
    kind: li.dataset.kind!,
    text: li.textContent!.toLowerCase(),
  }));
  let fetched = false;
  let active = 0;
  let shown: Row[] = rows;

  const loadEntries = () => {
    if (fetched) return;
    fetched = true;
    fetch("/search.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((all: { slug: string; title: string; description?: string; tags?: string[] }[]) => {
        for (const a of all)
          rows.push({ href: `/lab/${a.slug}`, label: a.title, kind: "Lab", text: `${a.title} ${a.description ?? ""} ${(a.tags ?? []).join(" ")}`.toLowerCase() });
        render();
      })
      .catch(() => {});
  };

  const render = () => {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    shown = rows.filter((r) => words.every((w) => r.text.includes(w))).slice(0, 12);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren(
      ...shown.map((r, i) => {
        const li = document.createElement("li");
        li.id = `palette-option-${i}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === active));
        const label = document.createElement("span");
        label.textContent = r.label;
        const kind = document.createElement("small");
        kind.textContent = r.kind;
        li.append(label, kind);
        li.addEventListener("click", () => go(r));
        li.addEventListener("mousemove", () => {
          if (active !== i) (active = i), mark();
        });
        return li;
      }),
    );
    mark();
    status.textContent = shown.length ? `${shown.length} ${shown.length === 1 ? "result" : "results"}` : "No results";
  };
  const mark = () => {
    list.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    if (shown.length) {
      input.setAttribute("aria-activedescendant", `palette-option-${active}`);
      list.children[active]?.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  };
  const go = (r: Row) => {
    palette.close();
    location.assign(r.href);
  };
  const open = () => {
    if (palette.open) return;
    shortcuts.close();
    input.value = "";
    active = 0;
    render();
    palette.showModal();
    input.focus();
    loadEntries();
  };

  input.addEventListener("input", () => ((active = 0), render()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : shown.length - 1)) % shown.length;
      mark();
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      go(shown[active]);
    }
  });
  // a click on the backdrop (outside the box) closes it
  for (const d of [palette, shortcuts]) d.addEventListener("click", (e) => e.target === d && d.close());

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.open ? palette.close() : open();
      return;
    }
    if (mod || typing(e.target) || document.querySelector("dialog[open]:not([data-palette]):not([data-shortcuts])")) return;
    if (e.key === "/") {
      e.preventDefault();
      open();
    } else if (e.key === "?") {
      e.preventDefault();
      if (!shortcuts.open) shortcuts.showModal();
    }
  });
}
