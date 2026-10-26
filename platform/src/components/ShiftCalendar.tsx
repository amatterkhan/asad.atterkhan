"use client";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { OwnerSignIn } from "./OwnerSignIn";

type Shift = "day" | "night" | "off";
type Cell = { day: number; shift: Shift; iso: string } | null;
type Data = {
  year: number;
  month: number;
  today: { year: number; month: number; day: number };
  cells: Cell[];
  upcoming: { iso: string; shift: Shift }[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LABEL: Record<Shift, string> = { night: "Night", day: "Day", off: "Off" };
const ICON: Record<Shift, string> = { night: "☾", day: "☀", off: "·" };
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));

/** Owner-only shift calendar. Data comes from /api/owner/calendar after sign-in (open locally). */
export function ShiftCalendar({ open }: { open: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);

  const load = useCallback(
    async (target?: { year: number; month: number }) => {
      const q = target ? `?year=${target.year}&month=${target.month}` : "";
      const headers: HeadersInit = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
      const res = await fetch(`/api/owner/calendar${q}`, { headers, cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setStatus(body.error || "The calendar could not be loaded");
        return;
      }
      setStatus("");
      setData(body);
    },
    [user],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- state is set after the fetch resolves */
  useEffect(() => {
    if (open || user) void load(view ?? undefined);
  }, [open, user, view, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open && !user)
    return (
      <section className="calendar-locked" aria-label="Private calendar">
        <p className="eyebrow">Locked</p>
        <h2>This one is just for me.</h2>
        <p>Sign in with the owner account to see the rotation.</p>
        <OwnerSignIn user={user} onUser={setUser} onStatus={setStatus} />
        {status && <p className="calendar-status" role="status">{status}</p>}
      </section>
    );
  if (!data) return <p className="calendar-status" role="status">{status || "Loading the rotation…"}</p>;

  const { year, month, today, cells, upcoming } = data;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
  const count = { day: 0, night: 0, off: 0 };
  cells.forEach((c) => c && count[c.shift]++);
  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };
  const isToday = (c: Cell) => !!c && c.day === today.day && month === today.month && year === today.year;
  const next = upcoming.find((u, i) => i > 0 && u.shift !== "off");

  return (
    <section className="shift-calendar" aria-label="Shift calendar">
      <div className="calendar-next">
        <p className="eyebrow">Next two weeks</p>
        <ol>
          {upcoming.map((u, i) => (
            <li key={u.iso} className={`shift-${u.shift}${i === 0 ? " is-today" : ""}`}>
              <span className="d">{i === 0 ? "Today" : fmt(u.iso, { weekday: "short" })}</span>
              <span className="n">{fmt(u.iso, { day: "numeric" })}</span>
              <span className="s" aria-label={LABEL[u.shift]}>
                {ICON[u.shift]}
              </span>
            </li>
          ))}
        </ol>
        {next && (
          <p className="calendar-note">
            Next shift: {fmt(next.iso, { weekday: "long", day: "numeric", month: "long" })} · {LABEL[next.shift]}
          </p>
        )}
      </div>

      <div className="calendar-toolbar">
        <button aria-label="Previous month" onClick={() => move(-1)}>
          ←
        </button>
        <h2 aria-live="polite">{monthName}</h2>
        <button aria-label="Next month" onClick={() => move(1)}>
          →
        </button>
        <button className="calendar-today" onClick={() => setView({ year: today.year, month: today.month })}>
          Today
        </button>
      </div>

      <dl className="calendar-summary">
        <div>
          <dt>Work days</dt>
          <dd>{count.day + count.night}</dd>
        </div>
        <div className="shift-night">
          <dt>Nights</dt>
          <dd>{count.night}</dd>
        </div>
        <div className="shift-day">
          <dt>Days</dt>
          <dd>{count.day}</dd>
        </div>
        <div>
          <dt>Off</dt>
          <dd>{count.off}</dd>
        </div>
      </dl>

      <table className="calendar-grid">
        <caption className="sr-only">{monthName}, shifts in Mauritius time</caption>
        <thead>
          <tr>
            {DAYS.map((d) => (
              <th scope="col" key={d}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, w) => (
            <tr key={w}>
              {cells.slice(w * 7, w * 7 + 7).map((c, i) => (
                <td key={i} className={c ? `shift-${c.shift}${isToday(c) ? " is-today" : ""}` : "calendar-blank"}>
                  {c && (
                    <>
                      <time dateTime={c.iso} aria-current={isToday(c) ? "date" : undefined}>
                        {c.day}
                      </time>
                      {c.shift !== "off" && (
                        <span className="chip">
                          <span aria-hidden="true">{ICON[c.shift]}</span> {LABEL[c.shift]}
                        </span>
                      )}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="calendar-note">
        Alternating five-day and two-day weeks; four weeks of nights, then four weeks of days. Mauritius time.
      </p>
    </section>
  );
}
