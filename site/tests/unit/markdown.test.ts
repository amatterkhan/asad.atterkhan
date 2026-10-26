import { it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { renderMarkdown } from "../../src/lib/markdown";
it("matches golden HTML and TOC, including flow, mermaid, tables and highlighting", async () => {
  const dir = "tests/fixtures/markdown";
  for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith(".md"))) {
    const output = await renderMarkdown(
      await fs.readFile(path.join(dir, file), "utf8"),
    );
    expect(output.html).toBe(
      await fs.readFile(path.join(dir, file.replace(/\.md$/, ".html")), "utf8"),
    );
    expect(output.toc).toEqual(
      JSON.parse(
        await fs.readFile(
          path.join(dir, file.replace(/\.md$/, ".toc.json")),
          "utf8",
        ),
      ),
    );
  }
});
it("drops executable markup and unsafe URLs", async () => {
  const { html } = await renderMarkdown(
    "<script>alert(1)</script>\n\n[x](javascript:alert%281%29)\n\n![x](data:text/html,test)",
  );
  expect(html).not.toMatch(/<script|javascript:|data:text/);
});
