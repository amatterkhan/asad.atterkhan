import type { Component } from "vue";
import type { RouteRecordRaw } from "vue-router";
import type { Head } from "./head";
import { site } from "./lib/site";
import {
  articleSummary,
  getAchievements,
  getArticles,
  getDraftArticles,
  isCurrent,
  getExperience,
  getActiveOutfit,
  getFeaturedAchievements,
  getLab,
  getThoughts,
  getProfiles,
  getProjects,
  getSiteCopy,
  parseArticle,
  projectWriteup,
} from "./lib/content.server";
import { renderMarkdown } from "./lib/markdown";
import { personJsonLd } from "./lib/person";
import { neighbours, tagCounts, tagSlug, toLabEntry } from "./lib/lab-index";
import Home from "./pages/Home.vue";
import Lab from "./pages/Lab.vue";
import ArticlePage from "./pages/ArticlePage.vue";
import ArticleView from "./pages/Article.vue";
import Workbench from "./pages/Workbench.vue";
import Project from "./pages/Project.vue";
import Experience from "./pages/Experience.vue";
import Achievements from "./pages/Achievements.vue";
import About from "./pages/About.vue";
import Disclosure from "./pages/Disclosure.vue";
import Calendar from "./pages/Calendar.vue";
import Admin from "./pages/Admin.vue";
import NotFound from "./pages/NotFound.vue";
import Styleguide from "./pages/Styleguide.vue";

export type RenderContext = { dev: boolean; root: string };
export type Page = { props: Record<string, unknown>; head: Head; status?: number };
export type Loader = (params: Record<string, string>, ctx: RenderContext) => Promise<Page | null>;
declare module "vue-router" {
  interface RouteMeta {
    load?: Loader;
  }
}

const strip = <T extends { body: string; searchText: string }>({ body: _b, searchText: _s, ...rest }: T) => rest;

