import { initCursor } from "./behaviors/cursor";
import { initNav } from "./behaviors/nav";
import { initSprites } from "./behaviors/sprites";
import { initVisibility } from "./behaviors/visibility";
import { initArticle } from "./behaviors/article";
import { initPrint } from "./behaviors/print";

// Pages are static HTML. Small behaviours (no framework) run everywhere; Vue loads only on pages
// with islands, and each island's code loads only where it appears.
initVisibility();
initCursor();
initNav();
initSprites();
initArticle();
initPrint();

const islands = import.meta.glob<{ default: import("vue").Component }>("./islands/*.vue");
const marks = document.querySelectorAll<HTMLElement>("[data-island]");
if (marks.length) {
  const { createSSRApp } = await import("vue");
  await Promise.all(
    [...marks].map(async (el) => {
      const load = islands[`./islands/${el.dataset.island}.vue`];
      if (!load) return;
      const { default: component } = await load();
      createSSRApp(component, JSON.parse(el.dataset.props || "{}")).mount(el);
    }),
  );
}
