import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";

// Markdown → sanitised HTML at build time: remark/GFM → hast → sanitize → heading ids → tables,
// `flow` and `mermaid` blocks → Shiki (Everforest, both themes) → HTML. Raw HTML is dropped.
// api/internal/markdown renders the same features in Go for the admin preview; the golden files in
// tests/fixtures/markdown keep the two in step.

type Node = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};
export type TocEntry = { id: string; title: string; depth: number };

const text = (n: Node): string => n.value || (n.children || []).map(text).join("");

function enhance() {
  return (tree: Node) => {
    function walk(node: Node) {
      node.children = node.children?.map((child) => {
        if (child.tagName === "table")
          return {
            type: "element",
            tagName: "div",
            properties: {
              className: ["table-wrap"],
              tabIndex: 0,
              role: "region",
              ariaLabel: "Table, horizontally scrollable",
            },
            children: [child],
          };
        if (child.tagName === "pre" && String(child.children?.[0]?.properties?.className).includes("language-flow")) {
          const nodes = text(child)
            .trim()
            .split("->")
            .map((n) => n.trim());
          if (nodes.length > 1 && nodes.length <= 10 && nodes.every((n) => n.length <= 80))
            return {
              type: "element",
              tagName: "figure",
              properties: { className: ["flow-diagram"], ariaLabel: "Flow diagram" },
              children: [
                {
                  type: "element",
                  tagName: "ol",
                  properties: {},
                  children: nodes.map((label) => ({
                    type: "element",
                    tagName: "li",
                    properties: {},
                    children: [{ type: "text", value: label }],
                  })),
                },
              ],
            };
        }
        if (child.tagName === "pre" && String(child.children?.[0]?.properties?.className).includes("language-mermaid")) {
          // rendered in the browser (behaviors/article.ts) with the site palette, strict mode
          const src = text(child).trim();
          if (src.length <= 8000)
            return {
              type: "element",
              tagName: "figure",
              properties: { className: ["mermaid-diagram"], ariaLabel: "Diagram" },
              children: [
                {
                  type: "element",
                  tagName: "pre",
                  properties: { className: ["mermaid-src"] },
                  children: [{ type: "text", value: src }],
                },
              ],
            };
        }
        if (child.tagName === "img")
          child.properties = { ...child.properties, loading: "lazy", decoding: "async" };
        walk(child);
        return child;
      });
    }
    walk(tree);
  };
}

export async function renderMarkdown(body: string): Promise<{ html: string; toc: TocEntry[] }> {
  const toc: TocEntry[] = [];
  const collect = () => (tree: Node) => {
    function walk(n: Node) {
      if (/^h[23]$/.test(n.tagName || ""))
        toc.push({ id: String(n.properties?.id), title: text(n), depth: Number(n.tagName![1]) });
      n.children?.forEach(walk);
    }
    walk(tree);
  };
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeSlug)
      .use(enhance)
      .use(collect)
      .use(rehypePrettyCode, {
        // follows the site theme: CSS picks --shiki-dark or --shiki-light per span
        theme: { dark: "everforest-dark", light: "everforest-light" },
        keepBackground: false,
      })
      .use(rehypeStringify)
      .process(body),
  );
  return { html, toc };
}