/** A Lab section with how many published articles it (and each category) holds. */
export type LabMapSection = Awaited<ReturnType<typeof labMap>>["sections"][number];
async function labMap() {
  const [lab, articles] = await Promise.all([getLab(), getArticles()]);
  const sections = lab.sections.map((s) => {
    const inSection = articles.filter((a) => a.shelf!.section === s.id);
    return {
      ...s,
      count: inSection.length,
      categories: s.categories.map((c) => ({ ...c, count: inSection.filter((a) => a.shelf!.category === c.id).length })),
    };
  });
  return { sections, articles };
}
/** /lab, /lab/section/:section[/:category] and /lab/tag/:tag: one ledger, filtered. In development, private drafts are listed too. */
const labPage =
  (scope: "all" | "section" | "category" | "tag"): Loader =>
  async ({ section: sectionId, category: categoryId, tag: tagId }, ctx) => {
    const { sections, articles } = await labMap();
    const copy = await getSiteCopy();
    const drafts = ctx.dev ? await getDraftArticles() : [];
    const rows = [...articles.map((a) => ({ a, draft: false })), ...drafts.map((a) => ({ a, draft: true }))];
    const pick = (keep: (a: (typeof articles)[number]) => boolean) => rows.filter((r) => keep(r.a)).map((r) => toLabEntry(r.a, r.draft));
    if (scope === "all")
      return {
        props: { intro: copy.labIntro, sections, entries: pick(() => true), tags: tagCounts(articles) },
        head: { title: "The Lab", description: copy.shareLab, canonical: "/lab" },
      };
    if (scope === "tag") {
      const tags = tagCounts(articles);
      const tag = tags.find((t) => t.slug === tagId);
      if (!tag) return null;
      return {
        props: { intro: copy.labIntro, sections, active: { tag: tag.slug }, entries: pick((a) => a.tags.some((t) => tagSlug(t) === tag.slug)), tags },
        head: { title: `Tagged ${tag.label} · The Lab`, description: `Lab entries tagged ${tag.label}.`, canonical: `/lab/tag/${tag.slug}` },
      };
    }
    const section = sections.find((s) => s.id === sectionId);
    const category = scope === "category" ? section?.categories.find((c) => c.id === categoryId) : undefined;
    if (!section || (scope === "category" && !category)) return null;
    const here = (a: (typeof articles)[number]) => a.shelf!.section === section.id && (!category || a.shelf!.category === category.id);
    const path = `/lab/section/${section.id}${category ? `/${category.id}` : ""}`;
    return {
      props: {
        intro: copy.labIntro,
        sections,
        active: { section: section.id, category: category?.id },
        entries: pick(here),
        tags: tagCounts(articles.filter(here)),
      },
      head: {
        title: category ? `${category.name} · ${section.name}` : `${section.name} · The Lab`,
        description: section.blurb || `${section.name} in Asad's Lab.`,
        canonical: path,
      },
    };
  };

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: Home,
    meta: {
      load: async () => ({
        props: {
          copy: await getSiteCopy(),
          articles: (await getArticles()).filter(isCurrent).slice(0, 3).map(articleSummary),
          projects: (await getProjects()).filter((p) => p.featured).sort((a, b) => b.date.localeCompare(a.date)),
          outfit: await getActiveOutfit(),
          thoughts: await getThoughts(),
          profiles: await getProfiles(),
        },
        head: {
          description: (await getSiteCopy()).shareHome,
          canonical: "/",
          jsonLd: personJsonLd(await getProfiles(), (await getExperience()).work),
        },
      }),
    },
  },
  { path: "/lab", component: Lab, meta: { load: labPage("all") } },
  { path: "/lab/section/:section", component: Lab, meta: { load: labPage("section") } },
  { path: "/lab/section/:section/:category", component: Lab, meta: { load: labPage("category") } },
  { path: "/lab/tag/:tag", component: Lab, meta: { load: labPage("tag") } },
  {
    path: "/lab/:slug",
    component: ArticlePage,
    meta: {
      load: async ({ slug }) => {
        const articles = await getArticles();
        const article = articles.find((a) => a.slug === slug);
        if (!article) return null;
        const { html, toc } = await renderMarkdown(article.body);
        // Nearby: the same category first, then the same section, then shared tags.
        const score = (a: (typeof articles)[number]) =>
          (article.shelf!.category && a.shelf!.category === article.shelf!.category ? 4 : 0) +
          (a.shelf!.section === article.shelf!.section ? 2 : 0) +
          (a.tags.some((t) => article.tags.includes(t)) ? 1 : 0);
        const related = articles
          .filter((a) => a.slug !== slug && score(a) > 0)
          .sort((a, b) => score(b) - score(a))
          .slice(0, 3)
          .map((a) => ({ slug: a.slug, title: a.title, thumb: a.thumb, shelf: a.shelf! }));
        return {
          props: { article: strip(article), html, toc, related, ...neighbours(articles, slug) },
          head: {
            title: article.title,
            description: article.description,
            canonical: `/lab/${slug}`,
            image: `/lab/${slug}/opengraph-image.png`,
            article: { publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: article.title,
              description: article.description,
              datePublished: article.publishedAt,
              dateModified: article.updatedAt || article.publishedAt,
              author: { "@type": "Person", name: site.name, url: site.url },
              mainEntityOfPage: `${site.url}/lab/${article.slug}`,
            },
          },
        };
      },
    },
  },
  {
    // development only: unpublished fixtures and gitignored private drafts
    path: "/preview/:slug",
    component: ArticleView,
    meta: {
      load: async ({ slug }, ctx) => {
        if (!ctx.dev || !/^[a-z0-9-]+$/.test(slug)) return null;
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const file =
          slug === "reading-layout" ? join(ctx.root, "tests/fixtures/article.md") : join(ctx.root, "content/drafts", slug + ".md");
        const source = await readFile(file, "utf8").catch(() => null);
        if (source === null) return null;
        const article = parseArticle(source, `${slug}.md`);
        const { html, toc } = await renderMarkdown(article.body);
        return { props: { article: strip(article), html, toc, draft: true }, head: { title: "Local draft preview", noindex: true } };
      },
    },
  },
  {
    // development only: every design-system component on one page (never prerendered)
    path: "/styleguide",
    component: Styleguide,
    meta: {
      load: async (_params, ctx) => {
        if (!ctx.dev) return null;
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const { html } = await renderMarkdown(parseArticle(await readFile(join(ctx.root, "tests/fixtures/article.md"), "utf8")).body);
        return { props: { html }, head: { title: "Components", noindex: true } };
      },
    },
  },
  {
    path: "/workbench",
    component: Workbench,
    meta: {
      load: async () => ({
        props: {
          intro: (await getSiteCopy()).workbenchIntro,
          projects: (await getProjects())
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(({ slug, title, description, tags, categories }) => ({ slug, title, description, tags, categories })),
        },
        head: { title: "Workbench", description: (await getSiteCopy()).shareWorkbench, canonical: "/workbench" },
      }),
    },
  },
  {
    path: "/workbench/:slug",
    component: Project,
    meta: {
      load: async ({ slug }) => {
        const project = (await getProjects()).find((p) => p.slug === slug);
        if (!project) return null;
        const writeup = await projectWriteup(project);
        return {
          props: { project, writeup: writeup?.html ?? null },
          head: { title: project.title, description: project.description, canonical: `/workbench/${slug}` },
        };
      },
    },
  },
  {
    path: "/experience",
    component: Experience,
    meta: {
      load: async () => ({
        props: { intro: (await getSiteCopy()).experienceIntro, resumeUrl: (await getSiteCopy()).resumeUrl, ...(await getExperience()), featured: await getFeaturedAchievements() },
        head: { title: "Experience", description: (await getSiteCopy()).shareExperience, canonical: "/experience" },
      }),
    },
  },
  {
    path: "/achievements",
    component: Achievements,
    meta: {
      load: async () => ({
        props: { intro: (await getSiteCopy()).achievementsIntro, records: await getAchievements() },
        head: { title: "Achievements", description: (await getSiteCopy()).shareAchievements, canonical: "/achievements" },
      }),
    },
  },
  {
    path: "/about",
    component: About,
    meta: {
      load: async () => ({
        props: { html: (await renderMarkdown((await getSiteCopy()).aboutBody)).html, outfit: await getActiveOutfit() },
        head: {
          title: "About",
          description: (await getSiteCopy()).shareAbout,
          canonical: "/about",
          jsonLd: personJsonLd(await getProfiles(), (await getExperience()).work),
        },
      }),
    },
  },
  {
    path: "/disclosure",
    component: Disclosure,
    meta: {
      load: async () => ({
        props: {},
        head: { title: "Disclosure", description: "How findings are disclosed in the Lab.", canonical: "/disclosure" },
      }),
    },
  },
  {
    path: "/calendar",
    component: Calendar,
    meta: { load: async () => ({ props: {}, head: { title: "Calendar", noindex: true } }) },
  },
  {
    path: "/admin",
    component: Admin,
    meta: { load: async () => ({ props: {}, head: { title: "Desk", noindex: true } }) },
  },
  { path: "/:pathMatch(.*)*", component: NotFound },
];

export const notFoundPage = (): Page => ({ props: {}, head: { noindex: true }, status: 404 });
export const notFoundComponent: Component = NotFound;
