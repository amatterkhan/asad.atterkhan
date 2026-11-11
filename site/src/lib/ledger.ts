export type LedgerEntry = {
  href: string;
  /** ISO date or date-time. */
  date: string;
  title: string;
  summary?: string;
  /** What kind of entry it is, for example "Writeups / Hack The Box". */
  kind?: string;
  minutes?: number;
  /** A short mark beside the kind, for example "Archived". */
  flag?: string;
};

// Spelled out here because Intl's short month names differ between runtimes ("Sep" and "Sept").
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Newest first, grouped by UTC year, each entry with its "26 Oct" label. */
export function groupByYear(entries: LedgerEntry[]) {
  const years: { year: number; entries: (LedgerEntry & { day: string })[] }[] = [];
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    const when = new Date(e.date);
    const year = when.getUTCFullYear();
    if (years.at(-1)?.year !== year) years.push({ year, entries: [] });
    years.at(-1)!.entries.push({ ...e, day: `${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]}` });
  }
  return years;
}
