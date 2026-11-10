import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createStyleExtractor, hasInlineStyle } from "../../scripts/inline-styles";
import { renderMarkdown } from "../../src/lib/markdown";

describe("inline style extraction (the CSP has no style-src 'unsafe-inline')", () => {
  it("moves a style attribute into a rule keyed by data-s", () => {
    const styles = createStyleExtractor();
    const html = styles.extract('<div class="spot" style="left:10%;top:5%;">x</div>');
    const key = /data-s="([0-9a-f]{8})"/.exec(html)![1];
    expect(html).toBe(`<div class="spot" data-s="${key}" data-allow-mismatch="style">x</div>`);
    expect(styles.css()).toBe(`[data-s="${key}"][data-s][data-s][data-s]{left:10%;top:5%}`);
  });

  it("gives equal styles one rule and decodes entities", () => {
    const styles = createStyleExtractor();
    styles.extract('<i style="--a:1"></i><b style="--a:1"></b><u style="font-family:&quot;A B&quot;"></u>');
    expect(styles.css().split("\n")).toHaveLength(2);
    expect(styles.css()).toContain('{font-family:"A B"}');
  });

  it("leaves text that only looks like markup alone", () => {
    const styles = createStyleExtractor();
    const html = '<pre><code>&lt;div style="color:red"&gt;</code></pre><script type="application/ld+json">{"a":"style=\\"x\\""}</script>';
    expect(styles.extract(html)).toBe(html);
    expect(styles.css()).toBe("");
    expect(hasInlineStyle(html)).toBe(false);
  });

  it("refuses a value that could break out of a declaration list", () => {
    expect(() => createStyleExtractor().extract('<p style="color:red}body{display:none">x</p>')).toThrow(/Unsupported/);
  });

  it("clears every style from highlighted code, tables and diagrams", async () => {
    const { html } = await renderMarkdown(fs.readFileSync(new URL("../fixtures/markdown/features.md", import.meta.url), "utf8"));
    expect(hasInlineStyle(html)).toBe(true);
    const styles = createStyleExtractor();
    const out = styles.extract(html);
    expect(hasInlineStyle(out)).toBe(false);
    expect(styles.css()).toContain("--shiki-dark");
  });

  it("flags <style> elements and leftover attributes", () => {
    expect(hasInlineStyle("<style>a{}</style>")).toBe(true);
    expect(hasInlineStyle("<p style='x:y'>a</p>")).toBe(true);
    expect(hasInlineStyle("<p>style</p>")).toBe(false);
  });
});
