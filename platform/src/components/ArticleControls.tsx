"use client";
import { useEffect } from "react";

/** Progressive enhancements for article pages: code headers with copy, scrollable tables,
 *  a reading-progress bar and the current section highlighted in the table of contents. */
export function ArticleControls() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    document.querySelectorAll("[data-article] figure[data-rehype-pretty-code-figure]").forEach((figure) => {
      const pre = figure.querySelector("pre");
      if (!pre || figure.querySelector(".code-head")) return;
      pre.setAttribute("tabindex", "0");
      pre.setAttribute("aria-label", "Code block, horizontally scrollable");
      const head = document.createElement("div");
      head.className = "code-head";
      const lang = document.createElement("span");
      lang.textContent = pre.getAttribute("data-language") || "text";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent || "");
          button.textContent = "Copied ✓";
          setTimeout(() => (button.textContent = "Copy"), 1600);
        } catch {
          button.textContent = "Select to copy";
        }
      };
      button.addEventListener("click", copy);
      head.append(lang, button);
      figure.prepend(head);
      cleanups.push(() => head.remove());
    });
    document.querySelectorAll("[data-article] table").forEach((table) => {
      if (table.parentElement?.classList.contains("table-wrap")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrap";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Table, horizontally scrollable");
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.append(table);
      cleanups.push(() => wrapper.replaceWith(table));
    });

    // effects can run twice in development: keep the source and render each diagram once
    const diagrams = [...document.querySelectorAll<HTMLElement>("[data-article] .mermaid-diagram:not([data-state])")];
    diagrams.forEach((fig) => {
      fig.dataset.state = "pending";
      fig.dataset.src = fig.querySelector(".mermaid-src")?.textContent || "";
    });
    if (diagrams.length) {
      import("mermaid").then(async ({ default: mermaid }) => {
        const css = getComputedStyle(document.documentElement);
        const v = (name: string) => css.getPropertyValue(name).trim();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "Departure, ui-monospace, monospace",
          themeVariables: {
            background: "transparent",
            primaryColor: v("--bg-2"),
            primaryTextColor: v("--ink-strong"),
            primaryBorderColor: v("--accent"),
            lineColor: v("--accent"),
            secondaryColor: v("--bg"),
            tertiaryColor: v("--bg"),
            textColor: v("--ink"),
            noteBkgColor: v("--bg-2"),
            noteTextColor: v("--ink"),
          },
        });
        for (const [i, fig] of diagrams.entries()) {
          const src = fig.dataset.src || "";
          try {
            const { svg } = await mermaid.render(`mermaid-${Date.now().toString(36)}-${i}`, src);
            fig.innerHTML = svg;
            fig.dataset.state = "done";
            fig.classList.add("is-rendered");
          } catch {
            fig.classList.add("is-error");
          }
        }
      });
    }

    const bar = document.querySelector<HTMLElement>(".read-progress");
    const article = document.querySelector<HTMLElement>("[data-article]");
    const onScroll = () => {
      if (!bar || !article) return;
      const r = article.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      bar.style.transform = `scaleX(${p})`;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => removeEventListener("scroll", onScroll));

    const links = new Map<string, HTMLAnchorElement[]>();
    document.querySelectorAll<HTMLAnchorElement>(".toc a, .mobile-toc a").forEach((a) => {
      const id = decodeURIComponent(a.hash.slice(1));
      links.set(id, [...(links.get(id) || []), a]);
    });
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        links.forEach((as) => as.forEach((a) => a.removeAttribute("aria-current")));
        links.get(visible.target.id)?.forEach((a) => a.setAttribute("aria-current", "location"));
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    document.querySelectorAll("[data-article] h2[id], [data-article] h3[id]").forEach((h) => io.observe(h));
    cleanups.push(() => io.disconnect());

    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}
