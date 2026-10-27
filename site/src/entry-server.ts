import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Layout from "./components/Layout.vue";
import { renderHead } from "./head";
import { notFoundPage, routes, type Page, type RenderContext } from "./routes";

export type Assets = {
  /** <link>/<script> tags for the stylesheet and the client entry. */
  tags: string;
  /** modulepreload tags for an island, by name (production only). */
  islandPreloads?: (name: string) => string;
};
export type Rendered = { status: number; html: string };

/** Renders one URL to a complete HTML document. Used by the dev server and the prerenderer. */
export async function render(url: string, ctx: RenderContext, assets: Assets): Promise<Rendered> {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(url);
  await router.isReady();
  const route = router.currentRoute.value;
  const loaded = route.meta.load ? await route.meta.load(route.params as Record<string, string>, ctx) : null;
  const page: Page = loaded ?? notFoundPage();
  if (!loaded) await router.replace({ path: "/__not-found", query: {} });

  const app = createSSRApp({
    render: () =>
      h(Layout, { path: route.path }, () =>
        h(RouterView, null, { default: ({ Component }: { Component: unknown }) => h(Component as never, page.props) }),
      ),
  });
  app.use(router);
  const body = await renderToString(app);
  const islands = [...new Set([...body.matchAll(/data-island="([A-Za-z]+)"/g)].map((m) => m[1]))];
  const preloads = assets.islandPreloads ? islands.map(assets.islandPreloads).join("") : "";
  const indexSite = process.env.INDEX_SITE === "true";
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script>try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}</script>
    <link rel="icon" href="/icon.svg">
    <link rel="preload" href="/fonts/DepartureMono-Regular.woff2" as="font" type="font/woff2" crossorigin="anonymous">
    ${renderHead(page.head, indexSite)}
    ${assets.tags}${preloads}
  </head>
  <body>${body}</body>
</html>
`;
  return { status: page.status ?? 200, html };
}

/** Every public path to prerender (dynamic routes expanded from content). */
export async function prerenderPaths(): Promise<string[]> {
  const { getArticles, getLab, getProjects } = await import("./lib/content.server");
  return [
    "/",
    "/lab",
    ...(await getLab()).sections.flatMap((s) => [`/lab/section/${s.id}`, ...s.categories.map((c) => `/lab/section/${s.id}/${c.id}`)]),
    ...(await getArticles()).map((a) => `/lab/${a.slug}`),
    "/workbench",
    ...(await getProjects()).map((p) => `/workbench/${p.slug}`),
    "/experience",
    "/achievements",
    "/about",
    "/calendar",
    "/admin",
  ];
}
export { getArticles, getLab, getProjects, getActiveOutfit, articleSummary, thumbnailSources } from "./lib/content.server";
