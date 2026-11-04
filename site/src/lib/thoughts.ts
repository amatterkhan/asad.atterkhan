// Asad's Thoughts in the room: which line comes next, and when. The lines themselves are content
// (siteSettings/thoughts, content/thoughts.json); the page only ever gets the enabled ones.
import type { ThoughtContext } from "./schemas";

export type PublicThought = { id: string; text: string; context: ThoughtContext };

/**
 * The next Thought: one whose context holds now, never the line just said (unless it is the only
 * one). The featured line goes first, as soon as it is eligible; pass `featured` as null once it has
 * been said. Nothing eligible means silence.
 */
export function pickThought(
  all: PublicThought[],
  now: ReadonlySet<ThoughtContext>,
  last: string | undefined,
  featured: string | null,
  rand = Math.random,
): PublicThought | undefined {
  const ok = all.filter((t) => now.has(t.context));
  const first = featured && ok.find((t) => t.id === featured);
  if (first) return first;
  const pool = ok.length > 1 ? ok.filter((t) => t.id !== last) : ok;
  return pool.length ? pool[Math.floor(rand() * pool.length)] : undefined;
}

/** How long a Thought stays up: 4-8 s, longer for longer lines. */
export const readMs = (text: string) => Math.min(8000, Math.max(4000, 2500 + text.length * 100));

/** The wait before the next Thought: 20-40 s for the first of a visit, then 60-150 s. */
export const nextWait = (spoken: boolean, rand = Math.random) =>
  spoken ? 60000 + rand() * 90000 : 20000 + rand() * 20000;
