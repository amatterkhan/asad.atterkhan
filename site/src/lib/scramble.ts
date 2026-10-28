// A worldline shift's glitch rearranges the page's words: each word's own letters shuffle among
// themselves, then settle into place one by one, start to end, like the meter's tubes rolling onto a
// reading. Only a word's own letters move, so its width barely changes and lines don't rewrap. Only
// text on screen takes part; islands (the room, admin, anything Vue patches later), code and
// screen-reader-only text never do. The original text always comes back exactly.

const SKIP = "[data-island], script, style, svg, code, pre, textarea, input, .sr-only, [aria-live]";
const SHUFFLES = /[\p{L}\p{N}]/u;
const TICK_MS = 60;

export type ScrambleOptions = {
  /** How long until every letter is back in place. */
  ms?: number;
  /** Whether a text node's element is on screen (the default measures it against the viewport). */
  inView?: (el: Element) => boolean;
  rand?: () => number;
  /** Most text nodes to touch, to keep a long page cheap. */
  max?: number;
};

const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.width > 0;
};

/** One frame of a word: letters not yet settled trade places among themselves. */
export function shuffleUnsettled(chars: string[], settled: boolean[], rand: () => number): string[] {
  const out = chars.slice();
  const free = chars.map((_, i) => i).filter((i) => !settled[i] && SHUFFLES.test(chars[i]));
  const letters = free.map((i) => chars[i]);
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  free.forEach((i, k) => (out[i] = letters[k]));
  return out;
}

/** Scramble the page's visible text and settle it back over `ms`; returns a stop that restores it now. */
export function scramblePage(root: ParentNode = document.body, opts: ScrambleOptions = {}): () => void {
  const { ms = 800, inView = onScreen, rand = Math.random, max = 400 } = opts;
  const nodes: { node: Text; text: string; chars: string[]; at: number[] }[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n && nodes.length < max; n = walker.nextNode()) {
    const node = n as Text;
    const el = node.parentElement;
    if (!el || !SHUFFLES.test(node.data) || el.closest(SKIP) || !inView(el)) continue;
    const chars = [...node.data];
    // each letter settles at its own moment: earlier in the text sooner, with a little jitter
    const at = chars.map((_, i) => (ms * 0.85 * i) / Math.max(1, chars.length - 1) + ms * 0.15 * rand());
    nodes.push({ node, text: node.data, chars, at });
  }
  if (!nodes.length) return () => {};
  const start = performance.now();
  const frame = () => {
    const t = performance.now() - start;
    for (const n of nodes) {
      const settled = n.at.map((a) => a <= t);
      // shuffle within each word only (runs between spaces), so words keep their letters
      const out: string[] = [];
      let word: number[] = [];
      const flush = () => {
        if (!word.length) return;
        const w = shuffleUnsettled(word.map((i) => n.chars[i]), word.map((i) => settled[i]), rand);
        word.forEach((i, k) => (out[i] = w[k]));
        word = [];
      };
      n.chars.forEach((c, i) => {
        if (/\s/.test(c)) {
          flush();
          out[i] = c;
        } else word.push(i);
      });
      flush();
      n.node.data = out.join("");
    }
  };
  frame();
  const tick = setInterval(frame, TICK_MS);
  const stop = () => {
    clearInterval(tick);
    clearTimeout(done);
    for (const n of nodes) n.node.data = n.text;
  };
  const done = setTimeout(stop, ms);
  return stop;
}
