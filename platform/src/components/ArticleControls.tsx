"use client";
import { useEffect } from "react";
export function ArticleControls() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    document
      .querySelectorAll("[data-article] figure[data-rehype-pretty-code-figure]")
      .forEach((figure) => {
        const pre = figure.querySelector("pre");
        if (!pre) return;
        pre.setAttribute("tabindex", "0");
        pre.setAttribute("aria-label", "Code block, horizontally scrollable");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-code";
        button.textContent = "Copy code";
        const copy = async () => {
          try {
            await navigator.clipboard.writeText(pre.textContent || "");
            button.textContent = "Copied";
            button.setAttribute("aria-label", "Code copied");
          } catch {
            button.textContent = "Select code to copy";
          }
        };
        button.addEventListener("click", copy);
        figure.prepend(button);
        cleanups.push(() => button.remove());
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
      cleanups.push(() => {
        wrapper.replaceWith(table);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}
