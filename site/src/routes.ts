import type { Component } from "vue";
import type { RouteRecordRaw } from "vue-router";
import type { Head } from "./head";
import { site } from "./lib/site";
import {
  articleSummary,
  getAchievements,
  getArticles,
  getExperience,
  getActiveOutfit,
  getFeaturedAchievements,
  getProjects,
  getSiteCopy,
  parseArticle,
  projectWriteup,
} from "./lib/content.server";
import { renderMarkdown } from "./lib/markdown";
import Home from "./pages/Home.vue";
import Lab from "./pages/Lab.vue";
import ArticlePage from "./pages/ArticlePage.vue";
import ArticleView from "./pages/Article.vue";
import Workbench from "./pages/Workbench.vue";
import Project from "./pages/Project.vue";
import Experience from "./pages/Experience.vue";
import Achievements from "./pages/Achievements.vue";
import About from "./pages/About.vue";
import Calendar from "./pages/Calendar.vue";
import Admin from "./pages/Admin.vue";
import NotFound from "./pages/NotFound.vue";

export type RenderContext = { dev: boolean; root: string };
export type Page = { props: Record<string, unknown>; head: Head; status?: number };
export type Loader = (params: Record<string, string>, ctx: RenderContext) => Promise<Page | null>;
declare module "vue-router" {
  interface RouteMeta {
    load?: Loader;
  }
}

const strip = <T extends { body: string; searchText: string }>({ body: _b, searchText: _s, ...rest }: T) => rest;

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: Home,
    meta: {
      load: async () => ({
        props: {
          copy: await getSiteCopy(),
          articles: (await getArticles()).slice(0, 3).map(articleSummary),
          projects: (await getProjects()).filter((p) => p.featured).sort((a, b) => b.date.localeCompare(a.date)),
          outfit: await getActiveOutfit(),
        },
        head: {
          canonical: "/",
          jsonLd: { "@context": "https://schema.org", "@type": "Person", name: site.name, url: site.url, sameAs: [site.github, site.linkedin] },
        },
      }),
    },
  },
  {
    path: "/lab",
    component: Lab,
    meta: {
      load: async (_, ctx) => ({
        props: { intro: (await getSiteCopy()).labIntro, articles: (await getArticles()).map(articleSummary), devPreview: ctx.dev },
        head: { title: "The Lab", description: "Experiments, technical notes, and things Asad is figuring out.", canonical: "/lab" },
      }),
    },
  },
  {
    path: "/lab/:slug",
    component: ArticlePage,
    meta: {
      load: async ({ slug }) => {
        const articles = await getArticles();
        const article = articles.find((a) => a.slug === slug);
        if (!article) return null;
        const { html, toc } = await renderMarkdown(article.body);
        const related = articles
          .filter((a) => a.slug !== slug && a.tags.some((t) => article.tags.includes(t)))
          .slice(0, 3)
          .map((a) => ({ slug: a.slug, title: a.title }));
        return {
          props: { article: strip(article), html, toc, related },
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
          slug === "reading-layout" ? join(ctx.root, "tests/fixtures/article.md") : join(ctx.root, ".private-content/articles", slug + ".md");
        const source = await readFile(file, "utf8").catch(() => null);
        if (source === null) return null;
        const article = parseArticle(source);
        const { html, toc } = await renderMarkdown(article.body);
        return { props: { article: strip(article), html, toc, draft: true }, head: { title: "Local draft preview", noindex: true } };
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
        head: { title: "Workbench", canonical: "/workbench" },
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
        props: { intro: (await getSiteCopy()).experienceIntro, ...(await getExperience()), featured: await getFeaturedAchievements() },
        head: { title: "Experience", description: "Career, education, and selected certifications — Asad Atterkhan.", canonical: "/experience" },
      }),
    },
  },
  {
    path: "/achievements",
    component: Achievements,
    meta: {
      load: async () => ({
        props: { intro: (await getSiteCopy()).achievementsIntro, records: await getAchievements() },
        head: { title: "Achievements", description: "Certifications, badges, and other milestones — Asad Atterkhan.", canonical: "/achievements" },
      }),
    },
  },
  {
    path: "/about",
    component: About,
    meta: {
      load: async () => ({
        props: { html: (await renderMarkdown((await getSiteCopy()).aboutBody)).html, outfit: await getActiveOutfit() },
        head: { title: "About", canonical: "/about" },
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
