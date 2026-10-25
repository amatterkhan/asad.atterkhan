const DAY = 86_400_000;
const ANCHOR = Date.UTC(2025, 10, 24); // Original calendar: Monday, five-day week, night rotation.
export type Shift = "day" | "night" | "off";
export function shiftForDate(year: number, month: number, day: number): Shift {
  const utc = new Date(Date.UTC(year, month, day));
  const mondayOffset = (utc.getUTCDay() + 6) % 7;
  const weekOffset = Math.floor(
    (utc.getTime() - mondayOffset * DAY - ANCHOR) / (7 * DAY),
  );
  const fiveDayWeek = ((weekOffset % 2) + 2) % 2 === 0;
  const workingDays = fiveDayWeek ? [1, 2, 5, 6, 0] : [3, 4];
  if (!workingDays.includes(utc.getUTCDay())) return "off";
  return ((Math.floor(weekOffset / 4) % 2) + 2) % 2 === 0 ? "night" : "day";
}
export function calendarMonth(year: number, month: number) {
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells: ({ day: number; shift: Shift; iso: string } | null)[] =
    Array(offset).fill(null);
  for (let day = 1; day <= count; day++)
    cells.push({
      day,
      shift: shiftForDate(year, month, day),
      iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function calendarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Indian/Mauritius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  return { year: part("year"), month: part("month") - 1, day: part("day") };
}
