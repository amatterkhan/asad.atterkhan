import { createHash } from "node:crypto";

// The site's CSP has no `style-src 'unsafe-inline'`, so a prerendered page may not carry style=""
// attributes. The room, sprites and Shiki spans all render them, so the build moves each one into
// a stylesheet rule keyed by a data-s attribute:
//
//   <div style="left:10%">   →   <div data-s="1a2b3c4d">   +   [data-s="1a2b3c4d"]…{left:10%}
//
// Styles the islands set later go through the CSSOM (element.style), which the policy allows and
// which still overrides these rules, exactly as it overrode the attribute.

// One well-formed start tag. Text never contains a raw "<" (the renderers escape it), so text that
// merely looks like markup, such as a code sample, is not matched.
const TAG = /<([a-zA-Z][^\s/>]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const STYLE_ATTR = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/;

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function createStyleExtractor() {
  const rules = new Map<string, string>();
  return {
    /** Replaces every style attribute in a page with a data-s key and remembers its rule. */
    extract(html: string): string {
      return html.replace(TAG, (tag, name: string, attrs: string) => {
        const m = STYLE_ATTR.exec(attrs);
        if (!m) return tag;
        const css = decode(m[1] ?? m[2] ?? "").trim().replace(/;$/, "");
        // A declaration list cannot hold these; refuse it rather than emit a broken stylesheet.
        if (/[{}<]|@import/i.test(css)) throw new Error(`Unsupported inline style: ${css}`);
        const key = createHash("sha256").update(css).digest("hex").slice(0, 8);
        rules.set(key, css);
        // Islands still describe the style in their render function. Tell Vue's hydration check
        // that the missing attribute is expected (Shiki spans are never hydrated, so they skip it).
        const allow = css.startsWith("--shiki") ? "" : ' data-allow-mismatch="style"';
        const rest = tag.slice(1 + name.length + attrs.length);
        return `<${name}${attrs.replace(STYLE_ATTR, css ? ` data-s="${key}"${allow}` : "")}${rest}`;
      });
    },
    /** The rules for every style seen so far. The repeated attribute outranks ordinary class
     *  selectors, as the inline attribute did, without `!important` (which would beat the CSSOM). */
    css(): string {
      return [...rules]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, css]) => `[data-s="${key}"][data-s][data-s][data-s]{${css}}`)
        .join("\n");
    },
  };
}

/** True when a page still carries an inline style attribute or a <style> element. */
export function hasInlineStyle(html: string): boolean {
  if (/<style[\s>]/i.test(html)) return true;
  for (const m of html.matchAll(TAG)) if (STYLE_ATTR.test(m[2])) return true;
  return false;
}
