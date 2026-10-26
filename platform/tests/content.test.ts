import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  parseArticle,
  renderArticle,
  getArticles,
  ArticleSchema,
} from "../src/lib/content";
test("published content requires an explicit valid non-future date", () => {
  assert.equal(
    ArticleSchema.safeParse({
      title: "A",
      description: "B",
      slug: "valid",
      status: "published",
    }).success,
    false,
  );
  assert.equal(
    ArticleSchema.safeParse({
      title: "A",
      description: "B",
      slug: "valid",
      status: "published",
      publishedAt: "2999-01-01",
    }).success,
    false,
  );
  assert.equal(
    ArticleSchema.safeParse({
      title: "A",
      description: "B",
      slug: "../secret",
      status: "draft",
    }).success,
    false,
  );
});
test("draft fixture stays out of public articles and has no publication date", async () => {
  const draft = parseArticle(
    await fs.readFile("tests/fixtures/article.md", "utf8"),
  );
  assert.equal(draft.status, "draft");
  assert.equal(draft.publishedAt, undefined);
  assert.ok(!(await getArticles()).some((a) => a.slug === draft.slug));
});
test("Markdown escapes executable code, strips unsafe HTML, and generates reading elements", async () => {
  const { html, toc } = await renderArticle(
    '## Example\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n```js\nconst message = "<script>";\n```\n\n|a|b|\n|-|-|\n|1|2|\n\n```flow\nPrivate -> Review -> Public\n```',
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("data-rehype-pretty-code"));
  assert.ok(html.includes("table-wrap"));
  assert.ok(html.includes("flow-diagram"));
  assert.equal(toc[0].id, "example");
});
