export type LedgerEntry = {
  href: string;
  /** ISO date or date-time. Undated rows (projects, credentials) keep the caller's order, after the dated ones. */
  date?: string;
  title: string;
  summary?: string;
  /** What kind of entry it is, for example "Writeups / Hack The Box". */
  kind?: string;
  minutes?: number;
  /** A short mark beside the kind, for example "Archived". */
  flag?: string;
  /** Short tags under the summary, for example a project's technologies. */
  tags?: string[];
};

// Spelled out here because Intl's short month names differ between runtimes ("Sep" and "Sept").
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Newest first, grouped by UTC year, each entry with its "26 Oct" label. Undated entries come last, in one
 * group whose year is null, in the order given. */
export function groupByYear(entries: LedgerEntry[]) {
  const years: { year: number | null; entries: (LedgerEntry & { day?: string })[] }[] = [];
  const dated = entries.filter((e) => e.date).sort((a, b) => b.date!.localeCompare(a.date!));
  for (const e of dated) {
    const when = new Date(e.date!);
    const year = when.getUTCFullYear();
    if (years.at(-1)?.year !== year) years.push({ year, entries: [] });
    years.at(-1)!.entries.push({ ...e, day: `${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]}` });
  }
  const undated = entries.filter((e) => !e.date);
  if (undated.length) years.push({ year: null, entries: undated });
  return years;
}
