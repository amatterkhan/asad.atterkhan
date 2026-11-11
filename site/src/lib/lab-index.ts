import type { LedgerEntry } from "./ledger";

// Pure helpers for the Lab index (routes.ts builds the props with them; tests/unit/lab-index.test.ts).

/** A tag's URL part: "Active Directory" -> "active-directory". */
export const tagSlug = (tag: string) =>
  tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type LabEntry = LedgerEntry & { slug: string; tags: string[] };
export type TagCount = { slug: string; label: string; count: number };

type Indexable = {
  slug: string;
  title: string;
  description: string;
  publishedAt?: string;
  readingMinutes: number;
  status: string;
  tags: string[];
  shelf?: { sectionName: string; categoryName?: string };
};

/** One ledger row per article. Archived and draft entries carry a flag. */
export function toLabEntry(a: Indexable, draft = false): LabEntry {
  return {
    slug: a.slug,
    href: draft ? `/preview/${a.slug}` : `/lab/${a.slug}`,
    date: a.publishedAt ?? "1970-01-01",
    title: a.title,
    summary: a.description,
    kind: [a.shelf?.sectionName, a.shelf?.categoryName].filter(Boolean).join(" / "),
    minutes: a.readingMinutes,
    flag: draft ? "Draft" : a.status === "archived" ? "Archived" : undefined,
    tags: a.tags,
  };
}

/** Tags used by the entries, most used first then alphabetical; tags that differ only in case or punctuation merge. */
export function tagCounts(entries: { tags: string[] }[]): TagCount[] {
  const found = new Map<string, TagCount>();
  for (const e of entries)
    for (const slug of new Set(e.tags.map(tagSlug))) {
      const label = e.tags.find((t) => tagSlug(t) === slug)!;
      const seen = found.get(slug);
      if (seen) seen.count++;
      else found.set(slug, { slug, label, count: 1 });
    }
  return [...found.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const DISCLOSURE_LABELS = {
  disclosed: { label: "Disclosed", note: "The program's rules allow this write-up." },
  "no-vulnerability": { label: "No vulnerability described", note: "This entry describes no finding." },
  redacted: { label: "Redacted", note: "A finding, with program and target details withheld." },
} as const;

type Ordered = { slug: string; title: string; publishedAt?: string; series?: string; position?: number };
/** The entry before and after this one by date (newer, older), and the other entries of its series in order. */
export function neighbours(all: Ordered[], slug: string) {
  const byDate = [...all].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.slug.localeCompare(b.slug));
  const i = byDate.findIndex((a) => a.slug === slug);
  const link = (a?: Ordered) => (a ? { href: `/lab/${a.slug}`, title: a.title } : undefined);
  const here = byDate[i];
  const series = here?.series
    ? {
        name: here.series.replace(/-/g, " "),
        items: all
          .filter((a) => a.series === here.series)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((a) => ({ href: `/lab/${a.slug}`, title: a.title, position: a.position ?? 0, current: a.slug === slug })),
      }
    : undefined;
  return { newer: link(byDate[i - 1]), older: link(byDate[i + 1]), series };
}
